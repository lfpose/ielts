import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import {
  getRecentLogs,
  getStats,
  getAllSettings,
  setSetting,
  getRecentFeedback,
  getLatestEmailForRecipient,
  logFeedbackStart,
  logFeedbackComplete,
} from "./db.js";
import { evaluateAnswers } from "./services/questions.js";
import { sendFeedbackEmail } from "./services/email.js";
import { runDailyJob } from "./index.js";

const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "ielts2024";

const app = new Hono();

// Inbound email webhook (NO auth — Resend needs to reach this)
app.post("/webhook/inbound", async (c) => {
  try {
    const body = await c.req.json();

    // Resend inbound webhook payload
    const fromEmail = body.from?.match(/<([^>]+)>/)?.[1] || body.from || "";
    const textBody = body.text || body.html?.replace(/<[^>]*>/g, " ") || "";

    if (!fromEmail || !textBody.trim()) {
      return c.json({ error: "Missing from or body" }, 400);
    }

    console.log(`Inbound reply from: ${fromEmail}`);

    // Find the most recent email sent to this person
    const latestEmail = getLatestEmailForRecipient(fromEmail);
    if (!latestEmail || !latestEmail.questions || !latestEmail.answer_key) {
      console.log(`No matching email found for ${fromEmail}`);
      return c.json({ ok: true, skipped: "no matching email" });
    }

    // Extract just the user's reply (strip quoted text)
    const userAnswers = extractReplyText(textBody);
    const userName = fromEmail.split("@")[0].replace(/[._]/g, " ");

    // Log and process
    const fbId = logFeedbackStart(latestEmail.id, fromEmail, userAnswers);

    // Evaluate answers with Claude
    const result = await evaluateAnswers(
      latestEmail.questions,
      latestEmail.answer_key,
      userAnswers,
      userName
    );

    logFeedbackComplete(fbId, result.score, result.feedback);

    // Send feedback email
    await sendFeedbackEmail(fromEmail, result.feedback, result.score, latestEmail.article_title);

    console.log(`Feedback sent to ${fromEmail}: ${result.score}`);
    return c.json({ ok: true, score: result.score });
  } catch (err) {
    console.error("Webhook error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

// Strip quoted reply text (lines starting with > or "On ... wrote:")
function extractReplyText(text: string): string {
  const lines = text.split("\n");
  const replyLines: string[] = [];
  for (const line of lines) {
    // Stop at quoted text markers
    if (/^On .+ wrote:/.test(line.trim())) break;
    if (/^-{3,}/.test(line.trim())) break;
    if (/^>/.test(line.trim())) continue;
    replyLines.push(line);
  }
  return replyLines.join("\n").trim() || text.trim();
}

// Auth for all other routes
app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

// --- Dashboard ---
app.get("/", (c) => {
  const stats = getStats();
  const logs = getRecentLogs(30);
  const settings = getAllSettings();
  const feedback = getRecentFeedback(20);
  return c.html(renderDashboard(stats, logs, settings, feedback));
});

// --- Manual Trigger ---
app.post("/trigger", async (c) => {
  runDailyJob().catch((err) => console.error("Manual trigger failed:", err));
  return c.redirect("/");
});

// --- Settings ---
app.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (typeof body.recipients === "string") setSetting("recipients", body.recipients.trim());
  if (typeof body.from_email === "string") setSetting("from_email", body.from_email.trim());
  if (typeof body.cron_schedule === "string") setSetting("cron_schedule", body.cron_schedule.trim());
  return c.redirect("/");
});

// --- API ---
app.get("/api/logs", (c) => c.json({ stats: getStats(), logs: getRecentLogs(50) }));
app.get("/api/feedback", (c) => c.json({ feedback: getRecentFeedback(50) }));

// --- Rendering ---

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function statusBlock(status: string): string {
  const map: Record<string, { ch: string; color: string }> = {
    success: { ch: "&#9608;&#9608;", color: "#7ab87a" },
    error: { ch: "&#9608;&#9608;", color: "#d45050" },
    pending: { ch: "&#9608;&#9608;", color: "#d4a054" },
    sent: { ch: "&#9608;&#9608;", color: "#7ab87a" },
  };
  const s = map[status] || { ch: "??", color: "#555" };
  return `<span style="color:${s.color};font-size:12px;">${s.ch} ${status.toUpperCase()}</span>`;
}

function renderDashboard(
  stats: { total: number; success: number; error: number; pending: number },
  logs: Array<any>,
  settings: Record<string, string>,
  feedback: Array<any>
): string {
  const logRows = logs
    .map(
      (l: any) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;color:#5a5040;font-size:12px;">${l.id}</td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;color:#8a7a60;font-size:12px;white-space:nowrap;">${l.sent_at}</td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <a href="${esc(l.article_url)}" target="_blank" style="color:#d4a054;text-decoration:none;">${esc(l.article_title)}</a>
      </td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;color:#6a6050;font-size:12px;">${esc(l.article_source)}</td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;">${statusBlock(l.status)}</td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;color:#6a6050;font-size:12px;">${l.duration_ms ? (l.duration_ms / 1000).toFixed(1) + "s" : "---"}</td>
      <td style="padding:10px 12px;border-bottom:1px dashed #2a2418;color:#d45050;font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.error ? esc(l.error) : ""}</td>
    </tr>`
    )
    .join("");

  const feedbackRows = feedback
    .map(
      (f: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px dashed #1a2a18;color:#5a8a5a;font-size:12px;">${f.received_at}</td>
      <td style="padding:8px 12px;border-bottom:1px dashed #1a2a18;color:#8a9a80;font-size:12px;">${esc(f.user_email)}</td>
      <td style="padding:8px 12px;border-bottom:1px dashed #1a2a18;color:#7ab87a;font-size:14px;font-weight:700;">${f.score ? esc(f.score) : "---"}</td>
      <td style="padding:8px 12px;border-bottom:1px dashed #1a2a18;">${statusBlock(f.status)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS / DAILY — CONTROL</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Inter:wght@700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      background: #0e0c08;
      color: #c0b090;
      min-height: 100vh;
    }

    /* Scanline overlay */
    body::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        transparent, transparent 2px,
        rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px
      );
      pointer-events: none;
      z-index: 999;
    }

    .shell {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border: 1px dashed #3a3020;
      padding: 28px 32px;
      margin-bottom: 32px;
    }

    .header h1 {
      font-family: 'Inter', sans-serif;
      font-size: 36px;
      font-weight: 900;
      color: #d4a054;
      letter-spacing: 3px;
      text-shadow: 2px 2px 0 #8b4d3b, 4px 4px 0 #5c2d3e;
      line-height: 1;
    }

    .header .sub {
      font-size: 11px;
      color: #5a5040;
      letter-spacing: 5px;
      text-transform: uppercase;
      margin-top: 8px;
    }

    .trigger-btn {
      font-family: 'JetBrains Mono', monospace;
      background: transparent;
      color: #d4a054;
      border: 2px solid #d4a054;
      padding: 14px 28px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s;
    }
    .trigger-btn:hover {
      background: #d4a054;
      color: #0e0c08;
    }
    .trigger-btn:active {
      background: #f0d090;
    }

    /* STATS GRID */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0;
      margin-bottom: 32px;
      border: 1px dashed #3a3020;
    }

    .stat {
      padding: 24px;
      border-right: 1px dashed #2a2418;
    }
    .stat:last-child { border-right: none; }

    .stat .label {
      font-size: 10px;
      color: #5a5040;
      letter-spacing: 4px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .stat .val {
      font-family: 'Inter', sans-serif;
      font-size: 42px;
      font-weight: 900;
      line-height: 1;
    }
    .stat .bar {
      margin-top: 10px;
      font-size: 12px;
      letter-spacing: 1px;
    }

    .c-amber { color: #d4a054; }
    .c-green { color: #7ab87a; }
    .c-red { color: #d45050; }
    .c-yellow { color: #d4a054; }

    /* SECTIONS */
    .section {
      border: 1px dashed #3a3020;
      margin-bottom: 32px;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      border-bottom: 1px dashed #3a3020;
    }

    .section-head h2 {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 800;
      color: #d4a054;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 1px 1px 0 #5c2d3e;
    }

    .section-head .hint {
      font-size: 10px;
      color: #4a4030;
      letter-spacing: 2px;
    }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 12px 12px;
      font-size: 10px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #4a4030;
      border-bottom: 1px solid #2a2418;
    }

    tr:hover td { background: #161208; }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: #3a3020;
      font-size: 14px;
      letter-spacing: 2px;
    }

    /* SETTINGS FORM */
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    .field {
      padding: 20px 24px;
      border-right: 1px dashed #2a2418;
      border-bottom: 1px dashed #2a2418;
    }
    .field:nth-child(even) { border-right: none; }

    .field label {
      display: block;
      font-size: 10px;
      color: #5a5040;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .field input {
      width: 100%;
      background: #161208;
      border: 1px dashed #3a3020;
      color: #d0c8b0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      padding: 10px 14px;
      outline: none;
    }
    .field input:focus {
      border-color: #d4a054;
    }

    .save-row {
      padding: 16px 24px;
      text-align: right;
      border-top: 1px dashed #2a2418;
    }

    .save-btn {
      font-family: 'JetBrains Mono', monospace;
      background: transparent;
      color: #7ab87a;
      border: 1px solid #7ab87a;
      padding: 10px 24px;
      font-size: 12px;
      letter-spacing: 2px;
      text-transform: uppercase;
      cursor: pointer;
    }
    .save-btn:hover {
      background: #7ab87a;
      color: #0e0c08;
    }

    /* REFRESH */
    .refresh {
      text-align: center;
      padding: 24px;
      font-size: 10px;
      color: #2a2418;
      letter-spacing: 3px;
    }
    .refresh a { color: #4a4030; text-decoration: none; }
    .refresh a:hover { color: #d4a054; }

    @media (max-width: 768px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      .stat { border-bottom: 1px dashed #2a2418; }
      .settings-grid { grid-template-columns: 1fr; }
      .field { border-right: none; }
      .header { flex-direction: column; gap: 16px; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="shell">

    <!-- HEADER -->
    <div class="header">
      <div>
        <h1>IELTS / DAILY</h1>
        <div class="sub">mission control &mdash; system dashboard</div>
      </div>
      <form method="POST" action="/trigger" onsubmit="this.querySelector('button').textContent='&#9608; SENDING...'">
        <button type="submit" class="trigger-btn">&#9654; SEND NOW</button>
      </form>
    </div>

    <!-- STATS -->
    <div class="stats">
      <div class="stat">
        <div class="label">total / sent</div>
        <div class="val c-amber">${stats.total}</div>
        <div class="bar c-amber">${"&#9608;".repeat(Math.min(stats.total, 20))}</div>
      </div>
      <div class="stat">
        <div class="label">status / ok</div>
        <div class="val c-green">${stats.success}</div>
        <div class="bar c-green">${"&#9608;".repeat(Math.min(stats.success, 20))}</div>
      </div>
      <div class="stat">
        <div class="label">status / fail</div>
        <div class="val c-red">${stats.error}</div>
        <div class="bar c-red">${"&#9608;".repeat(Math.min(stats.error, 20))}</div>
      </div>
      <div class="stat">
        <div class="label">status / queue</div>
        <div class="val c-yellow">${stats.pending}</div>
        <div class="bar c-yellow">${"&#9608;".repeat(Math.min(stats.pending, 20))}</div>
      </div>
    </div>

    <!-- EMAIL LOG -->
    <div class="section">
      <div class="section-head">
        <h2>LOG / TRANSMISSIONS</h2>
        <span class="hint">LAST 30 ENTRIES</span>
      </div>
      ${
        logs.length === 0
          ? '<div class="empty-state">&gt; NO TRANSMISSIONS YET &mdash; HIT SEND NOW _</div>'
          : `<table>
        <thead>
          <tr>
            <th>#</th>
            <th>timestamp</th>
            <th>article</th>
            <th>source</th>
            <th>status</th>
            <th>time</th>
            <th>error</th>
          </tr>
        </thead>
        <tbody>${logRows}</tbody>
      </table>`
      }
    </div>

    <!-- FEEDBACK LOG -->
    <div class="section">
      <div class="section-head">
        <h2>LOG / STUDENT FEEDBACK</h2>
        <span class="hint">REPLY EVALUATIONS</span>
      </div>
      ${
        feedback.length === 0
          ? '<div class="empty-state">&gt; NO REPLIES RECEIVED YET &mdash; WAITING FOR STUDENTS _</div>'
          : `<table>
        <thead>
          <tr>
            <th>received</th>
            <th>student</th>
            <th>score</th>
            <th>status</th>
          </tr>
        </thead>
        <tbody>${feedbackRows}</tbody>
      </table>`
      }
    </div>

    <!-- SETTINGS -->
    <div class="section">
      <div class="section-head">
        <h2>CONFIG / SETTINGS</h2>
        <span class="hint">LIVE CONFIGURATION</span>
      </div>
      <form method="POST" action="/settings">
        <div class="settings-grid">
          <div class="field">
            <label>recipients / email list</label>
            <input type="text" name="recipients" value="${esc(settings.recipients)}" placeholder="email1@x.com,email2@x.com">
          </div>
          <div class="field">
            <label>from / sender address</label>
            <input type="text" name="from_email" value="${esc(settings.from_email)}" placeholder="ielts@yourdomain.com">
          </div>
          <div class="field">
            <label>schedule / cron expression</label>
            <input type="text" name="cron_schedule" value="${esc(settings.cron_schedule)}" placeholder="0 7 * * *">
          </div>
          <div class="field">
            <label>timezone / reference</label>
            <input type="text" name="timezone" value="${esc(settings.cron_timezone || "UTC")}" disabled>
          </div>
        </div>
        <div class="save-row">
          <button type="submit" class="save-btn">&#9654; SAVE CONFIG</button>
        </div>
      </form>
    </div>

    <div class="refresh">
      AUTO-REFRESH 30S &mdash; <a href="/">MANUAL REFRESH</a>
    </div>

  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}

export default app;
