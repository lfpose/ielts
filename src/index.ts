import cron from "node-cron";
import { fetchRandomArticle } from "./services/article.js";
import { generateQuestions } from "./services/questions.js";
import { sendIELTSEmail } from "./services/email.js";

async function runDailyJob() {
  console.log(`[${new Date().toISOString()}] Starting daily IELTS email job...`);

  try {
    console.log("Fetching article...");
    const article = await fetchRandomArticle();
    console.log(`Article: "${article.title}" from ${article.source}`);

    console.log("Generating IELTS questions...");
    const ielts = await generateQuestions(article);

    console.log("Sending email...");
    await sendIELTSEmail(article, ielts);

    console.log("Done! Email sent successfully.");
  } catch (err) {
    console.error("Job failed:", err);
  }
}

// Run daily at 7:00 AM UTC (adjust as needed)
cron.schedule("0 7 * * *", runDailyJob);

console.log("IELTS Daily Email scheduler started. Waiting for 7:00 AM UTC...");

// Also allow manual trigger via env var
if (process.env.RUN_NOW === "true") {
  runDailyJob();
}
