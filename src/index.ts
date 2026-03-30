import cron from "node-cron";
import { serve } from "@hono/node-server";
import { fetchRandomArticle } from "./services/article.js";
import { generateQuestions } from "./services/questions.js";
import { sendIELTSEmail, getRecipients } from "./services/email.js";
import { logEmailStart, logEmailSuccess, logEmailError } from "./db.js";
import dashboard from "./dashboard.js";

export async function runDailyJob() {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Starting daily IELTS email job...`);

  let logId: number | undefined;

  try {
    console.log("Fetching article...");
    const article = await fetchRandomArticle();
    console.log(`Article: "${article.title}" from ${article.source}`);

    const recipients = getRecipients();
    logId = logEmailStart(article.title, article.source, article.url, recipients.join(", "));

    console.log("Generating IELTS questions...");
    const ielts = await generateQuestions(article);

    console.log("Sending email...");
    await sendIELTSEmail(article, ielts);

    const duration = Date.now() - start;
    if (logId) logEmailSuccess(logId, duration, ielts.questions, ielts.answerKey);
    console.log(`Done! Email sent in ${(duration / 1000).toFixed(1)}s`);
  } catch (err) {
    const duration = Date.now() - start;
    const errMsg = err instanceof Error ? err.message : String(err);
    if (logId) logEmailError(logId, errMsg, duration);
    console.error("Job failed:", err);
  }
}

// Cron: daily at 7:00 AM UTC
cron.schedule("0 7 * * *", runDailyJob);
console.log("IELTS Daily Email scheduler started. Cron: 7:00 AM UTC.");

// Web dashboard
const port = Number(process.env.PORT) || 8080;
serve({ fetch: dashboard.fetch, port }, () => {
  console.log(`Dashboard running on http://localhost:${port}`);
});

// Manual trigger via env var
if (process.env.RUN_NOW === "true") {
  runDailyJob();
}
