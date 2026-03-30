import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { getRecentLogs, getStats } from "./db.js";
import { runDailyJob } from "./index.js";

const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "ielts2024";

const app = new Hono();

app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

app.get("/", (c) => {
  const stats = getStats();
  const logs = getRecentLogs(30);

  return c.html(renderDashboard(stats, logs));
});

app.post("/trigger", async (c) => {
  // Run in background, don't block the response
  runDailyJob().catch((err) => console.error("Manual trigger failed:", err));
  return c.redirect("/");
});

app.get("/api/logs", (c) => {
  return c.json({ stats: getStats(), logs: getRecentLogs(50) });
});

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    success: "#27ae60",
    error: "#e74c3c",
    pending: "#f39c12",
  };
  return `<span style="
    background:${colors[status] || "#999"};
    color:#fff;
    padding:2px 10px;
    border-radius:12px;
    font-size:13px;
    font-weight:600;
  ">${status}</span>`;
}

function renderDashboard(
  stats: { total: number; success: number; error: number; pending: number },
  logs: Array<{
    id: number;
    sent_at: string;
    article_title: string;
    article_source: string;
    article_url: string;
    recipients: string;
    status: string;
    error: string | null;
    duration_ms: number | null;
  }>
): string {
  const logRows = logs
    .map(
      (l) => `
    <tr>
      <td>${l.id}</td>
      <td>${l.sent_at}</td>
      <td><a href="${escHtml(l.article_url)}" target="_blank">${escHtml(l.article_title)}</a></td>
      <td>${escHtml(l.article_source)}</td>
      <td>${escHtml(l.recipients)}</td>
      <td>${statusBadge(l.status)}</td>
      <td>${l.duration_ms ? (l.duration_ms / 1000).toFixed(1) + "s" : "-"}</td>
      <td style="color:#e74c3c;font-size:12px;">${l.error ? escHtml(l.error) : ""}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily - Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f1117;
      color: #e0e0e0;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    h1 { font-size: 24px; color: #fff; }
    h1 span { color: #c0392b; }
    .trigger-btn {
      background: #c0392b;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .trigger-btn:hover { background: #e74c3c; }
    .trigger-btn:active { background: #a93226; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #1a1d27;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #2a2d37;
    }
    .stat-card .label { font-size: 13px; color: #888; margin-bottom: 4px; }
    .stat-card .value { font-size: 32px; font-weight: 700; }
    .stat-card.total .value { color: #3498db; }
    .stat-card.success .value { color: #27ae60; }
    .stat-card.error .value { color: #e74c3c; }
    .stat-card.pending .value { color: #f39c12; }
    .table-wrap {
      background: #1a1d27;
      border-radius: 12px;
      border: 1px solid #2a2d37;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      padding: 14px 16px;
      font-size: 12px;
      text-transform: uppercase;
      color: #888;
      border-bottom: 1px solid #2a2d37;
      white-space: nowrap;
    }
    td {
      padding: 12px 16px;
      font-size: 14px;
      border-bottom: 1px solid #1f222d;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    tr:hover td { background: #1f222d; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .empty { text-align: center; padding: 48px; color: #666; }
    .refresh {
      margin-top: 16px;
      text-align: center;
      font-size: 13px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>IELTS</span> Daily Dashboard</h1>
    <form method="POST" action="/trigger" onsubmit="this.querySelector('button').textContent='Sending...'">
      <button type="submit" class="trigger-btn">Send Now</button>
    </form>
  </div>

  <div class="stats">
    <div class="stat-card total">
      <div class="label">Total Sent</div>
      <div class="value">${stats.total}</div>
    </div>
    <div class="stat-card success">
      <div class="label">Successful</div>
      <div class="value">${stats.success}</div>
    </div>
    <div class="stat-card error">
      <div class="label">Failed</div>
      <div class="value">${stats.error}</div>
    </div>
    <div class="stat-card pending">
      <div class="label">Pending</div>
      <div class="value">${stats.pending}</div>
    </div>
  </div>

  <div class="table-wrap">
    ${
      logs.length === 0
        ? '<div class="empty">No emails sent yet. Hit "Send Now" to trigger the first one!</div>'
        : `<table>
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Article</th>
          <th>Source</th>
          <th>Recipients</th>
          <th>Status</th>
          <th>Time</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>${logRows}</tbody>
    </table>`
    }
  </div>

  <div class="refresh">
    Auto-refreshes every 30s &middot; <a href="/">Refresh now</a>
  </div>

  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default app;
