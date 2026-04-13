import type {
  Board,
  Exercise,
  ExerciseType,
  TopicQueueEntry,
  TopicHistoryEntry,
  AdminUserRow,
} from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  long_reading: "Long Reading",
  short_reading: "Short Reading",
  vocabulary: "Vocabulary",
  fill_gap: "Fill the Gap",
  writing_micro: "Writing Micro",
  mini_writing: "Mini Writing",
  word_search: "Word Search",
};

interface AdminData {
  todaysBoard: Board | null;
  exercises: Exercise[];
  emailSent: boolean;
  metrics: {
    activeUsersToday: number;
    avgCompletion: string;
    avgScore: string;
    activeStreaks: number;
  };
  users: AdminUserRow[];
  emailLogs: Array<{
    id: number;
    sent_at: string;
    topic?: string;
    board_date?: string;
    recipients: string;
    status: string;
    error?: string;
    duration_ms?: number;
  }>;
  settings: Record<string, string>;
  topics: TopicQueueEntry[];
  topicHistory: TopicHistoryEntry[];
  baseUrl: string;
}

function renderExercisePreview(exercise: Exercise): string {
  const content = JSON.parse(exercise.content);
  const type = exercise.type;
  let preview = "";

  if (type === "long_reading" || type === "short_reading") {
    const title = content.title || "Untitled";
    const passage = (content.passage || "").substring(0, 200);
    const qCount = content.questions?.length || 0;
    preview = `<strong>${esc(title)}</strong><br><span class="text-muted">${esc(passage)}${passage.length >= 200 ? "..." : ""}</span><br><span class="text-muted" style="font-size:12px">${qCount} questions</span>`;
  } else if (type === "vocabulary") {
    const words = (content.words || []).map((w: { word: string }) => w.word).join(", ");
    preview = `<strong>Words:</strong> ${esc(words)}`;
  } else if (type === "fill_gap") {
    const paragraph = (content.paragraph || "").substring(0, 200);
    const bankSize = content.word_bank?.length || 0;
    preview = `<span class="text-muted">${esc(paragraph)}${paragraph.length >= 200 ? "..." : ""}</span><br><span class="text-muted" style="font-size:12px">${bankSize} words in bank</span>`;
  } else if (type === "writing_micro") {
    const prompt = content.prompt || "";
    preview = `<strong>Prompt:</strong> ${esc(prompt)}`;
  }

  return preview;
}

const NAV_ITEMS = [
  { id: "today", label: "Today's Board", icon: "M4 6h16M4 12h16M4 18h16" },
  { id: "users", label: "Users", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { id: "topics", label: "Topics", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "email", label: "Email Log", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

function svgIcon(pathD: string): string {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${pathD}"/></svg>`;
}

export function renderAdminDashboard(data: AdminData): string {
  const {
    todaysBoard,
    exercises,
    emailSent,
    metrics,
    users,
    emailLogs,
    settings,
    topics,
    topicHistory,
    baseUrl,
  } = data;

  const todaySection = todaysBoard
    ? renderBoardExists(todaysBoard, exercises, emailSent, baseUrl)
    : renderNoBoard(topics);

  const metricsSection = `
    <div class="metrics-row">
      <div class="metric-card">
        <div class="metric-value">${metrics.activeUsersToday}</div>
        <div class="metric-label">Active Users Today</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${esc(metrics.avgCompletion)}</div>
        <div class="metric-label">Avg Completion</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${esc(metrics.avgScore)}</div>
        <div class="metric-label">Avg Daily Score</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics.activeStreaks}</div>
        <div class="metric-label">Active Streaks</div>
      </div>
    </div>`;

  const userRows = users.map((u) => {
    const streakDisplay = u.streak > 0 ? `<span class="streak-badge">${u.streak}d</span>` : `<span class="text-muted">0</span>`;
    const lastActive = u.lastActive || "Never";
    const completedDisplay = u.totalToday > 0 ? `${u.completedToday}/${u.totalToday}` : "&mdash;";
    return `<tr>
      <td>${esc(u.name)}</td>
      <td class="mono">${esc(u.email)}</td>
      <td>${streakDisplay}</td>
      <td>${esc(lastActive)}</td>
      <td class="mono">${completedDisplay}</td>
      <td class="mono">${u.totalExercises}</td>
      <td>
        <div class="action-dropdown">
          <button class="action-dropdown-btn" onclick="toggleDropdown(event)">Actions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="action-dropdown-menu">
            <a href="${esc(baseUrl)}/s/${esc(u.token)}" target="_blank" class="action-dropdown-item">View Dashboard</a>
            <div class="action-dropdown-divider"></div>
            <form method="POST" action="/admin/users/${u.id}/remove" onsubmit="return confirm('Remove ${esc(u.name)}?')">
              <button type="submit" class="action-dropdown-item danger">Remove</button>
            </form>
          </div>
        </div>
      </td>
    </tr>`;
  }).join("");

  const usersContent = `
    ${users.length === 0
      ? '<div class="empty-state">No users registered yet.</div>'
      : `<div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Streak</th><th>Last Active</th><th>Today</th><th>Total</th><th>Actions</th></tr></thead>
        <tbody>${userRows}</tbody>
      </table></div>`
    }
    <div class="section-footer">
      <form method="POST" action="/admin/users/add" class="inline-form">
        <input type="text" name="name" placeholder="Name" required>
        <input type="email" name="email" placeholder="Email" required>
        <button type="submit" class="btn btn-sm">Add User</button>
      </form>
    </div>`;

  const emailLogRows = emailLogs.map((l) => {
    const statusClass = l.status === "error" || l.status === "partial_failure" ? "badge-error" : "badge-success";
    const statusLabel = l.status === "sent" || l.status === "success" ? "Sent" : l.status === "partial_failure" ? "Partial" : "Failed";
    const duration = l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : "&mdash;";
    const recipientCount = l.recipients ? l.recipients.split(",").length : 0;
    const isFailed = l.status === "error" || l.status === "partial_failure";
    const actionsCell = isFailed
      ? `<td>
          <div class="action-dropdown">
            <button class="action-dropdown-btn" onclick="toggleDropdown(event)">Actions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
            <div class="action-dropdown-menu">
              <form method="POST" action="/admin/email">
                <button type="submit" class="action-dropdown-item">Resend</button>
              </form>
            </div>
          </div>
        </td>`
      : "<td></td>";
    return `<tr>
      <td class="mono">${esc(l.sent_at)}</td>
      <td>${l.topic ? esc(l.topic) : "&mdash;"}</td>
      <td class="mono">${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}</td>
      <td><span class="badge-pill ${statusClass}">${statusLabel}</span></td>
      <td class="mono">${duration}</td>
      ${actionsCell}
    </tr>`;
  }).join("");

  const emailContent = `
    ${emailLogs.length === 0
      ? '<div class="empty-state">No emails sent yet.</div>'
      : `<div class="table-wrap"><table>
        <thead><tr><th>Sent</th><th>Topic</th><th>Recipients</th><th>Status</th><th>Duration</th><th>Actions</th></tr></thead>
        <tbody>${emailLogRows}</tbody>
      </table></div>`
    }`;

  const difficultyOptions = ["B1", "B2", "C1"].map((d) =>
    `<option value="${d}"${settings.difficulty === d ? " selected" : ""}>${d}</option>`
  ).join("");

  const settingsContent = `
    <form method="POST" action="/admin/settings">
      <div class="settings-grid">
        <div class="field">
          <label>Recipients</label>
          <input type="text" name="recipients" value="${esc(settings.recipients || "")}" placeholder="email1@ex.com, email2@ex.com">
        </div>
        <div class="field">
          <label>From Email</label>
          <input type="text" name="from_email" value="${esc(settings.from_email || "")}" placeholder="ielts@domain.com">
        </div>
        <div class="field">
          <label>Cron Schedule</label>
          <input type="text" name="cron_schedule" value="${esc(settings.cron_schedule || "0 7 * * *")}" placeholder="0 7 * * *">
        </div>
        <div class="field">
          <label>Base URL</label>
          <input type="text" name="base_url" value="${esc(settings.base_url || "")}" placeholder="https://ielts-daily.fly.dev">
        </div>
        <div class="field">
          <label>Difficulty</label>
          <select name="difficulty">${difficultyOptions}</select>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn">Save Settings</button>
      </div>
    </form>`;

  const topicRows = topics.map((t) => {
    const lastUsed = t.last_used_on || "Never";
    const forcedBadge = t.forced_next ? '<span class="badge-pill badge-warning">Forced Next</span>' : "";
    return `<tr data-topic-id="${t.id}">
      <td class="mono" style="width:40px">${t.position}</td>
      <td>${esc(t.topic)} ${forcedBadge}</td>
      <td>${esc(lastUsed)}</td>
      <td class="mono">${t.times_used}</td>
      <td>
        <div class="action-dropdown">
          <button class="action-dropdown-btn" onclick="toggleDropdown(event)">Actions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="action-dropdown-menu">
            <form method="POST" action="/admin/topics/force">
              <input type="hidden" name="topicId" value="${t.id}">
              <button type="submit" class="action-dropdown-item">Force Next</button>
            </form>
            <div class="action-dropdown-divider"></div>
            <form method="POST" action="/admin/topics/remove" onsubmit="return confirm('Remove topic?')">
              <input type="hidden" name="topicId" value="${t.id}">
              <button type="submit" class="action-dropdown-item danger">Remove</button>
            </form>
          </div>
        </div>
      </td>
    </tr>`;
  }).join("");

  const topicHistoryRows = topicHistory.slice(0, 30).map((h) => `
    <tr>
      <td>${esc(h.used_on)}</td>
      <td>${esc(h.topic)}</td>
    </tr>
  `).join("");

  const topicsContent = `
    ${topics.length === 0
      ? '<div class="empty-state">No topics in queue.</div>'
      : `<div class="table-wrap"><table>
        <thead><tr><th>#</th><th>Topic</th><th>Last Used</th><th>Times Used</th><th>Actions</th></tr></thead>
        <tbody>${topicRows}</tbody>
      </table></div>`
    }
    <div class="section-footer">
      <form method="POST" action="/admin/topics/add" class="inline-form">
        <input type="text" name="topic" placeholder="New topic" required>
        <button type="submit" class="btn btn-sm">Add Topic</button>
      </form>
    </div>
    ${topicHistory.length > 0 ? `
    <div class="subsection">
      <h3>Topic History</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Topic</th></tr></thead>
        <tbody>${topicHistoryRows}</tbody>
      </table></div>
    </div>` : ""}`;

  const sidebar = NAV_ITEMS.map((item) =>
    `<button class="nav-item" data-section="${item.id}" onclick="showSection('${item.id}')">${svgIcon(item.icon)}<span>${item.label}</span></button>`
  ).join("\n        ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily &mdash; Admin</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    /* shadcn design tokens — light */
    :root{
      --admin-bg:#ffffff;
      --admin-card:#ffffff;
      --admin-border:#e2e8f0;
      --admin-muted:#f1f5f9;
      --admin-fg:#0f172a;
      --admin-muted-fg:#64748b;
      --admin-primary:#18181b;
      --admin-primary-fg:#ffffff;
      --admin-radius:8px;
      --admin-shadow:0 1px 3px rgba(0,0,0,0.1);
      --admin-font:Inter,system-ui,-apple-system,sans-serif;
      --admin-destructive:#dc2626;
      --admin-destructive-fg:#ffffff;
      --admin-success:#16a34a;
      --admin-success-bg:#dcfce7;
      --admin-success-fg:#166534;
      --admin-warning-bg:#fef9c3;
      --admin-warning-fg:#854d0e;
      --admin-error-bg:#fee2e2;
      --admin-error-fg:#991b1b;
      --admin-ring:#3b82f6;
    }

    /* shadcn design tokens — dark */
    [data-theme="dark"]{
      --admin-bg:#09090b;
      --admin-card:#18181b;
      --admin-border:#27272a;
      --admin-muted:#27272a;
      --admin-fg:#fafafa;
      --admin-muted-fg:#a1a1aa;
      --admin-primary:#fafafa;
      --admin-primary-fg:#18181b;
      --admin-shadow:0 1px 3px rgba(0,0,0,0.4);
      --admin-destructive:#ef4444;
      --admin-destructive-fg:#ffffff;
      --admin-success:#22c55e;
      --admin-success-bg:#14532d;
      --admin-success-fg:#86efac;
      --admin-warning-bg:#422006;
      --admin-warning-fg:#fde68a;
      --admin-error-bg:#450a0a;
      --admin-error-fg:#fca5a5;
      --admin-ring:#60a5fa;
    }

    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:var(--admin-font);background:var(--admin-bg);color:var(--admin-fg);min-height:100vh;font-size:14px;line-height:1.5}
    .text-muted{color:var(--admin-muted-fg)}

    /* Layout shell */
    .layout{display:grid;grid-template-columns:240px 1fr;grid-template-rows:auto 1fr;min-height:100vh}

    /* Topbar */
    .topbar{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:0 24px;height:52px;border-bottom:1px solid var(--admin-border);background:var(--admin-card);position:sticky;top:0;z-index:50}
    .topbar-left{display:flex;align-items:center;gap:12px}
    .topbar h1{font-size:15px;font-weight:700;letter-spacing:-0.3px;color:var(--admin-fg)}
    .topbar-right{display:flex;align-items:center;gap:12px}
    .topbar-date{font-size:12px;color:var(--admin-muted-fg);font-weight:500}
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;color:var(--admin-fg)}

    /* Dark mode toggle */
    .theme-toggle{background:none;border:1px solid var(--admin-border);border-radius:6px;padding:6px 8px;cursor:pointer;color:var(--admin-muted-fg);display:flex;align-items:center;transition:all .15s}
    .theme-toggle:hover{border-color:var(--admin-fg);color:var(--admin-fg)}

    /* Logout */
    .logout-btn{font-family:var(--admin-font);font-size:12px;font-weight:500;background:none;border:1px solid var(--admin-border);border-radius:6px;padding:6px 12px;cursor:pointer;color:var(--admin-muted-fg);transition:all .15s}
    .logout-btn:hover{border-color:var(--admin-destructive);color:var(--admin-destructive)}

    /* Sidebar */
    .sidebar{border-right:1px solid var(--admin-border);background:var(--admin-muted);padding:16px 12px;position:sticky;top:52px;height:calc(100vh - 52px);overflow-y:auto}
    .sidebar-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--admin-muted-fg);padding:8px 12px 6px;margin-top:8px}
    .sidebar-label:first-child{margin-top:0}
    .nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border:none;background:none;font-family:var(--admin-font);font-size:13px;font-weight:500;color:var(--admin-muted-fg);cursor:pointer;border-radius:6px;transition:all .12s;text-align:left}
    .nav-item:hover{background:var(--admin-card);color:var(--admin-fg)}
    .nav-item.active{background:var(--admin-card);color:var(--admin-fg);font-weight:600;box-shadow:var(--admin-shadow)}
    .nav-item svg{flex-shrink:0;color:var(--admin-muted-fg)}
    .nav-item.active svg{color:var(--admin-fg)}

    /* Main content */
    .main{padding:32px;overflow-y:auto;background:var(--admin-bg);min-width:0}
    .page-section{display:none}
    .page-section.active{display:block}
    .page-title{font-size:20px;font-weight:700;letter-spacing:-0.5px;margin-bottom:4px;color:var(--admin-fg)}
    .page-desc{font-size:13px;color:var(--admin-muted-fg);margin-bottom:24px}

    /* Cards */
    .card{background:var(--admin-card);border:1px solid var(--admin-border);border-radius:var(--admin-radius);box-shadow:var(--admin-shadow);margin-bottom:20px;overflow:hidden}
    .card-header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--admin-border);background:var(--admin-muted)}
    .card-header h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--admin-fg)}
    .card-body{padding:24px}
    .card-footer{padding:12px 20px;border-top:1px solid var(--admin-border);background:var(--admin-muted)}

    /* Badges — rounded-full pills */
    .badge{font-size:11px;font-weight:500;color:var(--admin-muted-fg);background:var(--admin-muted);padding:2px 10px;border-radius:9999px}
    .badge-pill{font-size:11px;font-weight:600;padding:2px 10px;border-radius:9999px;display:inline-block}
    .badge-success{background:var(--admin-success-bg);color:var(--admin-success-fg)}
    .badge-warning{background:var(--admin-warning-bg);color:var(--admin-warning-fg)}
    .badge-error{background:var(--admin-error-bg);color:var(--admin-error-fg)}
    .badge-live{background:var(--admin-success-bg);color:var(--admin-success-fg)}
    .badge-draft{background:var(--admin-warning-bg);color:var(--admin-warning-fg)}

    /* Metrics */
    .metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:0}
    .metric-card{background:var(--admin-card);border:1px solid var(--admin-border);border-radius:var(--admin-radius);padding:16px;text-align:center}
    .metric-value{font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:700;color:var(--admin-fg)}
    .metric-label{font-size:11px;color:var(--admin-muted-fg);margin-top:2px;text-transform:uppercase;letter-spacing:0.5px}

    /* Tables */
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--admin-muted-fg);border-bottom:1px solid var(--admin-border);background:var(--admin-muted)}
    td{padding:10px 16px;font-size:13px;border-bottom:1px solid var(--admin-border);color:var(--admin-fg)}
    tr:hover td{background:var(--admin-muted)}
    .mono{font-family:'JetBrains Mono',monospace;font-size:12px}

    /* Action dropdown */
    .action-dropdown{position:relative;display:inline-block}
    .action-dropdown-btn{background:var(--admin-card);border:1px solid var(--admin-border);border-radius:6px;padding:4px 10px;font-family:var(--admin-font);font-size:12px;font-weight:500;color:var(--admin-fg);cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .12s}
    .action-dropdown-btn:hover{border-color:var(--admin-fg);background:var(--admin-muted)}
    .action-dropdown-menu{display:none;position:absolute;right:0;top:calc(100% + 4px);min-width:160px;background:var(--admin-card);border:1px solid var(--admin-border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:30;padding:4px 0;overflow:hidden}
    .action-dropdown-menu.open{display:block}
    .action-dropdown-item{display:block;width:100%;padding:7px 14px;font-family:var(--admin-font);font-size:12px;font-weight:500;color:var(--admin-fg);background:none;border:none;cursor:pointer;text-align:left;text-decoration:none;transition:background .1s}
    .action-dropdown-item:hover{background:var(--admin-muted)}
    .action-dropdown-item.danger{color:var(--admin-destructive)}
    .action-dropdown-item.danger:hover{background:var(--admin-error-bg)}
    .action-dropdown-divider{height:1px;background:var(--admin-border);margin:4px 0}

    /* Streak badge */
    .streak-badge{background:var(--admin-warning-bg);color:var(--admin-warning-fg);font-size:12px;font-weight:600;padding:1px 8px;border-radius:9999px}

    /* Buttons */
    .btn{font-family:var(--admin-font);background:var(--admin-primary);color:var(--admin-primary-fg);border:none;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:6px;transition:background .15s}
    .btn:hover{opacity:0.9}
    .btn-sm{padding:6px 14px;font-size:12px}
    .btn-outline{background:transparent;color:var(--admin-fg);border:1px solid var(--admin-border);border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--admin-font);transition:all .15s}
    .btn-outline:hover{border-color:var(--admin-fg);background:var(--admin-muted)}
    .btn-danger{background:var(--admin-destructive);color:var(--admin-destructive-fg)}
    .btn-danger:hover{opacity:0.9}
    .btn-success{background:var(--admin-success);color:#fff}
    .btn-success:hover{opacity:0.9}

    /* Forms */
    .inline-form{display:flex;gap:8px;align-items:center}
    .inline-form input[type="text"],.inline-form input[type="email"]{font-family:var(--admin-font);border:1px solid var(--admin-border);padding:6px 12px;font-size:13px;border-radius:6px;outline:none;min-width:160px;background:var(--admin-card);color:var(--admin-fg)}
    .inline-form input:focus{border-color:var(--admin-ring);box-shadow:0 0 0 2px rgba(59,130,246,0.2)}
    .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .field{padding:16px 20px;border-bottom:1px solid var(--admin-border)}
    .field:nth-child(odd){border-right:1px solid var(--admin-border)}
    .field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--admin-muted-fg);margin-bottom:6px}
    .field input,.field select{width:100%;font-family:var(--admin-font);border:1px solid var(--admin-border);padding:8px 12px;font-size:13px;border-radius:6px;outline:none;background:var(--admin-card);color:var(--admin-fg);height:40px}
    .field input:focus,.field select:focus{border-color:var(--admin-ring);box-shadow:0 0 0 2px rgba(59,130,246,0.2)}
    .form-actions{padding:16px 20px;text-align:right;border-top:1px solid var(--admin-border)}
    .section-footer{padding:12px 20px;border-top:1px solid var(--admin-border);background:var(--admin-muted)}
    .subsection{border-top:1px solid var(--admin-border)}
    .subsection h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:12px 20px;background:var(--admin-muted);border-bottom:1px solid var(--admin-border);color:var(--admin-muted-fg)}

    /* Today's Edition */
    .edition-hero{background:var(--admin-card);border:1px solid var(--admin-border);border-radius:var(--admin-radius);box-shadow:var(--admin-shadow);margin-bottom:20px;overflow:hidden}
    .edition-header{padding:20px;background:var(--admin-muted);border-bottom:1px solid var(--admin-border)}
    .edition-topic{font-size:18px;font-weight:700;margin-bottom:4px;color:var(--admin-fg)}
    .edition-meta{font-size:12px;color:var(--admin-muted-fg)}
    .edition-body{padding:16px 20px}
    .exercise-cards{display:flex;flex-direction:column;gap:8px}
    .exercise-card{border:1px solid var(--admin-border);border-radius:6px;overflow:hidden;background:var(--admin-card)}
    .exercise-card-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;user-select:none}
    .exercise-card-header:hover{background:var(--admin-muted)}
    .exercise-type-badge{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:2px 10px;border-radius:9999px;background:var(--admin-muted);color:var(--admin-muted-fg)}
    .exercise-card-title{font-size:13px;font-weight:500;flex:1;margin:0 12px;color:var(--admin-fg)}
    .exercise-card-toggle{color:var(--admin-muted-fg);font-size:12px}
    .exercise-card-preview{padding:12px 16px;border-top:1px solid var(--admin-border);font-size:13px;line-height:1.6;display:none;background:var(--admin-muted);color:var(--admin-fg)}
    .exercise-card-preview.open{display:block}
    .exercise-card-actions{padding:8px 16px;border-top:1px solid var(--admin-border);display:none;background:var(--admin-muted)}
    .exercise-card-actions.open{display:flex;gap:8px}
    .edition-actions{display:flex;gap:8px;padding:16px 20px;border-top:1px solid var(--admin-border);flex-wrap:wrap}

    /* No board state */
    .no-board{padding:48px 20px;text-align:center}
    .no-board p{color:var(--admin-muted-fg);margin-bottom:16px}
    .generate-form{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}
    .generate-form select{font-family:var(--admin-font);border:1px solid var(--admin-border);padding:8px 12px;font-size:13px;border-radius:6px;outline:none;background:var(--admin-card);color:var(--admin-fg)}

    /* Empty state */
    .empty-state{text-align:center;padding:32px;color:var(--admin-muted-fg);font-style:italic}

    /* Toast */
    .toast{position:fixed;top:64px;right:16px;background:var(--admin-primary);color:var(--admin-primary-fg);padding:12px 20px;border-radius:6px;font-size:13px;font-weight:500;z-index:100;display:none;animation:fadeIn .3s}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

    /* Mobile overlay */
    .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:40}
    .sidebar-overlay.open{display:block}

    /* Responsive */
    @media(max-width:768px){
      .layout{grid-template-columns:1fr}
      .sidebar{display:none;position:fixed;top:52px;left:0;width:260px;height:calc(100vh - 52px);z-index:45;box-shadow:4px 0 12px rgba(0,0,0,0.1)}
      .sidebar.open{display:block}
      .hamburger{display:flex}
      .main{padding:20px 16px}
      .metrics-row{grid-template-columns:repeat(2,1fr)}
      .settings-grid{grid-template-columns:1fr}
      .field{border-right:none!important}
      .edition-actions{flex-direction:column}
      .inline-form{flex-wrap:wrap}
    }
  </style>
</head>
<body>
  <script>
    // Apply saved theme immediately to prevent flash
    (function(){var t=localStorage.getItem('admin-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.setAttribute('data-theme','dark');})();
  </script>
  <div class="layout">
    <!-- Topbar -->
    <div class="topbar">
      <div class="topbar-left">
        <button class="hamburger" onclick="toggleSidebar()" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <h1>IELTS Daily Admin</h1>
      </div>
      <div class="topbar-right">
        <span class="topbar-date">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
        <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode" title="Toggle dark mode">
          <svg class="theme-icon-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg class="theme-icon-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
        </button>
        <form method="POST" action="/admin/logout" style="margin:0">
          <button type="submit" class="logout-btn">Logout</button>
        </form>
      </div>
    </div>

    <!-- Sidebar -->
    <nav class="sidebar" id="sidebar">
      <div class="sidebar-label">Navigation</div>
      ${sidebar}
    </nav>

    <!-- Overlay for mobile -->
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>

    <!-- Main content -->
    <main class="main">
      <!-- Today's Board -->
      <div class="page-section active" id="section-today">
        <div class="page-title">Today's Board</div>
        <div class="page-desc">Manage today's edition and exercises</div>
        ${todaySection}
        <div class="card">
          <div class="card-header"><h2>Readership</h2></div>
          <div class="card-body">${metricsSection}</div>
        </div>
      </div>

      <!-- Users -->
      <div class="page-section" id="section-users">
        <div class="page-title">Users</div>
        <div class="page-desc">Manage student accounts and monitor engagement</div>
        <div class="card">
          <div class="card-header">
            <h2>All Users</h2>
            <span class="badge">${users.length} users</span>
          </div>
          ${usersContent}
        </div>
      </div>

      <!-- Topics -->
      <div class="page-section" id="section-topics">
        <div class="page-title">Topics</div>
        <div class="page-desc">Editorial calendar and topic rotation</div>
        <div class="card">
          <div class="card-header">
            <h2>Topic Queue</h2>
            <span class="badge">${topics.length} topics</span>
          </div>
          ${topicsContent}
        </div>
      </div>

      <!-- Email Log -->
      <div class="page-section" id="section-email">
        <div class="page-title">Email Log</div>
        <div class="page-desc">History of sent emails and delivery status</div>
        <div class="card">
          <div class="card-header">
            <h2>Recent Emails</h2>
            <span class="badge">Last 30</span>
          </div>
          ${emailContent}
        </div>
      </div>

      <!-- Settings -->
      <div class="page-section" id="section-settings">
        <div class="page-title">Settings</div>
        <div class="page-desc">Application configuration</div>
        <div class="card">
          <div class="card-header"><h2>General</h2></div>
          ${settingsContent}
        </div>
      </div>
    </main>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    // Dark mode toggle
    function toggleTheme() {
      var html = document.documentElement;
      var isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('admin-theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('admin-theme', 'dark');
      }
      updateThemeIcons();
    }
    function updateThemeIcons() {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var lightIcon = document.querySelector('.theme-icon-light');
      var darkIcon = document.querySelector('.theme-icon-dark');
      if (lightIcon) lightIcon.style.display = isDark ? 'none' : 'block';
      if (darkIcon) darkIcon.style.display = isDark ? 'block' : 'none';
    }
    updateThemeIcons();

    // Action dropdown toggle
    function toggleDropdown(e) {
      e.stopPropagation();
      var menu = e.currentTarget.nextElementSibling;
      document.querySelectorAll('.action-dropdown-menu.open').forEach(function(m) {
        if (m !== menu) m.classList.remove('open');
      });
      menu.classList.toggle('open');
    }
    document.addEventListener('click', function() {
      document.querySelectorAll('.action-dropdown-menu.open').forEach(function(m) {
        m.classList.remove('open');
      });
    });

    // Section navigation
    function showSection(id) {
      document.querySelectorAll('.page-section').forEach(function(s) { s.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
      var section = document.getElementById('section-' + id);
      var navBtn = document.querySelector('.nav-item[data-section="' + id + '"]');
      if (section) section.classList.add('active');
      if (navBtn) navBtn.classList.add('active');
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('sidebarOverlay');
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }

    // Set initial active nav
    document.querySelector('.nav-item[data-section="today"]').classList.add('active');

    // Mobile sidebar toggle
    function toggleSidebar() {
      var sidebar = document.getElementById('sidebar');
      var overlay = document.getElementById('sidebarOverlay');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open');
    }

    // Toggle exercise card previews
    document.querySelectorAll('.exercise-card-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var card = this.closest('.exercise-card');
        var preview = card.querySelector('.exercise-card-preview');
        var actions = card.querySelector('.exercise-card-actions');
        var toggle = this.querySelector('.exercise-card-toggle');
        if (preview) {
          preview.classList.toggle('open');
          if (actions) actions.classList.toggle('open');
          if (toggle) toggle.textContent = preview.classList.contains('open') ? 'Collapse' : 'Expand';
        }
      });
    });

    // Toast from URL params
    var params = new URLSearchParams(window.location.search);
    if (params.get('msg')) {
      var toast = document.getElementById('toast');
      toast.textContent = decodeURIComponent(params.get('msg'));
      toast.style.display = 'block';
      setTimeout(function() { toast.style.display = 'none'; }, 3000);
    }
  </script>
</body>
</html>`;
}

function renderBoardExists(board: Board, exercises: Exercise[], emailSent: boolean, baseUrl: string): string {
  const statusBadge = emailSent
    ? '<span class="badge-pill badge-live">Live</span>'
    : '<span class="badge-pill badge-draft">Draft</span>';

  const exerciseCards = exercises.map((ex) => {
    const typeLabel = EXERCISE_TYPE_LABELS[ex.type] || ex.type;
    const preview = renderExercisePreview(ex);
    return `
    <div class="exercise-card">
      <div class="exercise-card-header">
        <span class="exercise-type-badge">${esc(typeLabel)}</span>
        <span class="exercise-card-title">Slot ${ex.slot} &middot; Max ${ex.max_score}pts</span>
        <span class="exercise-card-toggle">Expand</span>
      </div>
      <div class="exercise-card-preview">${preview}</div>
      <div class="exercise-card-actions">
        <form method="POST" action="/admin/exercise/${ex.id}/regenerate" style="display:inline">
          <button type="submit" class="btn-outline btn-sm" onclick="this.textContent='Regenerating...'">Regenerate</button>
        </form>
      </div>
    </div>`;
  }).join("");

  return `
  <div class="edition-hero">
    <div class="edition-header">
      <div class="edition-topic">Today: ${esc(board.topic)} ${statusBadge}</div>
      <div class="edition-meta">Board #${board.id} &middot; ${esc(board.date)}</div>
    </div>
    <div class="edition-body">
      <div class="exercise-cards">
        ${exercises.length === 0 ? '<div class="empty-state">No exercises generated yet.</div>' : exerciseCards}
      </div>
    </div>
    <div class="edition-actions">
      <form method="POST" action="/admin/regenerate" style="display:inline">
        <button type="submit" class="btn-outline" onclick="this.textContent='Regenerating...'">Regenerate All</button>
      </form>
      <form method="POST" action="/admin/generate" style="display:inline">
        <input type="hidden" name="newTopic" value="true">
        <button type="submit" class="btn-outline" onclick="this.textContent='Generating...'">Regenerate with New Topic</button>
      </form>
      <form method="POST" action="/admin/email" style="display:inline">
        <button type="submit" class="btn${emailSent ? "-outline" : " btn-success"}" onclick="this.textContent='Sending...'">${emailSent ? "Resend Email" : "Send Email"}</button>
      </form>
    </div>
  </div>`;
}

function renderNoBoard(topics: AdminData["topics"]): string {
  const topicOptions = topics
    .filter(t => !t.last_used_on)
    .map(t => `<option value="${esc(t.topic)}">${esc(t.topic)}</option>`)
    .join("");
  return `
  <div class="edition-hero">
    <div class="no-board">
      <p>No board generated for today yet.</p>
      <div class="generate-form">
        <form method="POST" action="/admin/generate" class="inline-form">
          <select name="topic">
            <option value="">Random Topic</option>
            ${topicOptions}
          </select>
          <button type="submit" class="btn btn-success" onclick="this.textContent='Generating...'">Generate Today's Board</button>
        </form>
      </div>
    </div>
  </div>`;
}
