import cron from "node-cron";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getTodaysBoard } from "./db.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/student.js";
import authRoutes from "./routes/auth.js";

export async function runDailyJob() {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[${new Date().toISOString()}] Starting daily IELTS job for ${today}...`);

  const existing = getTodaysBoard();
  if (existing) {
    console.log(`Board for ${today} already exists (topic: ${existing.topic}). Skipping.`);
    return;
  }

  // Full daily job implementation in P1-3 (depends on content + grading services)
  console.log("Daily job not yet wired to new content pipeline. Use admin /generate to create boards.");
}

cron.schedule("0 7 * * *", runDailyJob);
console.log("IELTS Daily scheduler started. Cron: 7:00 AM UTC.");

const app = new Hono();
app.route("/admin", adminRoutes);
app.route("/s", studentRoutes);
app.route("/", authRoutes);

const port = Number(process.env.PORT) || 8080;
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

if (process.env.RUN_NOW === "true") runDailyJob();
