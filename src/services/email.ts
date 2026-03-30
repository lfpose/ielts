import { Resend } from "resend";
import type { Article } from "./article.js";
import type { IELTSQuestions } from "./questions.js";
import { buildEmailHtml, buildFeedbackHtml } from "../templates/email.js";
import { getSetting } from "../db.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export function getRecipients(): string[] {
  return getSetting("recipients").split(",").map((e) => e.trim()).filter(Boolean);
}

export function getFromEmail(): string {
  return getSetting("from_email");
}

export async function sendIELTSEmail(
  article: Article,
  ielts: IELTSQuestions
): Promise<void> {
  const recipients = getRecipients();
  const fromEmail = getFromEmail();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = buildEmailHtml(article, ielts, today);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject: `IELTS Reading Practice — ${today}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
  }
}

export async function sendFeedbackEmail(
  to: string,
  feedback: string,
  score: string,
  articleTitle: string
): Promise<void> {
  const fromEmail = getFromEmail();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = buildFeedbackHtml(feedback, score, articleTitle, today);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Your IELTS Score: ${score} — ${articleTitle}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send feedback email: ${JSON.stringify(error)}`);
  }
}
