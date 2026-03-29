import type { Article } from "../services/article.js";
import type { IELTSQuestions } from "../services/questions.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return escapeHtml(text)
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
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
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 680px;
      margin: 0 auto;
      padding: 24px;
      color: #1a1a1a;
      background: #fafafa;
      line-height: 1.7;
    }
    .header {
      border-bottom: 3px solid #c0392b;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header h1 {
      font-size: 22px;
      margin: 0 0 4px;
      color: #c0392b;
    }
    .header .date {
      font-size: 14px;
      color: #666;
    }
    .section {
      margin: 28px 0;
    }
    .section h2 {
      font-size: 18px;
      color: #2c3e50;
      border-left: 4px solid #c0392b;
      padding-left: 12px;
      margin-bottom: 12px;
    }
    .passage {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      font-size: 15px;
    }
    .passage p { margin: 0 0 12px; }
    .source {
      font-size: 13px;
      color: #888;
      margin-top: 8px;
    }
    .questions {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      font-size: 15px;
    }
    .questions p { margin: 0 0 10px; }
    .answers {
      background: #f0f4f0;
      border: 1px solid #c8d6c8;
      border-radius: 6px;
      padding: 20px;
      font-size: 14px;
      margin-top: 32px;
    }
    .answers h2 { color: #27633a; border-color: #27633a; }
    .answers p { margin: 0 0 10px; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>IELTS Reading Practice</h1>
    <div class="date">${escapeHtml(date)}</div>
  </div>

  <div class="section">
    <h2>${escapeHtml(article.title)}</h2>
    <div class="passage">
      ${textToHtml(ielts.passage)}
    </div>
    <div class="source">Source: ${escapeHtml(article.source)} &mdash; <a href="${escapeHtml(article.url)}">Original article</a></div>
  </div>

  <div class="section">
    <h2>Questions</h2>
    <div class="questions">
      ${textToHtml(ielts.questions)}
    </div>
  </div>

  <div class="answers">
    <h2>Answer Key</h2>
    ${textToHtml(ielts.answerKey)}
  </div>

  <div class="footer">
    Daily IELTS Practice &mdash; Keep going, you've got this!
  </div>
</body>
</html>`;
}
