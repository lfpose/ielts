import { Resend } from "resend";
import { getSetting } from "../db.js";
import { buildInviteEmailHtml } from "../templates/email.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export function getFromEmail(): string {
  return getSetting("from_email");
}

export async function sendInviteEmail(
  to: string,
  userName: string,
  practiceUrl: string,
  articleTitle: string
): Promise<void> {
  const fromEmail = getFromEmail();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const html = buildInviteEmailHtml(userName, practiceUrl, articleTitle, today);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: `Tu práctica IELTS está lista — ${articleTitle}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email to ${to}: ${JSON.stringify(error)}`);
  }
}
