import type { Article } from "../services/article.js";
import type { IELTSQuestions } from "../services/questions.js";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return esc(text)
    .split("\n\n")
    .map((block) => {
      const lines = block.split("\n");
      return `<p style="margin:0 0 14px;line-height:1.75;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

export function buildEmailHtml(
  article: Article,
  ielts: IELTSQuestions,
  date: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#1a1410;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1410;">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <!-- HEADER -->
        <tr><td style="padding:32px 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #d4a054;">
            <tr><td style="padding:20px 24px;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:800;color:#d4a054;letter-spacing:2px;text-shadow:2px 2px 0 #8b4d3b,3px 3px 0 #5c2d3e;">
                IELTS / DAILY
              </div>
              <div style="font-size:11px;color:#8a7a60;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">
                SYN / READING PRACTICE &mdash; ${esc(date)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- STATUS BAR -->
        <tr><td style="padding:0 0 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;color:#d4a054;letter-spacing:3px;text-transform:uppercase;">
                &#9608;&#9608;&#9608; READING PASSAGE LOADED
              </td>
              <td align="right" style="font-size:11px;color:#5a5040;letter-spacing:2px;">
                STATUS / ACTIVE
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- ARTICLE TITLE -->
        <tr><td style="padding:0 0 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #d4a054;">
            <tr><td style="padding:20px 24px;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#f0e0c0;line-height:1.3;">
                ${esc(article.title)}
              </div>
              <div style="margin-top:8px;font-size:12px;color:#8a7a60;">
                SOURCE / ${esc(article.source).toUpperCase()} &mdash;
                <a href="${esc(article.url)}" style="color:#d4a054;text-decoration:none;">read original &#8594;</a>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- PASSAGE -->
        <tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #3a3020;">
            <tr><td style="padding:6px 24px 2px;">
              <div style="font-size:10px;color:#5a5040;letter-spacing:3px;text-transform:uppercase;">
                &gt; READING PASSAGE
              </div>
            </td></tr>
            <tr><td style="padding:8px 24px 24px;">
              <div style="font-size:15px;color:#d0c8b0;line-height:1.8;">
                ${textToHtml(ielts.passage)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- QUESTIONS -->
        <tr><td style="padding:0 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #d4a054;border-left:3px solid #d4a054;">
            <tr><td style="padding:6px 24px 2px;">
              <div style="font-size:10px;color:#d4a054;letter-spacing:3px;text-transform:uppercase;">
                &gt; QUESTIONS
              </div>
            </td></tr>
            <tr><td style="padding:8px 24px 24px;">
              <div style="font-size:14px;color:#e8d8b8;line-height:1.8;">
                ${textToHtml(ielts.questions)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- REPLY CTA -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px dashed #5c8a5c;background:#1a2018;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:#7ab87a;margin-bottom:8px;">
                &#9654; REPLY TO THIS EMAIL WITH YOUR ANSWERS
              </div>
              <div style="font-size:13px;color:#5a8a5a;line-height:1.6;">
                An AI tutor will analyze your responses and send<br>
                personalized feedback with your score and study tips.
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:16px 0;border-top:1px dashed #2a2418;">
          <div style="font-size:11px;color:#4a4030;text-align:center;letter-spacing:2px;">
            IELTS / DAILY &mdash; KEEP GOING, YOU'VE GOT THIS
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Feedback email when user replies with answers
export function buildFeedbackHtml(
  feedback: string,
  score: string,
  articleTitle: string,
  date: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#1a1410;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1410;">
    <tr><td align="center" style="padding:24px 16px;">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">

        <!-- HEADER -->
        <tr><td style="padding:32px 0 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #7ab87a;">
            <tr><td style="padding:20px 24px;">
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:28px;font-weight:800;color:#7ab87a;letter-spacing:2px;text-shadow:2px 2px 0 #3a5a3a,3px 3px 0 #1a3a1a;">
                IELTS / FEEDBACK
              </div>
              <div style="font-size:11px;color:#5a8a5a;letter-spacing:4px;text-transform:uppercase;margin-top:6px;">
                SYN / SCORE REPORT &mdash; ${esc(date)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- SCORE -->
        <tr><td style="padding:0 0 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #7ab87a;text-align:center;">
            <tr><td style="padding:24px;">
              <div style="font-size:11px;color:#5a8a5a;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">
                YOUR SCORE
              </div>
              <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:48px;font-weight:800;color:#7ab87a;">
                ${esc(score)}
              </div>
              <div style="font-size:13px;color:#8a7a60;margin-top:8px;">
                ${esc(articleTitle)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- FEEDBACK -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #3a3020;">
            <tr><td style="padding:6px 24px 2px;">
              <div style="font-size:10px;color:#d4a054;letter-spacing:3px;text-transform:uppercase;">
                &gt; DETAILED FEEDBACK
              </div>
            </td></tr>
            <tr><td style="padding:8px 24px 24px;">
              <div style="font-size:14px;color:#d0c8b0;line-height:1.8;">
                ${textToHtml(feedback)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:16px 0;border-top:1px dashed #2a2418;">
          <div style="font-size:11px;color:#4a4030;text-align:center;letter-spacing:2px;">
            IELTS / DAILY &mdash; EVERY PRACTICE MAKES YOU STRONGER
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
