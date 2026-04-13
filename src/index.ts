import cron from "node-cron";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import {
  getTodaysBoard,
  createBoard,
  createExercise,
  markTopicUsed,
  logTopicUsage,
  logEmail,
  getSetting,
  getEmailableUsers,
  repopulateTopicsIfNeeded,
} from "./db.js";
import { pickTopic, generateBoard } from "./services/content.js";
import { sendInviteEmail } from "./services/email.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/student.js";
import authRoutes from "./routes/auth.js";

const MAX_RETRIES = 3;

export async function runDailyJob() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[${new Date().toISOString()}] Starting daily IELTS job for ${today}...`);

  // 1. Skip if board already exists
  const existing = getTodaysBoard();
  if (existing) {
    console.log(`Board for ${today} already exists (topic: ${existing.topic}). Skipping.`);
    return;
  }

  // 2. Repopulate topic queue if running low, then pick topic
  repopulateTopicsIfNeeded();
  const { topic } = pickTopic();
  console.log(`Selected topic: "${topic}"`);

  // 3. Generate board with retries
  let generated;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Generating board (attempt ${attempt}/${MAX_RETRIES})...`);
      generated = await generateBoard(topic);
      break;
    } catch (err) {
      console.error(`[CRON] Generation attempt ${attempt} failed:`, err instanceof Error ? err.stack : err);
      if (attempt === MAX_RETRIES) {
        console.error("[CRON FATAL] All generation attempts failed. Aborting daily job.");
        return;
      }
    }
  }

  if (!generated) return;

  // 4. Save board + exercises to DB
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
  console.log(`Board created (id: ${board.id}) with 7 exercises.`);

  // 5. Log topic usage
  markTopicUsed(topic, today);
  logTopicUsage(topic, today, board.id);

  // 6. Send daily email to all recipients
  const baseUrl = getSetting("base_url") || "https://ielts.fly.dev";
  const users = getEmailableUsers();
  const startTime = Date.now();

  if (users.length === 0) {
    console.log("No users found. Skipping email send.");
  } else {
    const emailResults: string[] = [];
    for (const user of users) {
      try {
        const practiceUrl = `${baseUrl}/s/${user.token}`;
        const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${user.token}`;
        await sendInviteEmail(user.email, user.name, practiceUrl, topic, unsubscribeUrl);
        emailResults.push(`${user.email}: sent`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        emailResults.push(`${user.email}: failed (${msg})`);
        console.error(`Failed to send email to ${user.email}:`, msg);
      }
    }

    const durationMs = Date.now() - startTime;
    const allSent = emailResults.every((r) => r.includes(": sent"));
    logEmail(
      board.id,
      users.map((u) => u.email).join(", "),
      allSent ? "sent" : "partial_failure",
      allSent ? undefined : emailResults.filter((r) => !r.includes(": sent")).join("; "),
      durationMs
    );
    console.log(`Emails processed in ${durationMs}ms:`, emailResults.join(", "));
  }

  console.log(`[${new Date().toISOString()}] Daily job completed for ${today}.`);
}

cron.schedule("0 4 * * *", () => {
  runDailyJob().catch(err => {
    console.error(`[CRON FATAL] Daily job failed:`, err);
  });
});
console.log("IELTS Daily scheduler started. Cron: 00:00 CLT (04:00 UTC).");

// Startup diagnostic
const startupBoard = getTodaysBoard();
console.log(`[STARTUP] Today's board: ${startupBoard ? startupBoard.topic : "NOT GENERATED"}`);

const app = new Hono();

// Request logging middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
  }));
});

// Global error handler
app.onError((err, c) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: err.stack,
  }));
  return c.json({ error: "Internal server error" }, 500);
});

// Health endpoint
app.get("/health", (c) => {
  const board = getTodaysBoard();
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    boardExists: !!board,
  });
});

app.route("/admin", adminRoutes);
app.route("/s", studentRoutes);
app.route("/", authRoutes);

const port = Number(process.env.PORT) || 8080;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

if (process.env.RUN_NOW === "true") {
  runDailyJob().catch(err => {
    console.error("[RUN_NOW FATAL] Daily job failed:", err);
  });
}
