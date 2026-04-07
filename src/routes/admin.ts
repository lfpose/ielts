import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
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
import { renderAdminDashboard } from "../templates/admin.js";
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

const app = new Hono();

app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

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
    return c.json({ error: "Board already exists for today. Use regenerate instead." }, 409);
  }

  const body = await c.req.json().catch(() => ({}));
  const requestedTopic = body.topic as string | undefined;

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
    return c.json({ success: true, boardId: board.id, topic });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Generation failed: ${msg}` }, 500);
  }
});

// =============================================
// POST /admin/regenerate — Delete and regenerate today's board
// =============================================

app.post("/regenerate", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  const body = await c.req.json().catch(() => ({}));
  const useNewTopic = body.newTopic === true;

  // Save existing topic before deleting
  const existing = getTodaysBoard();
  const existingTopic = existing?.topic;

  // Delete existing board
  deleteBoardByDate(today);

  // Pick topic — reuse existing unless newTopic requested
  let topic: string;
  if (useNewTopic || !existingTopic) {
    const picked = pickTopic();
    topic = picked.topic;
  } else {
    topic = existingTopic;
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
    return c.json({ success: true, boardId: board.id, topic });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Regeneration failed: ${msg}` }, 500);
  }
});

// =============================================
// POST /admin/exercise/:id/regenerate — Regenerate single exercise
// =============================================

app.post("/exercise/:id/regenerate", async (c) => {
  const exerciseId = parseInt(c.req.param("id"), 10);
  if (isNaN(exerciseId)) return c.json({ error: "Invalid exercise ID" }, 400);

  const exercise = getExerciseById(exerciseId);
  if (!exercise) return c.json({ error: "Exercise not found" }, 404);

  // Get the board to know the topic
  const { getBoardById } = await import("../db.js");
  const board = getBoardById(exercise.board_id);
  if (!board) return c.json({ error: "Board not found" }, 404);

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
        return c.json({ error: `Unknown exercise type: ${exercise.type}` }, 400);
    }

    // Delete old exercise and create new one in the same slot
    const slot = exercise.slot;
    const boardId = exercise.board_id;
    deleteExercise(exerciseId);

    const newExercise = createExercise({
      board_id: boardId,
      slot,
      type: exercise.type,
      content: JSON.stringify(content),
      max_score: maxScore,
    });

    return c.json({ success: true, exerciseId: newExercise.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: `Exercise regeneration failed: ${msg}` }, 500);
  }
});

// =============================================
// POST /admin/email — Send daily email
// =============================================

app.post("/email", async (c) => {
  const board = getTodaysBoard();
  if (!board) {
    return c.json({ error: "No board exists for today. Generate one first." }, 400);
  }

  const baseUrl = getSetting("base_url") || "https://ielts-daily.fly.dev";
  const users = getAllUsers();

  if (users.length === 0) {
    return c.json({ error: "No users to send email to." }, 400);
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

  return c.json({ success: true, results, durationMs });
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
  const body = await c.req.json().catch(() => ({}));
  const name = body.name as string;
  const email = body.email as string;
  const sendWelcome = body.sendWelcome === true;

  if (!name || !email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const existing = getUserByEmail(email);
  if (existing) {
    return c.json({ error: "User with this email already exists" }, 409);
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

  return c.json({ success: true, user: { id: user.id, name: user.name, email: user.email, token: user.token } });
});

// =============================================
// POST /admin/users/:id/remove — Delete user
// =============================================

app.post("/users/:id/remove", async (c) => {
  const userId = parseInt(c.req.param("id"), 10);
  if (isNaN(userId)) return c.json({ error: "Invalid user ID" }, 400);

  deleteUser(userId);
  return c.json({ success: true });
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
  const body = await c.req.json().catch(() => ({}));
  const topics = body.topics as string[];

  if (!Array.isArray(topics) || topics.length === 0) {
    return c.json({ error: "topics array is required" }, 400);
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

  return c.json({ success: true });
});

// =============================================
// POST /admin/topics/add — Add topic
// =============================================

app.post("/topics/add", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const topic = body.topic as string;

  if (!topic) {
    return c.json({ error: "topic is required" }, 400);
  }

  addTopic(topic);
  return c.json({ success: true });
});

// =============================================
// POST /admin/topics/remove — Remove topic
// =============================================

app.post("/topics/remove", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const topic = body.topic as string;

  if (!topic) {
    return c.json({ error: "topic is required" }, 400);
  }

  const allTopics = getAllTopics();
  const entry = allTopics.find((t) => t.topic === topic);
  if (!entry) {
    return c.json({ error: "Topic not found" }, 404);
  }

  removeTopic(entry.id);
  return c.json({ success: true });
});

// =============================================
// POST /admin/topics/force — Force topic for next generation
// =============================================

app.post("/topics/force", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const topic = body.topic as string;

  if (!topic) {
    return c.json({ error: "topic is required" }, 400);
  }

  const allTopics = getAllTopics();
  const entry = allTopics.find((t) => t.topic === topic);
  if (!entry) {
    return c.json({ error: "Topic not found" }, 404);
  }

  forceTopic(entry.id);
  return c.json({ success: true });
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
