import { Resend } from "resend";
import type { Article } from "./article.js";
import type { IELTSQuestions } from "./questions.js";
import { buildEmailHtml } from "../templates/email.js";

const resend = new Resend(process.env.RESEND_API_KEY);

const RECIPIENTS = (process.env.RECIPIENTS || "").split(",").filter(Boolean);
const FROM_EMAIL = process.env.FROM_EMAIL || "ielts@example.com";

export async function sendIELTSEmail(
  article: Article,
  ielts: IELTSQuestions
): Promise<void> {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = buildEmailHtml(article, ielts, today);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: RECIPIENTS,
    subject: `IELTS Reading Practice — ${today}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${JSON.stringify(error)}`);
  }
}
