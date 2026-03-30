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

function statusDot(status: string): string {
  const colors: Record<string, string> = {
    success: "#4A5899",
    error: "#C47A5A",
    pending: "#B0A898",
    sent: "#4A5899",
  };
  const color = colors[status] || "#B0A898";
  return `<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:${color};">
    <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;"></span>
    ${status}
  </span>`;
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
      <td class="td">${l.id}</td>
      <td class="td" style="white-space:nowrap;color:var(--text-muted);">${l.sent_at}</td>
      <td class="td" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        <a href="${esc(l.article_url)}" target="_blank" style="color:var(--blue);text-decoration:none;border-bottom:1px solid var(--text-ghost);">${esc(l.article_title)}</a>
      </td>
      <td class="td" style="color:var(--text-muted);">${esc(l.article_source)}</td>
      <td class="td">${statusDot(l.status)}</td>
      <td class="td" style="color:var(--text-muted);">${l.duration_ms ? (l.duration_ms / 1000).toFixed(1) + "s" : "&mdash;"}</td>
      <td class="td" style="color:var(--terra);font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.error ? esc(l.error) : ""}</td>
    </tr>`
    )
    .join("");

  const feedbackRows = feedback
    .map(
      (f: any) => `
    <tr>
      <td class="td" style="color:var(--text-muted);">${f.received_at}</td>
      <td class="td">${esc(f.user_email)}</td>
      <td class="td" style="color:var(--blue);font-weight:600;font-size:16px;">${f.score ? esc(f.score) : "&mdash;"}</td>
      <td class="td">${statusDot(f.status)}</td>
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
    @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

    /* --- CSS Custom Properties (Light = default) --- */
    :root {
      --bg: #F5F1EB;
      --bg-card: #FFFFFF;
      --bg-input: #FDFCFA;
      --bg-hover: #FDFCFA;
      --text: #2C2C2C;
      --text-muted: #8A8278;
      --text-faint: #B0A898;
      --text-ghost: #D5CFC5;
      --border: #EDE8E0;
      --border-light: #F5F1EB;
      --blue: #4A5899;
      --blue-hover: #3A4880;
      --terra: #C47A5A;
      --shadow: 0 1px 3px rgba(180,170,155,0.15), 0 4px 12px rgba(180,170,155,0.08);
      --shadow-hover: 0 4px 12px rgba(74,88,153,0.25);
      --grain-opacity: 0.03;
    }

    /* Dark mode — warm inky notebook at night */
    [data-theme="dark"] {
      --bg: #1C1A17;
      --bg-card: #252320;
      --bg-input: #1C1A17;
      --bg-hover: #2A2825;
      --text: #D8D0C4;
      --text-muted: #8A8278;
      --text-faint: #5E584E;
      --text-ghost: #3A362F;
      --border: #33302A;
      --border-light: #2A2825;
      --blue: #7B8FD4;
      --blue-hover: #6A7EC0;
      --terra: #D4956E;
      --shadow: 0 1px 3px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15);
      --shadow-hover: 0 4px 12px rgba(123,143,212,0.2);
      --grain-opacity: 0.015;
    }

    /* Auto dark mode via OS preference (unless manually toggled) */
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme="light"]) {
        --bg: #1C1A17;
        --bg-card: #252320;
        --bg-input: #1C1A17;
        --bg-hover: #2A2825;
        --text: #D8D0C4;
        --text-muted: #8A8278;
        --text-faint: #5E584E;
        --text-ghost: #3A362F;
        --border: #33302A;
        --border-light: #2A2825;
        --blue: #7B8FD4;
        --blue-hover: #6A7EC0;
        --terra: #D4956E;
        --shadow: 0 1px 3px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15);
        --shadow-hover: 0 4px 12px rgba(123,143,212,0.2);
        --grain-opacity: 0.015;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Source Serif 4', Georgia, serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
      transition: background 0.3s, color 0.3s;
    }

    .shell {
      max-width: 960px;
      margin: 0 auto;
      padding: 48px 32px;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 48px;
    }

    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: 0.5px;
    }

    .header .sub {
      font-size: 14px;
      color: var(--text-muted);
      font-style: italic;
      font-weight: 300;
      margin-top: 4px;
    }

    .header .accent-line {
      width: 48px;
      height: 2px;
      background: var(--terra);
      margin-top: 12px;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .theme-toggle {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-muted);
      width: 38px;
      height: 38px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .theme-toggle:hover {
      border-color: var(--text-faint);
      color: var(--text);
    }

    .trigger-btn {
      font-family: 'Source Serif 4', Georgia, serif;
      background: var(--blue);
      color: #FFFFFF;
      border: none;
      padding: 14px 32px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 0.3px;
    }
    .trigger-btn:hover {
      background: var(--blue-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-hover);
    }
    .trigger-btn:active {
      transform: translateY(0);
    }

    /* STATS */
    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 48px;
    }

    .stat-card {
      background: var(--bg-card);
      border-radius: 10px;
      padding: 24px;
      position: relative;
      box-shadow: var(--shadow);
      transition: background 0.3s, box-shadow 0.3s;
    }

    .stat-card .label {
      font-size: 12px;
      color: var(--text-faint);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: 'IBM Plex Mono', monospace;
      font-weight: 400;
      margin-bottom: 8px;
    }

    .stat-card .val {
      font-size: 38px;
      font-weight: 700;
      line-height: 1;
    }

    .c-default { color: var(--text); }
    .c-blue { color: var(--blue); }
    .c-terra { color: var(--terra); }
    .c-muted { color: var(--text-faint); }

    /* SECTIONS */
    .section {
      background: var(--bg-card);
      border-radius: 10px;
      margin-bottom: 32px;
      box-shadow: var(--shadow);
      overflow: hidden;
      transition: background 0.3s, box-shadow 0.3s;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 28px;
      border-bottom: 1px solid var(--border);
    }

    .section-head h2 {
      font-size: 13px;
      font-weight: 400;
      color: var(--text-faint);
      text-transform: uppercase;
      letter-spacing: 2px;
      font-family: 'IBM Plex Mono', monospace;
    }

    .section-head .hint {
      font-size: 12px;
      color: var(--text-ghost);
      font-style: italic;
    }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 14px 16px;
      font-size: 11px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--text-faint);
      font-family: 'IBM Plex Mono', monospace;
      font-weight: 400;
      border-bottom: 1px solid var(--border);
    }

    .td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-light);
      color: var(--text);
    }

    tr:hover .td { background: var(--bg-hover); }

    .empty-state {
      text-align: center;
      padding: 56px 28px;
      color: var(--text-faint);
      font-size: 15px;
      font-style: italic;
    }

    /* SETTINGS */
    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    .field {
      padding: 20px 28px;
      border-right: 1px solid var(--border-light);
      border-bottom: 1px solid var(--border-light);
    }
    .field:nth-child(even) { border-right: none; }

    .field label {
      display: block;
      font-size: 11px;
      color: var(--text-faint);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: 'IBM Plex Mono', monospace;
      margin-bottom: 8px;
    }

    .field input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      padding: 10px 14px;
      border-radius: 6px;
      outline: none;
      transition: border-color 0.2s, background 0.3s;
    }
    .field input:focus {
      border-color: var(--blue);
    }

    .save-row {
      padding: 16px 28px;
      text-align: right;
    }

    .save-btn {
      font-family: 'Source Serif 4', Georgia, serif;
      background: transparent;
      color: var(--blue);
      border: 1px solid var(--blue);
      padding: 10px 28px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .save-btn:hover {
      background: var(--blue);
      color: #FFFFFF;
    }

    .refresh {
      text-align: center;
      padding: 24px;
      font-size: 12px;
      color: var(--text-ghost);
      font-style: italic;
    }
    .refresh a { color: var(--text-faint); text-decoration: none; }
    .refresh a:hover { color: var(--blue); border-bottom: 1px solid var(--blue); }

    @media (max-width: 768px) {
      .shell { padding: 24px 16px; }
      .stats { grid-template-columns: repeat(2, 1fr); }
      .settings-grid { grid-template-columns: 1fr; }
      .field { border-right: none; }
      .header { flex-direction: column; gap: 20px; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="shell">

    <div class="header">
      <div>
        <h1>IELTS Daily</h1>
        <div class="sub">a quiet system for daily practice</div>
        <div class="accent-line"></div>
      </div>
      <div class="header-right">
        <button class="theme-toggle" onclick="toggleTheme()" title="Toggle dark mode" id="themeBtn"></button>
        <form method="POST" action="/trigger" onsubmit="this.querySelector('button').textContent='Sending\u2026'">
          <button type="submit" class="trigger-btn">Send now</button>
        </form>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="label">Total</div>
        <div class="val c-default">${stats.total}</div>
      </div>
      <div class="stat-card">
        <div class="label">Delivered</div>
        <div class="val c-blue">${stats.success}</div>
      </div>
      <div class="stat-card">
        <div class="label">Failed</div>
        <div class="val c-terra">${stats.error}</div>
      </div>
      <div class="stat-card">
        <div class="label">Pending</div>
        <div class="val c-muted">${stats.pending}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h2>Email log</h2>
        <span class="hint">last 30</span>
      </div>
      ${
        logs.length === 0
          ? '<div class="empty-state">No emails sent yet. Press &ldquo;Send now&rdquo; to begin.</div>'
          : `<table>
        <thead><tr>
          <th>#</th><th>Date</th><th>Article</th><th>Source</th><th>Status</th><th>Time</th><th>Error</th>
        </tr></thead>
        <tbody>${logRows}</tbody>
      </table>`
      }
    </div>

    <div class="section">
      <div class="section-head">
        <h2>Student feedback</h2>
        <span class="hint">reply evaluations</span>
      </div>
      ${
        feedback.length === 0
          ? '<div class="empty-state">No replies received yet. Waiting for students to respond.</div>'
          : `<table>
        <thead><tr>
          <th>Received</th><th>Student</th><th>Score</th><th>Status</th>
        </tr></thead>
        <tbody>${feedbackRows}</tbody>
      </table>`
      }
    </div>

    <div class="section">
      <div class="section-head">
        <h2>Settings</h2>
        <span class="hint">live configuration</span>
      </div>
      <form method="POST" action="/settings">
        <div class="settings-grid">
          <div class="field">
            <label>Recipients</label>
            <input type="text" name="recipients" value="${esc(settings.recipients)}" placeholder="email1@x.com, email2@x.com">
          </div>
          <div class="field">
            <label>From address</label>
            <input type="text" name="from_email" value="${esc(settings.from_email)}" placeholder="ielts@yourdomain.com">
          </div>
          <div class="field">
            <label>Schedule (cron)</label>
            <input type="text" name="cron_schedule" value="${esc(settings.cron_schedule)}" placeholder="0 7 * * *">
          </div>
          <div class="field">
            <label>Timezone</label>
            <input type="text" value="${esc(settings.cron_timezone || "UTC")}" disabled style="color:var(--text-faint);">
          </div>
        </div>
        <div class="save-row">
          <button type="submit" class="save-btn">Save changes</button>
        </div>
      </form>
    </div>

    <div class="refresh">
      refreshes every 30s &mdash; <a href="/">refresh now</a>
    </div>

  </div>
  <script>
    // Theme toggle — persists in localStorage
    function getTheme() {
      return localStorage.getItem('theme') || 'auto';
    }
    function applyTheme() {
      const t = getTheme();
      const html = document.documentElement;
      html.removeAttribute('data-theme');
      if (t === 'dark') html.setAttribute('data-theme', 'dark');
      else if (t === 'light') html.setAttribute('data-theme', 'light');
      // 'auto' = no attribute, CSS media query handles it
      updateIcon();
    }
    function isDark() {
      const t = getTheme();
      if (t === 'dark') return true;
      if (t === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    function updateIcon() {
      const btn = document.getElementById('themeBtn');
      if (btn) btn.textContent = isDark() ? '\\u2600' : '\\u263E';
    }
    function toggleTheme() {
      const current = getTheme();
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let next;
      if (current === 'auto') next = prefersDark ? 'light' : 'dark';
      else if (current === 'dark') next = 'light';
      else next = 'dark';
      localStorage.setItem('theme', next);
      applyTheme();
    }
    applyTheme();
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>`;
}

export default app;
