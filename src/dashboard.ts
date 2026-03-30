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

// --- Inbound email webhook (no auth — Resend calls this) ---
app.post("/webhook/inbound", async (c) => {
  try {
    const body = await c.req.json();
    const fromEmail = body.from?.match(/<([^>]+)>/)?.[1] || body.from || "";
    const textBody = body.text || body.html?.replace(/<[^>]*>/g, " ") || "";

    if (!fromEmail || !textBody.trim()) {
      return c.json({ error: "Missing from or body" }, 400);
    }

    console.log(`Inbound reply from: ${fromEmail}`);

    const latestEmail = getLatestEmailForRecipient(fromEmail);
    if (!latestEmail || !latestEmail.questions || !latestEmail.answer_key) {
      console.log(`No matching email found for ${fromEmail}`);
      return c.json({ ok: true, skipped: "no matching email" });
    }

    const userAnswers = extractReplyText(textBody);
    const userName = fromEmail.split("@")[0].replace(/[._]/g, " ");

    const fbId = logFeedbackStart(latestEmail.id, fromEmail, userAnswers);

    const result = await evaluateAnswers(
      latestEmail.questions,
      latestEmail.answer_key,
      userAnswers,
      userName
    );

    logFeedbackComplete(fbId, result.score, result.feedback);
    await sendFeedbackEmail(fromEmail, result.feedback, result.score, latestEmail.article_title);

    console.log(`Feedback sent to ${fromEmail}: ${result.score}`);
    return c.json({ ok: true, score: result.score });
  } catch (err) {
    console.error("Webhook error:", err);
    return c.json({ error: "Internal error" }, 500);
  }
});

function extractReplyText(text: string): string {
  const lines = text.split("\n");
  const replyLines: string[] = [];
  for (const line of lines) {
    if (/^On .+ wrote:/.test(line.trim())) break;
    if (/^-{3,}/.test(line.trim())) break;
    if (/^>/.test(line.trim())) continue;
    replyLines.push(line);
  }
  return replyLines.join("\n").trim() || text.trim();
}

// --- Auth for dashboard routes ---
app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

app.get("/", (c) => {
  const stats = getStats();
  const logs = getRecentLogs(30);
  const settings = getAllSettings();
  const feedback = getRecentFeedback(20);
  return c.html(renderDashboard(stats, logs, settings, feedback));
});

app.post("/trigger", async (c) => {
  runDailyJob().catch((err) => console.error("Manual trigger failed:", err));
  return c.redirect("/");
});

app.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (typeof body.recipients === "string") setSetting("recipients", body.recipients.trim());
  if (typeof body.from_email === "string") setSetting("from_email", body.from_email.trim());
  if (typeof body.cron_schedule === "string") setSetting("cron_schedule", body.cron_schedule.trim());
  return c.redirect("/");
});

app.get("/api/logs", (c) => c.json({ stats: getStats(), logs: getRecentLogs(50) }));
app.get("/api/feedback", (c) => c.json({ feedback: getRecentFeedback(50) }));

// --- Rendering ---

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function statusBadge(status: string): string {
  if (status === "success" || status === "sent")
    return `<span class="badge">DELIVERED</span>`;
  if (status === "error")
    return `<span class="badge badge-red">FAILED</span>`;
  return `<span class="badge badge-muted">PENDING</span>`;
}

const today = () => {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

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
      <td class="td mono">${l.id}</td>
      <td class="td mono" style="white-space:nowrap;">${l.sent_at}</td>
      <td class="td" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <a href="${esc(l.article_url)}" target="_blank">${esc(l.article_title)}</a>
      </td>
      <td class="td muted">${esc(l.article_source)}</td>
      <td class="td">${statusBadge(l.status)}</td>
      <td class="td mono">${l.duration_ms ? (l.duration_ms / 1000).toFixed(1) + "s" : "&mdash;"}</td>
      <td class="td error-text" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.error ? esc(l.error) : ""}</td>
    </tr>`
    )
    .join("");

  const feedbackRows = feedback
    .map(
      (f: any) => `
    <tr>
      <td class="td mono">${f.received_at}</td>
      <td class="td">${esc(f.user_email)}</td>
      <td class="td score">${f.score ? esc(f.score) : "&mdash;"}</td>
      <td class="td">${statusBadge(f.status)}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');

    :root {
      --bg: #F9F9F7;
      --fg: #111111;
      --muted: #E5E5E0;
      --red: #CC0000;
      --n100: #F5F5F5;
      --n400: #A3A3A3;
      --n500: #737373;
      --n600: #525252;
      --n700: #404040;
    }

    [data-theme="dark"] {
      --bg: #111111;
      --fg: #E8E8E4;
      --muted: #2A2A28;
      --red: #FF4444;
      --n100: #1A1A1A;
      --n400: #666666;
      --n500: #888888;
      --n600: #AAAAAA;
      --n700: #CCCCCC;
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #111111;
        --fg: #E8E8E4;
        --muted: #2A2A28;
        --red: #FF4444;
        --n100: #1A1A1A;
        --n400: #666666;
        --n500: #888888;
        --n600: #AAAAAA;
        --n700: #CCCCCC;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Lora', Georgia, serif;
      background: var(--bg);
      color: var(--fg);
      min-height: 100vh;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111111' fill-opacity='0.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
      transition: background 0.2s, color 0.2s;
    }

    [data-theme="dark"] body,
    :root:not([data-theme="light"]) body {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23ffffff' fill-opacity='0.03' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'%3E%3C/path%3E%3C/svg%3E");
    }

    .shell {
      max-width: 1080px;
      margin: 0 auto;
      padding: 32px 24px;
    }

    /* ---- MASTHEAD ---- */
    .masthead {
      border-bottom: 4px double var(--fg);
      padding-bottom: 12px;
      margin-bottom: 8px;
    }
    .masthead-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--n500);
      margin-bottom: 16px;
    }
    .masthead h1 {
      font-family: 'Playfair Display', serif;
      font-size: 56px;
      font-weight: 900;
      line-height: 0.92;
      letter-spacing: -1px;
      text-align: center;
      color: var(--fg);
    }
    .masthead .tagline {
      text-align: center;
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 5px;
      color: var(--n500);
      margin-top: 10px;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--fg);
      margin-bottom: 24px;
    }
    .toolbar-left {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--n500);
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .toolbar-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .btn-primary {
      font-family: 'Inter', sans-serif;
      background: var(--fg);
      color: var(--bg);
      border: 1px solid transparent;
      padding: 10px 28px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s;
    }
    .btn-primary:hover {
      background: var(--bg);
      color: var(--fg);
      border-color: var(--fg);
    }

    .btn-icon {
      background: none;
      border: 1px solid var(--fg);
      color: var(--fg);
      width: 38px;
      height: 38px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0;
      transition: all 0.2s;
    }
    .btn-icon:hover {
      background: var(--fg);
      color: var(--bg);
    }

    /* ---- STATS GRID ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1px solid var(--fg);
      margin-bottom: 32px;
    }
    .stat {
      padding: 20px;
      border-right: 1px solid var(--fg);
      position: relative;
    }
    .stat:last-child { border-right: none; }
    .stat .label {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 2.5px;
      color: var(--n500);
      margin-bottom: 6px;
    }
    .stat .val {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 900;
      line-height: 1;
      color: var(--fg);
    }
    .stat.red .val { color: var(--red); }

    /* ---- SECTIONS ---- */
    .section {
      border: 1px solid var(--fg);
      margin-bottom: 24px;
      background: var(--bg);
      border-radius: 0;
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid var(--fg);
      background: var(--n100);
    }
    .section-head h2 {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: var(--fg);
    }
    .section-head .hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--n500);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ---- TABLE ---- */
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 10px 14px;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--n500);
      border-bottom: 2px solid var(--fg);
      background: var(--n100);
    }
    .td {
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid var(--muted);
      color: var(--fg);
      font-family: 'Lora', serif;
    }
    .td.mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--n500);
    }
    .td.muted { color: var(--n500); }
    .td.score {
      font-family: 'Playfair Display', serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--fg);
    }
    .td.error-text {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--red);
    }
    .td a {
      color: var(--fg);
      text-decoration: none;
      border-bottom: 1px solid var(--muted);
      transition: border-color 0.2s;
    }
    .td a:hover {
      border-bottom-color: var(--red);
    }
    tr:hover .td { background: var(--n100); }

    .badge {
      font-family: 'Inter', sans-serif;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 3px 8px;
      border: 1px solid var(--fg);
      color: var(--fg);
      display: inline-block;
    }
    .badge-red { border-color: var(--red); color: var(--red); }
    .badge-muted { border-color: var(--n400); color: var(--n400); }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      font-style: italic;
      color: var(--n500);
      font-size: 14px;
    }

    /* ---- SETTINGS ---- */
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .field {
      padding: 16px 20px;
      border-right: 1px solid var(--muted);
      border-bottom: 1px solid var(--muted);
    }
    .field:nth-child(even) { border-right: none; }
    .field label {
      display: block;
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: var(--n500);
      margin-bottom: 8px;
    }
    .field input {
      width: 100%;
      background: transparent;
      border: none;
      border-bottom: 2px solid var(--fg);
      color: var(--fg);
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      padding: 8px 2px;
      border-radius: 0;
      outline: none;
      transition: background 0.2s;
    }
    .field input:focus {
      background: var(--n100);
    }
    .field input:disabled {
      color: var(--n400);
      border-bottom-style: dashed;
    }

    .save-row {
      padding: 14px 20px;
      text-align: right;
      border-top: 1px solid var(--muted);
    }
    .btn-outline {
      font-family: 'Inter', sans-serif;
      background: transparent;
      color: var(--fg);
      border: 1px solid var(--fg);
      padding: 10px 28px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s;
    }
    .btn-outline:hover {
      background: var(--fg);
      color: var(--bg);
    }

    /* ---- FOOTER ---- */
    .footer-rule {
      text-align: center;
      padding: 32px 0 8px;
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      color: var(--n400);
      letter-spacing: 0.8em;
    }
    .footer {
      text-align: center;
      padding: 12px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--n500);
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .footer a { color: var(--n500); text-decoration: none; }
    .footer a:hover { color: var(--red); }

    /* ---- RESPONSIVE ---- */
    @media (max-width: 768px) {
      .shell { padding: 16px 12px; }
      .masthead h1 { font-size: 36px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .stat:nth-child(2) { border-right: none; }
      .stat:nth-child(1), .stat:nth-child(2) { border-bottom: 1px solid var(--fg); }
      .settings-grid { grid-template-columns: 1fr; }
      .field { border-right: none; }
      .toolbar { flex-direction: column; gap: 10px; align-items: flex-start; }
      .toolbar-right { width: 100%; justify-content: flex-end; }
    }
  </style>
</head>
<body>
  <div class="shell">

    <!-- MASTHEAD -->
    <header class="masthead">
      <div class="masthead-top">
        <span>Vol. 1 &middot; ${today()}</span>
        <span>Fly.io Edition</span>
      </div>
      <h1>The IELTS Daily</h1>
      <div class="tagline">All the Practice That&rsquo;s Fit to Send</div>
    </header>

    <!-- TOOLBAR -->
    <div class="toolbar">
      <div class="toolbar-left">Mission Control</div>
      <div class="toolbar-right">
        <button class="btn-icon" onclick="toggleTheme()" title="Toggle dark mode" id="themeBtn"></button>
        <form method="POST" action="/trigger" style="display:inline;" onsubmit="this.querySelector('button').textContent='SENDING\u2026'">
          <button type="submit" class="btn-primary">Send Now</button>
        </form>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat">
        <div class="label">Total Sent</div>
        <div class="val">${stats.total}</div>
      </div>
      <div class="stat">
        <div class="label">Delivered</div>
        <div class="val">${stats.success}</div>
      </div>
      <div class="stat red">
        <div class="label">Failed</div>
        <div class="val">${stats.error}</div>
      </div>
      <div class="stat">
        <div class="label">Pending</div>
        <div class="val">${stats.pending}</div>
      </div>
    </div>

    <!-- EMAIL LOG -->
    <div class="section">
      <div class="section-head">
        <h2>Transmission Log</h2>
        <span class="hint">Last 30 entries</span>
      </div>
      ${
        logs.length === 0
          ? '<div class="empty-state">No transmissions yet. Press &ldquo;Send Now&rdquo; to begin.</div>'
          : `<table>
        <thead><tr>
          <th>#</th><th>Date</th><th>Article</th><th>Source</th><th>Status</th><th>Time</th><th>Error</th>
        </tr></thead>
        <tbody>${logRows}</tbody>
      </table>`
      }
    </div>

    <!-- FEEDBACK -->
    <div class="section">
      <div class="section-head">
        <h2>Student Evaluations</h2>
        <span class="hint">Reply feedback</span>
      </div>
      ${
        feedback.length === 0
          ? '<div class="empty-state">No student replies received yet.</div>'
          : `<table>
        <thead><tr>
          <th>Received</th><th>Student</th><th>Score</th><th>Status</th>
        </tr></thead>
        <tbody>${feedbackRows}</tbody>
      </table>`
      }
    </div>

    <!-- SETTINGS -->
    <div class="section">
      <div class="section-head">
        <h2>Configuration</h2>
        <span class="hint">Live settings</span>
      </div>
      <form method="POST" action="/settings">
        <div class="settings-grid">
          <div class="field">
            <label>Recipients</label>
            <input type="text" name="recipients" value="${esc(settings.recipients)}" placeholder="email1@x.com, email2@x.com">
          </div>
          <div class="field">
            <label>From Address</label>
            <input type="text" name="from_email" value="${esc(settings.from_email)}" placeholder="ielts@yourdomain.com">
          </div>
          <div class="field">
            <label>Schedule (Cron)</label>
            <input type="text" name="cron_schedule" value="${esc(settings.cron_schedule)}" placeholder="0 7 * * *">
          </div>
          <div class="field">
            <label>Timezone</label>
            <input type="text" value="${esc(settings.cron_timezone || "UTC")}" disabled>
          </div>
        </div>
        <div class="save-row">
          <button type="submit" class="btn-outline">Save Changes</button>
        </div>
      </form>
    </div>

    <div class="footer-rule">&#x2727; &#x2727; &#x2727;</div>
    <div class="footer">
      Auto-refresh 30s &middot; <a href="/">Refresh now</a>
    </div>

  </div>
  <script>
    function getTheme() { return localStorage.getItem('theme') || 'auto'; }
    function applyTheme() {
      var t = getTheme(), h = document.documentElement;
      h.removeAttribute('data-theme');
      if (t === 'dark') h.setAttribute('data-theme', 'dark');
      else if (t === 'light') h.setAttribute('data-theme', 'light');
      updateIcon();
    }
    function isDark() {
      var t = getTheme();
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function updateIcon() {
      var b = document.getElementById('themeBtn');
      if (b) b.textContent = isDark() ? '\\u2600' : '\\u263E';
    }
    function toggleTheme() {
      var c = getTheme(), pd = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var n = c === 'auto' ? (pd ? 'light' : 'dark') : c === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', n);
      applyTheme();
    }
    applyTheme();
    setTimeout(function(){ location.reload(); }, 30000);
  </script>
</body>
</html>`;
}

export default app;
