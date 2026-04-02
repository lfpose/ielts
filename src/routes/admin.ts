import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import {
  getAllSettings,
  setSetting,
  getRecentEmailLogs,
  getAllUsers,
  deleteBoardByDate,
  getTodaysBoard,
  getExercisesByBoardId,
  getAllTopics,
  getActiveUsersToday,
  getAvgCompletionToday,
  getAvgScoreToday,
  getActiveStreaksCount,
  getAdminUserRows,
  getTopicHistoryEntries,
  hasEmailBeenSentForBoard,
  getSetting,
} from "../db.js";
import { renderAdminDashboard } from "../templates/admin.js";
import { runDailyJob } from "../index.js";

const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "ielts2024";

const app = new Hono();

app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

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
      avgScore: avgScore > 0 ? `${avgScore.toFixed(1)} / 21` : "0 / 21",
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

app.post("/trigger", async (c) => {
  runDailyJob().catch((err) => console.error("Manual trigger failed:", err));
  return c.redirect("/admin");
});

app.post("/refresh", async (c) => {
  const today = new Date().toISOString().slice(0, 10);
  deleteBoardByDate(today);
  runDailyJob().catch((err) => console.error("Refresh failed:", err));
  return c.redirect("/admin");
});

app.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (typeof body.recipients === "string") setSetting("recipients", body.recipients.trim());
  if (typeof body.from_email === "string") setSetting("from_email", body.from_email.trim());
  if (typeof body.cron_schedule === "string") setSetting("cron_schedule", body.cron_schedule.trim());
  if (typeof body.base_url === "string") setSetting("base_url", body.base_url.trim());
  if (typeof body.difficulty === "string") setSetting("difficulty", body.difficulty.trim());
  return c.redirect("/admin");
});

app.get("/api/logs", (c) => {
  const stats = { total: 0, success: 0, error: 0 };
  const logs = getRecentEmailLogs(50);
  for (const l of logs) {
    stats.total++;
    if (l.status === "sent" || l.status === "success") stats.success++;
    else if (l.status === "error") stats.error++;
  }
  return c.json({ stats, logs });
});

export default app;
