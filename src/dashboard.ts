import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import {
  getUserByToken,
  getTodaysPractice,
  getTodaysPracticesWithStatus,
  getPracticeById,
  getPracticeByDate,
  getSubmission,
  createSubmission,
  updateSubmissionFeedback,
  getActivityData,
  getCurrentStreak,
  getLongestStreak,
  getTotalSubmissions,
  getRecentSubmissions,
  getRecentPracticesWithStatus,
  deleteTodaysPractice,
  getAllSettings,
  setSetting,
  getRecentEmailLogs,
  getEmailStats,
  getAllUsers,
} from "./db.js";
import { evaluateAnswers, evaluateWriting } from "./services/questions.js";
import { renderPracticePage, renderNoPracticePage } from "./templates/practice.js";
import { renderStatsPage } from "./templates/stats.js";
import { renderNewspaper } from "./templates/newspaper.js";
import { runDailyJob } from "./index.js";

const DASH_USER = process.env.DASH_USER || "admin";
const DASH_PASS = process.env.DASH_PASS || "ielts2024";
const BASE_URL = process.env.BASE_URL || "https://ielts-daily.fly.dev";

const app = new Hono();

// ==============================
// PUBLIC ROUTES (no auth needed)
// ==============================

// Student newspaper homepage
app.get("/s/:token", (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const todayPractices = getTodaysPracticesWithStatus(user.id);
  const archive = getRecentPracticesWithStatus(user.id, 10);
  const streak = getCurrentStreak(user.id);
  const longest = getLongestStreak(user.id);
  const total = getTotalSubmissions(user.id);
  const activity = getActivityData(user.id);

  return c.html(renderNewspaper(user, todayPractices, archive, streak, longest, total, activity));
});

// Practice page (supports ?id= for specific practice, ?date= for legacy)
app.get("/practice/:token", async (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const idParam = c.req.query("id");
  const dateParam = c.req.query("date");
  const practice = idParam ? getPracticeById(Number(idParam)) : dateParam ? getPracticeByDate(dateParam) : getTodaysPractice();
  if (!practice) return c.html(renderNoPracticePage(user));

  const existing = getSubmission(user.id, practice.id) ?? null;
  return c.html(renderPracticePage(user, practice, existing));
});

// Submit answers
app.post("/practice/:token", async (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const idParam = c.req.query("id");
  const dateParam = c.req.query("date");
  const practice = idParam ? getPracticeById(Number(idParam)) : dateParam ? getPracticeByDate(dateParam) : getTodaysPractice();
  if (!practice) return c.text("No practice available.", 404);

  const existing = getSubmission(user.id, practice.id);
  if (existing?.score) {
    return c.html(renderPracticePage(user, practice, existing));
  }

  const body = await c.req.parseBody();
  const answers = typeof body.answers === "string" ? body.answers.trim() : "";
  if (!answers) return c.redirect(`/practice/${user.token}?id=${practice.id}`);

  const subId = createSubmission(user.id, practice.id, answers);

  try {
    let result;
    if (practice.type === "writing") {
      result = await evaluateWriting(practice.writing_prompt || "", answers, user.name);
    } else {
      result = await evaluateAnswers(practice.questions || "", practice.answer_key || "", answers, user.name);
    }
    updateSubmissionFeedback(subId, result.score, result.feedback);
  } catch (err) {
    console.error("Evaluation failed:", err);
    updateSubmissionFeedback(subId, "?/?", "Evaluation failed. Please try again later.");
  }

  // Re-fetch and render with feedback
  const updated = getSubmission(user.id, practice.id) ?? null;
  return c.html(renderPracticePage(user, practice, updated));
});

// Stats page
app.get("/stats/:token", (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const activity = getActivityData(user.id);
  const streak = getCurrentStreak(user.id);
  const longest = getLongestStreak(user.id);
  const total = getTotalSubmissions(user.id);
  const recent = getRecentSubmissions(user.id);

  return c.html(renderStatsPage(user, activity, streak, longest, total, recent));
});

// ==============================
// ADMIN ROUTES (auth required)
// ==============================

app.use("/*", basicAuth({ username: DASH_USER, password: DASH_PASS }));

app.get("/", (c) => {
  const stats = getEmailStats();
  const logs = getRecentEmailLogs(30);
  const settings = getAllSettings();
  const users = getAllUsers();
  return c.html(renderAdminDashboard(stats, logs, settings, users));
});

app.post("/trigger", async (c) => {
  runDailyJob().catch((err) => console.error("Manual trigger failed:", err));
  return c.redirect("/");
});

app.post("/refresh", async (c) => {
  deleteTodaysPractice();
  runDailyJob().catch((err) => console.error("Refresh failed:", err));
  return c.redirect("/");
});

app.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (typeof body.recipients === "string") setSetting("recipients", body.recipients.trim());
  if (typeof body.from_email === "string") setSetting("from_email", body.from_email.trim());
  if (typeof body.cron_schedule === "string") setSetting("cron_schedule", body.cron_schedule.trim());
  return c.redirect("/");
});

app.get("/api/logs", (c) => c.json({ stats: getEmailStats(), logs: getRecentEmailLogs(50) }));

// ==============================
// ADMIN RENDERING
// ==============================

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const todayStr = () => {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

function renderAdminDashboard(
  stats: { total: number; success: number; error: number },
  logs: Array<any>,
  settings: Record<string, string>,
  users: Array<any>
): string {
  const logRows = logs.map((l: any) => `
    <tr>
      <td class="td mono">${l.sent_at}</td>
      <td class="td">${l.article_title ? esc(l.article_title) : "&mdash;"}</td>
      <td class="td mono">${esc(l.recipients)}</td>
      <td class="td"><span class="badge${l.status === "error" ? " badge-red" : ""}">${l.status.toUpperCase()}</span></td>
      <td class="td mono">${l.duration_ms ? (l.duration_ms / 1000).toFixed(1) + "s" : "&mdash;"}</td>
      <td class="td" style="color:var(--red);font-size:11px;">${l.error ? esc(l.error) : ""}</td>
    </tr>`
  ).join("");

  const userRows = users.map((u: any) => `
    <tr>
      <td class="td">${esc(u.name)}</td>
      <td class="td mono">${esc(u.email)}</td>
      <td class="td mono" style="font-size:11px;">
        <a href="${BASE_URL}/practice/${esc(u.token)}" style="color:var(--fg);border-bottom:1px solid var(--muted);">/practice/${esc(u.token).slice(0,8)}...</a>
      </td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily &mdash; Admin</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:wght@400;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");transition:background .2s,color .2s}
    .shell{max-width:1080px;margin:0 auto;padding:32px 24px}
    .masthead{border-bottom:4px double var(--fg);padding-bottom:12px;margin-bottom:8px}
    .masthead-top{display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:16px}
    .masthead h1{font-family:'Playfair Display',serif;font-size:56px;font-weight:900;line-height:.92;letter-spacing:-1px;text-align:center}
    .masthead .tagline{text-align:center;font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:5px;color:var(--n500);margin-top:10px}
    .toolbar{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--fg);margin-bottom:24px}
    .toolbar-left{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}
    .toolbar-right{display:flex;gap:8px;align-items:center}
    .btn-primary{font-family:'Inter',sans-serif;background:var(--fg);color:var(--bg);border:1px solid transparent;padding:10px 28px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;cursor:pointer;border-radius:0;transition:all .2s}
    .btn-primary:hover{background:var(--bg);color:var(--fg);border-color:var(--fg)}
    .btn-icon{background:none;border:1px solid var(--fg);color:var(--fg);width:38px;height:38px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;border-radius:0;transition:all .2s}
    .btn-icon:hover{background:var(--fg);color:var(--bg)}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--fg);margin-bottom:24px}
    .stat{padding:20px;border-right:1px solid var(--fg)}
    .stat:last-child{border-right:none}
    .stat .label{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:2.5px;color:var(--n500);margin-bottom:6px}
    .stat .val{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:1}
    .stat.red .val{color:var(--red)}
    .section{border:1px solid var(--fg);margin-bottom:24px}
    .section-head{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-bottom:1px solid var(--fg);background:var(--n100);
      font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .section-head .hint{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);font-weight:400;letter-spacing:1px}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 14px;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500);border-bottom:2px solid var(--fg);background:var(--n100)}
    .td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--muted);color:var(--fg)}
    .td.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--n500)}
    .td a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--muted)}.td a:hover{border-bottom-color:var(--red)}
    tr:hover .td{background:var(--n100)}
    .badge{font-family:'Inter',sans-serif;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;padding:3px 8px;border:1px solid var(--fg);display:inline-block}
    .badge-red{border-color:var(--red);color:var(--red)}
    .empty-state{text-align:center;padding:48px;font-style:italic;color:var(--n500)}
    .settings-grid{display:grid;grid-template-columns:1fr 1fr}
    .field{padding:16px 20px;border-right:1px solid var(--muted);border-bottom:1px solid var(--muted)}
    .field:nth-child(even){border-right:none}
    .field label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:8px}
    .field input{width:100%;background:transparent;border:none;border-bottom:2px solid var(--fg);color:var(--fg);font-family:'JetBrains Mono',monospace;font-size:13px;padding:8px 2px;border-radius:0;outline:none}
    .field input:focus{background:var(--n100)}
    .field input:disabled{color:var(--n500);border-bottom-style:dashed}
    .save-row{padding:14px 20px;text-align:right;border-top:1px solid var(--muted)}
    .btn-outline{font-family:'Inter',sans-serif;background:transparent;color:var(--fg);border:1px solid var(--fg);padding:10px 28px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;cursor:pointer;border-radius:0;transition:all .2s}
    .btn-outline:hover{background:var(--fg);color:var(--bg)}
    .footer-rule{text-align:center;padding:32px 0 8px;font-family:'Playfair Display',serif;font-size:20px;color:var(--muted);letter-spacing:.8em}
    .footer{text-align:center;padding:12px 0;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}
    .footer a{color:var(--n500);text-decoration:none}.footer a:hover{color:var(--red)}
    @media(max-width:768px){.shell{padding:16px 12px}.masthead h1{font-size:36px}.stats-grid{grid-template-columns:1fr}.stat{border-right:none;border-bottom:1px solid var(--fg)}.stat:last-child{border-bottom:none}.settings-grid{grid-template-columns:1fr}.field{border-right:none}.toolbar{flex-direction:column;gap:10px;align-items:flex-start}.toolbar-right{width:100%;justify-content:flex-end}}
  </style>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <div class="masthead-top"><span>Vol. 1 &middot; ${todayStr()}</span><span>Admin Edition</span></div>
      <h1>The IELTS Daily</h1>
      <div class="tagline">Mission Control</div>
    </header>
    <div class="toolbar">
      <div class="toolbar-left">Dashboard</div>
      <div class="toolbar-right">
        <button class="btn-icon" onclick="toggleTheme()" title="Toggle dark mode" id="themeBtn"></button>
        <form method="POST" action="/refresh" style="display:inline" onsubmit="this.querySelector('button').textContent='REFRESHING\u2026'">
          <button type="submit" class="btn-outline" style="margin-right:4px">Refresh Article</button>
        </form>
        <form method="POST" action="/trigger" style="display:inline" onsubmit="this.querySelector('button').textContent='SENDING\u2026'">
          <button type="submit" class="btn-primary">Send Now</button>
        </form>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat"><div class="label">Emails Sent</div><div class="val">${stats.total}</div></div>
      <div class="stat"><div class="label">Delivered</div><div class="val">${stats.success}</div></div>
      <div class="stat red"><div class="label">Failed</div><div class="val">${stats.error}</div></div>
    </div>

    <!-- USERS -->
    <div class="section">
      <div class="section-head"><span>Registered Users</span><span class="hint">${users.length} users</span></div>
      ${users.length === 0
        ? '<div class="empty-state">No users registered yet.</div>'
        : `<table><thead><tr><th>Name</th><th>Email</th><th>Practice Link</th></tr></thead><tbody>${userRows}</tbody></table>`
      }
    </div>

    <!-- EMAIL LOG -->
    <div class="section">
      <div class="section-head"><span>Email Log</span><span class="hint">Last 30</span></div>
      ${logs.length === 0
        ? '<div class="empty-state">No emails sent yet.</div>'
        : `<table><thead><tr><th>Sent</th><th>Article</th><th>Recipients</th><th>Status</th><th>Time</th><th>Error</th></tr></thead><tbody>${logRows}</tbody></table>`
      }
    </div>

    <!-- SETTINGS -->
    <div class="section">
      <div class="section-head"><span>Configuration</span><span class="hint">Live</span></div>
      <form method="POST" action="/settings">
        <div class="settings-grid">
          <div class="field"><label>Recipients</label><input type="text" name="recipients" value="${esc(settings.recipients)}" placeholder="email1,email2"></div>
          <div class="field"><label>From Address</label><input type="text" name="from_email" value="${esc(settings.from_email)}" placeholder="ielts@domain.com"></div>
          <div class="field"><label>Schedule (Cron)</label><input type="text" name="cron_schedule" value="${esc(settings.cron_schedule)}" placeholder="0 7 * * *"></div>
          <div class="field"><label>Timezone</label><input type="text" value="${esc(settings.cron_timezone || "UTC")}" disabled></div>
        </div>
        <div class="save-row"><button type="submit" class="btn-outline">Save Changes</button></div>
      </form>
    </div>

    <div class="footer-rule">&#x2727; &#x2727; &#x2727;</div>
    <div class="footer">Auto-refresh 30s &middot; <a href="/">Refresh</a></div>
  </div>
  <script>
    function getTheme(){return localStorage.getItem('theme')||'auto'}
    function applyTheme(){var t=getTheme(),h=document.documentElement;h.removeAttribute('data-theme');if(t==='dark')h.setAttribute('data-theme','dark');else if(t==='light')h.setAttribute('data-theme','light');updateIcon()}
    function isDark(){var t=getTheme();if(t==='dark')return true;if(t==='light')return false;return window.matchMedia('(prefers-color-scheme:dark)').matches}
    function updateIcon(){var b=document.getElementById('themeBtn');if(b)b.textContent=isDark()?'\\u2600':'\\u263E'}
    function toggleTheme(){var c=getTheme(),pd=window.matchMedia('(prefers-color-scheme:dark)').matches;var n=c==='auto'?(pd?'light':'dark'):c==='dark'?'light':'dark';localStorage.setItem('theme',n);applyTheme()}
    applyTheme();setTimeout(function(){location.reload()},30000);
  </script>
</body>
</html>`;
}

export default app;
