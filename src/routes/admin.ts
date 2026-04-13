import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { randomBytes } from "crypto";
import { renderAdminLogin } from "../templates/admin-login.js";
import {
  getAllSettings,
  setSetting,
  getSetting,
  getRecentEmailLogs,
  getAllUsers,
  deleteBoardByDate,
  getTodaysBoard,
  getExercisesByBoardId,
  getExerciseById,
  deleteExercise,
  createExercise,
  getAllTopics,
  getActiveUsersToday,
  getAvgCompletionToday,
  getAvgScoreToday,
  getActiveStreaksCount,
  getAdminUserRows,
  getTopicHistoryEntries,
  hasEmailBeenSentForBoard,
  createUser,
  deleteUser,
  getUserByEmail,
  getCurrentStreak,
  getLongestStreak,
  getTotalSubmissions,
  getTotalBoardsCompleted,
  getUserWordBankCount,
  getUserById,
  getUserWordBank,
  getRecentSubmissionsWithType,
  getActivityData,
  addTopic,
  removeTopic,
  forceTopic,
  logEmail,
  createBoard,
  markTopicUsed,
  logTopicUsage,
  type User,
} from "../db.js";
import { renderAdminDashboard, renderUserDetail } from "../templates/admin.js";
import { sendInviteEmail } from "../services/email.js";
import {
  pickTopic,
  generateBoard,
  generateLongReading,
  generateShortReading,
  generateVocabulary,
  generateFillGap,
  generateWritingMicro,
  type LongReadingContent,
} from "../services/content.js";

const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "ielts2024";

// In-memory session store (single-process; resets on restart)
const activeSessions = new Set<string>();

function createAdminSession(): string {
  const token = randomBytes(32).toString("hex");
  activeSessions.add(token);
  // Auto-expire after 24h
  setTimeout(() => activeSessions.delete(token), 24 * 60 * 60 * 1000);
  return token;
}

const app = new Hono();

// Login page and auth endpoints (no auth required)
app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const username = (body.username as string || "").trim();
  const password = (body.password as string || "").trim();

  if (username === DASH_USER && password === DASH_PASS) {
    const token = createAdminSession();
    setCookie(c, "admin_session", token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60,
      path: "/admin",
    });
    return c.redirect("/admin");
  }

  return c.html(renderAdminLogin("Usuario o contraseña incorrectos"));
});

app.post("/logout", (c) => {
  const token = getCookie(c, "admin_session");
  if (token) activeSessions.delete(token);
  deleteCookie(c, "admin_session", { path: "/admin" });
  return c.redirect("/admin");
});

// Explicit GET /login route (in case middleware doesn't catch it)
app.get("/login", (c) => {
  const token = getCookie(c, "admin_session");
  if (token && activeSessions.has(token)) {
    return c.redirect("/admin");
  }
  return c.html(renderAdminLogin());
});

// Auth middleware for all other admin routes
app.use("/*", async (c, next) => {
  // Skip middleware for login/logout (already handled above)
  const path = new URL(c.req.url).pathname.replace(/^\/admin/, "");
  if (path === "/login" || path === "/logout") return next();

  const token = getCookie(c, "admin_session");
  if (!token || !activeSessions.has(token)) {
    return c.html(renderAdminLogin());
  }
  return next();
});

// =============================================
// GET /admin — Dashboard
// =============================================

app.get("/", (c) => {
  const settings = getAllSettings();
  const baseUrl = settings.base_url || getSetting("base_url") || "https://ielts-daily.fly.dev";
  const todaysBoard = getTodaysBoard() || null;
  const exercises = todaysBoard ? getExercisesByBoardId(todaysBoard.id) : [];
  const emailSent = todaysBoard ? hasEmailBeenSentForBoard(todaysBoard.id) : false;

  const completion = getAvgCompletionToday();
  const avgScore = getAvgScoreToday();

  const data = {
    todaysBoard,
    exercises,
    emailSent,
    metrics: {
      activeUsersToday: getActiveUsersToday(),
      avgCompletion: completion.total > 0 ? `${completion.avg.toFixed(1)} / ${completion.total}` : "0 / 0",
      avgScore: avgScore > 0 ? `${avgScore.toFixed(1)} / 26` : "0 / 26",
      activeStreaks: getActiveStreaksCount(),
    },
    users: getAdminUserRows(),
    emailLogs: getRecentEmailLogs(30),
    settings,
    topics: getAllTopics(),
    topicHistory: getTopicHistoryEntries(30),
    baseUrl,
  };

  return c.html(renderAdminDashboard(data));
});

// =============================================
// POST /admin/generate — Generate today's board
// =============================================

app.post("/generate", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const existing = getTodaysBoard();
  if (existing) {
    return c.redirect("/admin");
  }

  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const requestedTopic = (body.topic as string) || undefined;

  const { topic } = pickTopic(requestedTopic);

  try {
    const generated = await generateBoard(topic);
    const board = createBoard(today, topic, generated.illustration);
    for (let i = 0; i < generated.exercises.length; i++) {
      const ex = generated.exercises[i];
      createExercise({
        board_id: board.id,
        slot: i + 1,
        type: ex.type,
        content: JSON.stringify(ex.content),
        max_score: ex.max_score,
      });
    }
    markTopicUsed(topic, today);
    logTopicUsage(topic, today, board.id);
  } catch (err) {
    console.error("Board generation failed:", err);
  }
  return c.redirect("/admin");
});

// =============================================
// POST /admin/regenerate — Delete and regenerate today's board
// =============================================

app.post("/regenerate", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const useNewTopic = body.newTopic === "true";
  const rawTopic = (body.topic as string | undefined)?.trim() || "";
  const customTopic = rawTopic === "__custom__"
    ? ((body.customTopic as string | undefined)?.trim() || undefined)
    : (rawTopic || undefined);

  // Save existing topic before deleting
  const existing = getTodaysBoard();
  const existingTopic = existing?.topic;

  // Delete existing board
  deleteBoardByDate(today);

  // Pick topic: custom > existing (same) > auto-pick new
  let topic: string;
  if (customTopic) {
    topic = customTopic;
  } else if (!useNewTopic && existingTopic) {
    topic = existingTopic;
  } else {
    const picked = pickTopic();
    topic = picked.topic;
  }

  try {
    const generated = await generateBoard(topic);
    const board = createBoard(today, topic, generated.illustration);
    for (let i = 0; i < generated.exercises.length; i++) {
      const ex = generated.exercises[i];
      createExercise({
        board_id: board.id,
        slot: i + 1,
        type: ex.type,
        content: JSON.stringify(ex.content),
        max_score: ex.max_score,
      });
    }
    markTopicUsed(topic, today);
    logTopicUsage(topic, today, board.id);
  } catch (err) {
    console.error("Board regeneration failed:", err);
  }
  return c.redirect("/admin");
});

// =============================================
// POST /admin/exercise/:id/regenerate — Regenerate single exercise
// =============================================

app.post("/exercise/:id/regenerate", async (c) => {
  const exerciseId = parseInt(c.req.param("id"), 10);
  if (isNaN(exerciseId)) return c.redirect("/admin");

  const exercise = getExerciseById(exerciseId);
  if (!exercise) return c.redirect("/admin");

  // Get the board to know the topic
  const { getBoardById } = await import("../db.js");
  const board = getBoardById(exercise.board_id);
  if (!board) return c.redirect("/admin");

  const difficulty = getSetting("difficulty") || "B2";

  try {
    let content: unknown;
    let maxScore = exercise.max_score;

    switch (exercise.type) {
      case "long_reading":
        content = await generateLongReading(board.topic, difficulty);
        maxScore = 5;
        break;
      case "short_reading":
        content = await generateShortReading(board.topic, difficulty);
        maxScore = 2;
        break;
      case "vocabulary": {
        // Vocabulary depends on long reading content
        const exercises = getExercisesByBoardId(board.id);
        const longReadingEx = exercises.find((e) => e.type === "long_reading");
        if (longReadingEx) {
          const longReadingContent = JSON.parse(longReadingEx.content) as LongReadingContent;
          const { generateVocabulary: genVocab } = await import("../services/content.js");
          content = await genVocab(longReadingContent);
        } else {
          // Fallback: generate fresh long reading first
          const lr = await generateLongReading(board.topic, difficulty);
          content = await generateVocabulary(lr);
        }
        maxScore = 6;
        break;
      }
      case "fill_gap":
        content = await generateFillGap(board.topic, difficulty, []);
        maxScore = 5;
        break;
      case "writing_micro":
        content = await generateWritingMicro(board.topic);
        maxScore = 3;
        break;
      default:
        return c.redirect("/admin");
    }

    // Delete old exercise and create new one in the same slot
    const slot = exercise.slot;
    const boardId = exercise.board_id;
    deleteExercise(exerciseId);

    createExercise({
      board_id: boardId,
      slot,
      type: exercise.type,
      content: JSON.stringify(content),
      max_score: maxScore,
    });
  } catch (err) {
    console.error("Exercise regeneration failed:", err);
  }
  return c.redirect("/admin");
});

// =============================================
// POST /admin/email — Send daily email
// =============================================

app.post("/email", async (c) => {
  const board = getTodaysBoard();
  if (!board) {
    return c.redirect("/admin");
  }

  const baseUrl = getSetting("base_url") || "https://ielts-daily.fly.dev";
  const users = getAllUsers();

  if (users.length === 0) {
    return c.redirect("/admin");
  }

  const startTime = Date.now();
  const results: string[] = [];

  for (const user of users) {
    try {
      const practiceUrl = `${baseUrl}/s/${user.token}`;
      await sendInviteEmail(user.email, user.name, practiceUrl, board.topic);
      results.push(`${user.email}: sent`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push(`${user.email}: failed (${msg})`);
    }
  }

  const durationMs = Date.now() - startTime;
  const allSent = results.every((r) => r.includes(": sent"));
  logEmail(
    board.id,
    users.map((u) => u.email).join(", "),
    allSent ? "sent" : "partial_failure",
    allSent ? undefined : results.filter((r) => !r.includes(": sent")).join("; "),
    durationMs
  );

  return c.redirect("/admin");
});

// =============================================
// POST /admin/settings — Save settings
// =============================================

app.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (typeof body.recipients === "string") setSetting("recipients", body.recipients.trim());
  if (typeof body.from_email === "string") setSetting("from_email", body.from_email.trim());
  if (typeof body.cron_schedule === "string") setSetting("cron_schedule", body.cron_schedule.trim());
  if (typeof body.base_url === "string") setSetting("base_url", body.base_url.trim());
  if (typeof body.difficulty === "string") setSetting("difficulty", body.difficulty.trim());
  return c.redirect("/admin");
});

// =============================================
// POST /admin/users/add — Create user
// =============================================

app.post("/users/add", async (c) => {
  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const name = (body.name as string || "").trim();
  const email = (body.email as string || "").trim();
  const sendWelcome = body.sendWelcome === "true" || body.sendWelcome === "on";

  if (!name || !email) {
    return c.redirect("/admin");
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return c.redirect("/admin");
  }

  const user = createUser(email, name);

  if (sendWelcome) {
    const baseUrl = getSetting("base_url") || "https://ielts-daily.fly.dev";
    const practiceUrl = `${baseUrl}/s/${user.token}`;
    const board = getTodaysBoard();
    const topic = board?.topic || "IELTS Practice";
    try {
      await sendInviteEmail(user.email, user.name, practiceUrl, topic);
    } catch (_) {
      // Welcome email failure shouldn't block user creation
    }
  }

  return c.redirect("/admin");
});

// =============================================
// GET /admin/users/:id/detail — User detail page
// =============================================

app.get("/users/:id/detail", (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (isNaN(userId)) return c.text("Not found", 404);
  const user = getUserById(userId);
  if (!user) return c.text("User not found", 404);

  const wordBank = getUserWordBank(userId);
  const recentSubs = getRecentSubmissionsWithType(userId, 20);
  const actData = getActivityData(userId);

  return c.html(renderUserDetail({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      token: user.token,
      created_at: user.created_at,
      is_guest: user.is_guest,
    },
    streak: getCurrentStreak(userId),
    longestStreak: getLongestStreak(userId),
    totalExercises: getTotalSubmissions(userId),
    totalBoards: getTotalBoardsCompleted(userId),
    wordBankSize: getUserWordBankCount(userId),
    lastActive: null,
    recentSubmissions: recentSubs.map(s => ({ ...s, exercise_type: s.exercise_type as string })),
    activityData: actData,
    wordBank: wordBank.slice(0, 20).map(w => ({ word: w.word })),
  }));
});

// =============================================
// POST /admin/users/:id/remove — Delete user
// =============================================

app.post("/users/:id/remove", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (!isNaN(userId)) {
    deleteUser(userId);
  }
  return c.redirect("/admin");
});

// =============================================
// GET /admin/users/:id — User detail JSON
// =============================================

app.get("/users/:id", (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (isNaN(userId)) return c.json({ error: "Invalid user ID" }, 400);

  const users = getAllUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return c.json({ error: "User not found" }, 404);

  const currentStreak = getCurrentStreak(userId);
  const longestStreak = getLongestStreak(userId);
  const totalExercises = getTotalSubmissions(userId);
  const totalBoards = getTotalBoardsCompleted(userId);
  const wordBankSize = getUserWordBankCount(userId);
  const activity = getActivityData(userId, 10);

  return c.json({
    id: user.id,
    name: user.name,
    email: user.email,
    token: user.token,
    currentStreak,
    longestStreak,
    totalExercises,
    totalBoards,
    wordBankSize,
    recentActivity: activity,
  });
});

// =============================================
// POST /admin/topics/reorder — Save topic queue order
// =============================================

app.post("/topics/reorder", async (c) => {
  // Reorder accepts JSON (typically called via JS fetch from drag-drop UI)
  const body = await c.req.json().catch(() => ({}));
  const topics = body.topics as string[];

  if (!Array.isArray(topics) || topics.length === 0) {
    return c.redirect("/admin");
  }

  // Get all current topics for lookup
  const allTopics = getAllTopics();
  const topicMap = new Map(allTopics.map((t) => [t.topic, t]));

  // Update positions based on the new order
  const { default: db } = await import("../db.js");
  const updateStmt = db.prepare("UPDATE topic_queue SET position = ? WHERE id = ?");
  const reorder = db.transaction(() => {
    for (let i = 0; i < topics.length; i++) {
      const entry = topicMap.get(topics[i]);
      if (entry) {
        updateStmt.run(i + 1, entry.id);
      }
    }
  });
  reorder();

  return c.redirect("/admin");
});

// =============================================
// POST /admin/topics/add — Add topic
// =============================================

app.post("/topics/add", async (c) => {
  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const topic = (body.topic as string || "").trim();

  if (topic) {
    addTopic(topic);
  }
  return c.redirect("/admin");
});

// =============================================
// POST /admin/topics/remove — Remove topic
// =============================================

app.post("/topics/remove", async (c) => {
  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const topicId = parseInt(body.topicId as string, 10);

  if (!isNaN(topicId)) {
    removeTopic(topicId);
  }
  return c.redirect("/admin");
});

// =============================================
// POST /admin/topics/force — Force topic for next generation
// =============================================

app.post("/topics/force", async (c) => {
  const body = await c.req.parseBody().catch(() => ({} as Record<string, string>));
  const topicId = parseInt(body.topicId as string, 10);

  if (!isNaN(topicId)) {
    forceTopic(topicId);
  }
  return c.redirect("/admin");
});

// =============================================
// API Routes — JSON endpoints
// =============================================

app.get("/api/board/today", (c) => {
  const board = getTodaysBoard();
  if (!board) return c.json({ board: null, exercises: [] });

  const exercises = getExercisesByBoardId(board.id);
  return c.json({ board, exercises });
});

app.get("/api/stats", (c) => {
  const completion = getAvgCompletionToday();
  const avgScore = getAvgScoreToday();

  return c.json({
    activeUsersToday: getActiveUsersToday(),
    avgCompletion: { avg: completion.avg, total: completion.total },
    avgScore,
    activeStreaks: getActiveStreaksCount(),
  });
});

app.get("/api/logs", (c) => {
  const logs = getRecentEmailLogs(50);
  const stats = { total: 0, success: 0, error: 0 };
  for (const l of logs) {
    stats.total++;
    if (l.status === "sent" || l.status === "success") stats.success++;
    else if (l.status === "error") stats.error++;
  }
  return c.json({ stats, logs });
});

app.get("/api/topics", (c) => {
  const topics = getAllTopics();
  return c.json({ topics });
});

export default app;
