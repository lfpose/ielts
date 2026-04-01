import cron from "node-cron";
import { serve } from "@hono/node-server";
import { fetchRandomArticle } from "./services/article.js";
import { generateQuestions, generateWritingPrompt } from "./services/questions.js";
import { sendInviteEmail } from "./services/email.js";
import {
  createDailyPractice,
  getTodaysPractices,
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
    const existing = getTodaysPractices();
    const existingSlots = new Set(existing.map((p) => p.slot));

    // Slot 1: Reading exercise (article + questions)
    let readingPractice = existing.find((p) => p.slot === "reading");
    if (!readingPractice) {
      console.log("[reading] Fetching article...");
      const article = await fetchRandomArticle();
      console.log(`[reading] Article: "${article.title}"`);
      const ielts = await generateQuestions(article);
      readingPractice = createDailyPractice({
        date: today, type: "reading", slot: "reading",
        article_title: article.title, article_source: article.source,
        article_url: article.url, passage: article.content,
        questions: ielts.questions, answer_key: ielts.answerKey,
      });
      console.log("[reading] Created.");
    }

    // Slot 2: Writing exercise (article-based writing prompt)
    if (!existingSlots.has("writing")) {
      console.log("[writing] Fetching article for writing prompt...");
      const article = await fetchRandomArticle();
      console.log(`[writing] Article: "${article.title}"`);
      const prompt = await generateWritingPrompt(article);
      createDailyPractice({
        date: today, type: "writing", slot: "writing",
        article_title: article.title, article_source: article.source,
        article_url: article.url, passage: article.content,
        writing_prompt: prompt,
      });
      console.log("[writing] Created.");
    }

    // Slot 3: News (just a real article to read, no questions)
    if (!existingSlots.has("news")) {
      console.log("[news] Fetching article...");
      const article = await fetchRandomArticle();
      createDailyPractice({
        date: today, type: "news", slot: "news",
        article_title: article.title, article_source: article.source,
        article_url: article.url, passage: article.content,
      });
      console.log("[news] Created.");
    }

    // Ensure users exist
    const recipientEmails = getSetting("recipients").split(",").map((e) => e.trim()).filter(Boolean);
    for (const email of recipientEmails) {
      ensureUser(email, email.split("@")[0].replace(/[._]/g, " "));
    }

    // Send invite emails
    const users = getAllUsers();
    const sentTo: string[] = [];
    for (const user of users) {
      try {
        await sendInviteEmail(user.email, user.name, `${BASE_URL}/s/${user.token}`, readingPractice!.article_title || "Today's Practice");
        sentTo.push(user.email);
      } catch (err) {
        console.error(`Failed to email ${user.email}:`, err);
        logEmail(readingPractice!.id, user.email, "error", String(err), Date.now() - start);
      }
    }

    const duration = Date.now() - start;
    if (sentTo.length > 0) logEmail(readingPractice!.id, sentTo.join(", "), "success", undefined, duration);
    console.log(`Done! ${sentTo.length} invites sent in ${(duration / 1000).toFixed(1)}s`);
  } catch (err) {
    console.error("Job failed:", err);
  }
}

cron.schedule("0 7 * * *", runDailyJob);
console.log("IELTS Daily scheduler started. Cron: 7:00 AM UTC.");

const port = Number(process.env.PORT) || 8080;
serve({ fetch: dashboard.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});

if (process.env.RUN_NOW === "true") runDailyJob();
