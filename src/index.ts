import cron from "node-cron";
import { serve } from "@hono/node-server";
import { fetchRandomArticle } from "./services/article.js";
import { generateQuestions } from "./services/questions.js";
import { sendInviteEmail } from "./services/email.js";
import {
  createDailyPractice,
  getTodaysPractice,
  ensureUser,
  getAllUsers,
  getSetting,
  logEmail,
} from "./db.js";
import dashboard from "./dashboard.js";

const BASE_URL = process.env.BASE_URL || "https://ielts-daily.fly.dev";

export async function runDailyJob() {
  const start = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[${new Date().toISOString()}] Starting daily IELTS job for ${today}...`);

  try {
    // 1. Create today's practice (if not exists)
    let practice = getTodaysPractice();
    if (!practice) {
      console.log("Fetching article...");
      const article = await fetchRandomArticle();
      console.log(`Article: "${article.title}" from ${article.source}`);

      console.log("Generating IELTS questions...");
      const ielts = await generateQuestions(article);

      practice = createDailyPractice({
        date: today,
        type: "reading",
        article_title: article.title,
        article_source: article.source,
        article_url: article.url,
        passage: article.content,
        questions: ielts.questions,
        answer_key: ielts.answerKey,
      });
      console.log(`Practice created: ${practice.id}`);
    } else {
      console.log(`Practice already exists for ${today}`);
    }

    // 2. Ensure users exist
    const recipientEmails = getSetting("recipients").split(",").map((e) => e.trim()).filter(Boolean);
    for (const email of recipientEmails) {
      const name = email.split("@")[0].replace(/[._]/g, " ");
      ensureUser(email, name);
    }

    // 3. Send invite emails
    const users = getAllUsers();
    const sentTo: string[] = [];
    for (const user of users) {
      try {
        const practiceUrl = `${BASE_URL}/s/${user.token}`;
        await sendInviteEmail(user.email, user.name, practiceUrl, practice.article_title || "Today's Practice");
        sentTo.push(user.email);
        console.log(`Invite sent to ${user.email}`);
      } catch (err) {
        console.error(`Failed to email ${user.email}:`, err);
        logEmail(practice.id, user.email, "error", String(err), Date.now() - start);
      }
    }

    const duration = Date.now() - start;
    if (sentTo.length > 0) {
      logEmail(practice.id, sentTo.join(", "), "success", undefined, duration);
    }
    console.log(`Done! ${sentTo.length} invites sent in ${(duration / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error("Job failed:", err);
  }
}

// Cron: daily at 7:00 AM UTC
cron.schedule("0 7 * * *", runDailyJob);
console.log("IELTS Daily scheduler started. Cron: 7:00 AM UTC.");

// Web server
const port = Number(process.env.PORT) || 8080;
serve({ fetch: dashboard.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

// Manual trigger
if (process.env.RUN_NOW === "true") {
  runDailyJob();
}
