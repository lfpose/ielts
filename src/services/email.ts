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
  topic: string
): Promise<void> {
  const fromEmail = getFromEmail();

  const html = buildInviteEmailHtml(userName, practiceUrl, topic);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject: "Tu práctica de hoy está lista",
    html,
  });

  if (error) {
    throw new Error(`Failed to send email to ${to}: ${JSON.stringify(error)}`);
  }
}
