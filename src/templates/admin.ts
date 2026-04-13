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
  hangman: "Hangman",
  number_words: "Numbers in Words",
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
  } else if (type === "word_search") {
    const grid = (content.grid || []) as string[][];
    const words = (content.words || []) as Array<{ word: string; startRow: number; startCol: number; direction: string }>;
    const WORD_COLORS = ["#E8F4E8", "#E8F0F8", "#F8F0E8", "#F0E8F8"];
    const BORDER_COLORS = ["#2D6A4F", "#1a4a7a", "#7a4a1a", "#4a1a7a"];
    const cellHighlight: Record<string, string> = {};
    words.forEach((w, i) => {
      const letters = w.word.toLowerCase().replace(/[^a-z]/g, "");
      for (let j = 0; j < letters.length; j++) {
        const r = w.direction === "horizontal" ? w.startRow : w.startRow + j;
        const c = w.direction === "horizontal" ? w.startCol + j : w.startCol;
        cellHighlight[`${r},${c}`] = WORD_COLORS[i % WORD_COLORS.length];
      }
    });
    const gridRows = grid.map((row, ri) =>
      `<tr>${row.map((cell, ci) => {
        const bg = cellHighlight[`${ri},${ci}`];
        return `<td style="width:18px;height:18px;text-align:center;font-size:10px;font-family:'JetBrains Mono',monospace;padding:0;border:1px solid #e2e8f0;${bg ? `background:${bg}` : ""}">${esc(cell.toUpperCase())}</td>`;
      }).join("")}</tr>`
    ).join("");
    const wordTags = words.map((w, i) =>
      `<span style="background:${WORD_COLORS[i % WORD_COLORS.length]};border:1px solid ${BORDER_COLORS[i % BORDER_COLORS.length]};font-size:11px;font-weight:600;padding:1px 8px;border-radius:4px;margin-right:4px">${esc(w.word.toUpperCase())}</span>`
    ).join("");
    preview = `<table style="border-collapse:collapse;margin-bottom:8px">${gridRows}</table><div>${wordTags}</div>`;
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
    ? renderBoardExists(todaysBoard, exercises, emailSent, baseUrl, topics)
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
    return `<tr onclick="window.location='/admin/users/${u.id}/detail'" style="cursor:pointer">
      <td>${esc(u.name)}</td>
      <td class="mono">${esc(u.email)}</td>
      <td>${streakDisplay}</td>
      <td>${esc(lastActive)}</td>
      <td class="mono">${completedDisplay}</td>
      <td class="mono">${u.totalExercises}</td>
      <td onclick="event.stopPropagation()">
        <div class="action-dropdown">
          <button class="action-dropdown-btn" onclick="toggleDropdown(event)">Actions <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
          <div class="action-dropdown-menu">
            <a href="/admin/users/${u.id}/detail" class="action-dropdown-item">Ver detalle &rarr;</a>
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
    /* ── Design tokens ── */
    :root{
      --g-bg:#06060f;
      --g-card:rgba(255,255,255,0.05);
      --g-card-hover:rgba(255,255,255,0.08);
      --g-border:rgba(255,255,255,0.09);
      --g-border-bright:rgba(255,255,255,0.18);
      --g-muted:rgba(255,255,255,0.04);
      --g-fg:#f0f0ff;
      --g-muted-fg:rgba(220,220,255,0.55);
      --g-accent:#a78bfa;
      --g-accent2:#38bdf8;
      --g-radius:12px;
      --g-font:Inter,system-ui,-apple-system,sans-serif;
      --g-destructive:#f87171;
      --g-success:#34d399;
      --g-warning:#fbbf24;
      --g-blur:blur(20px);
      --g-shadow:0 8px 32px rgba(0,0,0,0.45);
      --g-shadow-sm:0 2px 12px rgba(0,0,0,0.35);

      /* legacy aliases used in non-redesigned helpers */
      --admin-bg:var(--g-bg);
      --admin-card:rgba(255,255,255,0.06);
      --admin-border:var(--g-border);
      --admin-muted:rgba(255,255,255,0.04);
      --admin-fg:var(--g-fg);
      --admin-muted-fg:var(--g-muted-fg);
      --admin-primary:#a78bfa;
      --admin-primary-fg:#06060f;
      --admin-radius:var(--g-radius);
      --admin-shadow:var(--g-shadow-sm);
      --admin-font:var(--g-font);
      --admin-destructive:var(--g-destructive);
      --admin-destructive-fg:#fff;
      --admin-success:var(--g-success);
      --admin-success-bg:rgba(52,211,153,0.12);
      --admin-success-fg:#34d399;
      --admin-warning-bg:rgba(251,191,36,0.12);
      --admin-warning-fg:#fbbf24;
      --admin-error-bg:rgba(248,113,113,0.12);
      --admin-error-fg:#f87171;
      --admin-ring:#a78bfa;
    }

    /* ── Reset ── */
    *{box-sizing:border-box;margin:0;padding:0}

    /* ── Animated blob background ── */
    body{
      font-family:var(--g-font);
      background:var(--g-bg);
      color:var(--g-fg);
      min-height:100vh;
      font-size:14px;
      line-height:1.5;
      overflow-x:hidden;
    }
    .blobs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
    .blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:0.55;will-change:transform}
    .blob-1{width:700px;height:700px;background:radial-gradient(circle,#6d28d9 0%,transparent 70%);top:-15%;left:-10%;animation:blobFloat1 22s ease-in-out infinite alternate}
    .blob-2{width:600px;height:600px;background:radial-gradient(circle,#0e7490 0%,transparent 70%);bottom:-10%;right:-8%;animation:blobFloat2 18s ease-in-out infinite alternate}
    .blob-3{width:450px;height:450px;background:radial-gradient(circle,#9f1239 0%,transparent 70%);top:30%;right:15%;animation:blobFloat3 26s ease-in-out infinite alternate;opacity:0.35}
    .blob-4{width:350px;height:350px;background:radial-gradient(circle,#1e40af 0%,transparent 70%);bottom:20%;left:20%;animation:blobFloat4 20s ease-in-out infinite alternate;opacity:0.4}
    @keyframes blobFloat1{0%{transform:translate(0,0) scale(1)}50%{transform:translate(60px,-40px) scale(1.08)}100%{transform:translate(-30px,70px) scale(0.93)}}
    @keyframes blobFloat2{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,30px) scale(1.06)}100%{transform:translate(40px,-60px) scale(0.96)}}
    @keyframes blobFloat3{0%{transform:translate(0,0) scale(1)}33%{transform:translate(-40px,50px) scale(1.1)}66%{transform:translate(30px,-30px) scale(0.9)}100%{transform:translate(-20px,20px) scale(1.04)}}
    @keyframes blobFloat4{0%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,40px) scale(1.05)}100%{transform:translate(-40px,-30px) scale(0.97)}}

    /* ── Layout shell ── */
    .layout{display:grid;grid-template-columns:240px 1fr;grid-template-rows:auto 1fr;min-height:100vh;position:relative;z-index:1}
    .text-muted{color:var(--g-muted-fg)}

    /* ── Glass mixin (shared) ── */
    .glass{background:var(--g-card);backdrop-filter:var(--g-blur);-webkit-backdrop-filter:var(--g-blur);border:1px solid var(--g-border)}

    /* ── Topbar ── */
    .topbar{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:0 24px;height:54px;background:rgba(6,6,15,0.7);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid var(--g-border);position:sticky;top:0;z-index:50}
    .topbar-left{display:flex;align-items:center;gap:12px}
    .topbar h1{font-size:15px;font-weight:700;letter-spacing:-0.3px;background:linear-gradient(135deg,#c4b5fd,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .topbar-right{display:flex;align-items:center;gap:10px}
    .topbar-date{font-size:12px;color:var(--g-muted-fg);font-weight:500}
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:4px;color:var(--g-fg)}

    /* ── Theme toggle & logout ── */
    .theme-toggle{background:var(--g-card);backdrop-filter:var(--g-blur);border:1px solid var(--g-border);border-radius:8px;padding:6px 8px;cursor:pointer;color:var(--g-muted-fg);display:flex;align-items:center;transition:all .15s}
    .theme-toggle:hover{border-color:var(--g-border-bright);color:var(--g-fg)}
    .logout-btn{font-family:var(--g-font);font-size:12px;font-weight:500;background:var(--g-card);backdrop-filter:var(--g-blur);border:1px solid var(--g-border);border-radius:8px;padding:6px 12px;cursor:pointer;color:var(--g-muted-fg);transition:all .15s}
    .logout-btn:hover{border-color:var(--g-destructive);color:var(--g-destructive)}

    /* ── Sidebar ── */
    .sidebar{background:rgba(6,6,15,0.55);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-right:1px solid var(--g-border);padding:16px 12px;position:sticky;top:54px;height:calc(100vh - 54px);overflow-y:auto}
    .sidebar-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--g-muted-fg);padding:8px 12px 6px;margin-top:8px}
    .sidebar-label:first-child{margin-top:0}
    .nav-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px;border:none;background:none;font-family:var(--g-font);font-size:13px;font-weight:500;color:var(--g-muted-fg);cursor:pointer;border-radius:8px;transition:all .15s;text-align:left}
    .nav-item:hover{background:rgba(255,255,255,0.07);color:var(--g-fg)}
    .nav-item.active{background:linear-gradient(135deg,rgba(167,139,250,0.18),rgba(56,189,248,0.1));color:var(--g-fg);font-weight:600;border:1px solid rgba(167,139,250,0.25);box-shadow:0 0 12px rgba(167,139,250,0.1)}
    .nav-item svg{flex-shrink:0}
    .nav-item.active svg{color:var(--g-accent)}

    /* ── Main content ── */
    .main{padding:32px;overflow-y:auto;min-width:0;background:transparent}
    .page-section{display:none}
    .page-section.active{display:block}
    .page-title{font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:4px;background:linear-gradient(135deg,#f0f0ff,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .page-desc{font-size:13px;color:var(--g-muted-fg);margin-bottom:24px}

    /* ── Glass cards ── */
    .card{background:var(--g-card);backdrop-filter:var(--g-blur);-webkit-backdrop-filter:var(--g-blur);border:1px solid var(--g-border);border-radius:var(--g-radius);box-shadow:var(--g-shadow);margin-bottom:20px;overflow:hidden;transition:border-color .2s}
    .card:hover{border-color:var(--g-border-bright)}
    .card-header{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid var(--g-border);background:rgba(255,255,255,0.03)}
    .card-header h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--g-accent)}
    .card-body{padding:24px}
    .card-footer{padding:12px 20px;border-top:1px solid var(--g-border);background:rgba(255,255,255,0.02)}

    /* ── Badges ── */
    .badge{font-size:11px;font-weight:500;color:var(--g-muted-fg);background:rgba(255,255,255,0.07);padding:2px 10px;border-radius:9999px;border:1px solid var(--g-border)}
    .badge-pill{font-size:11px;font-weight:600;padding:2px 10px;border-radius:9999px;display:inline-block}
    .badge-success{background:var(--admin-success-bg);color:var(--admin-success-fg)}
    .badge-warning{background:var(--admin-warning-bg);color:var(--admin-warning-fg)}
    .badge-error{background:var(--admin-error-bg);color:var(--admin-error-fg)}
    .badge-live{background:rgba(52,211,153,0.15);color:#34d399;border:1px solid rgba(52,211,153,0.3)}
    .badge-draft{background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3)}

    /* ── Metrics ── */
    .metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:0}
    .metric-card{background:var(--g-card);backdrop-filter:var(--g-blur);-webkit-backdrop-filter:var(--g-blur);border:1px solid var(--g-border);border-radius:var(--g-radius);padding:20px 16px;text-align:center;position:relative;overflow:hidden;transition:transform .2s,border-color .2s}
    .metric-card:hover{transform:translateY(-2px);border-color:var(--g-border-bright)}
    .metric-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(167,139,250,0.06) 0%,transparent 60%);pointer-events:none}
    .metric-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:linear-gradient(135deg,#f0f0ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .metric-label{font-size:10px;color:var(--g-muted-fg);margin-top:4px;text-transform:uppercase;letter-spacing:1px;font-weight:600}

    /* ── Tables ── */
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 16px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--g-accent);border-bottom:1px solid var(--g-border);background:rgba(167,139,250,0.05)}
    td{padding:10px 16px;font-size:13px;border-bottom:1px solid var(--g-border);color:var(--g-fg)}
    tr:hover td{background:rgba(255,255,255,0.04)}
    .mono{font-family:'JetBrains Mono',monospace;font-size:12px}

    /* ── Action dropdown ── */
    .action-dropdown{position:relative;display:inline-block}
    .action-dropdown-btn{background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);border:1px solid var(--g-border);border-radius:8px;padding:4px 10px;font-family:var(--g-font);font-size:12px;font-weight:500;color:var(--g-fg);cursor:pointer;display:flex;align-items:center;gap:4px;transition:all .15s}
    .action-dropdown-btn:hover{border-color:var(--g-border-bright);background:rgba(255,255,255,0.1)}
    .action-dropdown-menu{display:none;position:fixed;min-width:165px;background:rgba(15,10,35,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid var(--g-border-bright);border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,0.6);z-index:300;padding:4px}
    .action-dropdown-menu.open{display:block}
    .action-dropdown-item{display:block;width:100%;padding:7px 12px;font-family:var(--g-font);font-size:12px;font-weight:500;color:var(--g-fg);background:none;border:none;cursor:pointer;text-align:left;text-decoration:none;transition:background .1s;border-radius:7px}
    .action-dropdown-item:hover{background:rgba(167,139,250,0.15);color:#c4b5fd}
    .action-dropdown-item.danger{color:var(--g-destructive)}
    .action-dropdown-item.danger:hover{background:rgba(248,113,113,0.12)}
    .action-dropdown-divider{height:1px;background:var(--g-border);margin:4px 0}

    /* ── Streak badge ── */
    .streak-badge{background:rgba(251,191,36,0.15);color:#fbbf24;font-size:12px;font-weight:600;padding:1px 8px;border-radius:9999px;border:1px solid rgba(251,191,36,0.3)}

    /* ── Buttons ── */
    .btn{font-family:var(--g-font);background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;border:none;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;transition:opacity .15s,transform .1s;box-shadow:0 4px 16px rgba(124,58,237,0.35)}
    .btn:hover{opacity:0.88;transform:translateY(-1px)}
    .btn:disabled{opacity:.4;cursor:default;transform:none}
    .btn-sm{padding:5px 13px;font-size:12px}
    .btn-outline{background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);color:var(--g-fg);border:1px solid var(--g-border);border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--g-font);transition:all .15s}
    .btn-outline:hover{border-color:var(--g-border-bright);background:rgba(255,255,255,0.1)}
    .btn-outline:disabled{opacity:.4;cursor:default}
    .btn-danger{background:linear-gradient(135deg,#dc2626,#9f1239);color:#fff;box-shadow:0 4px 16px rgba(220,38,38,0.3)}
    .btn-success{background:linear-gradient(135deg,#059669,#0891b2);color:#fff;box-shadow:0 4px 16px rgba(5,150,105,0.3)}
    .btn-success:hover{opacity:.88}

    /* ── Forms ── */
    .inline-form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .inline-form input[type="text"],.inline-form input[type="email"]{font-family:var(--g-font);border:1px solid var(--g-border);padding:6px 12px;font-size:13px;border-radius:8px;outline:none;min-width:160px;background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);color:var(--g-fg)}
    .inline-form input:focus{border-color:var(--g-accent);box-shadow:0 0 0 2px rgba(167,139,250,0.2)}
    .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .field{padding:16px 20px;border-bottom:1px solid var(--g-border)}
    .field:nth-child(odd){border-right:1px solid var(--g-border)}
    .field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--g-muted-fg);margin-bottom:6px}
    .field input,.field select{width:100%;font-family:var(--g-font);border:1px solid var(--g-border);padding:8px 12px;font-size:13px;border-radius:8px;outline:none;background:rgba(255,255,255,0.06);color:var(--g-fg);height:40px}
    .field input:focus,.field select:focus{border-color:var(--g-accent);box-shadow:0 0 0 2px rgba(167,139,250,0.2)}
    .form-actions{padding:16px 20px;text-align:right;border-top:1px solid var(--g-border)}
    .section-footer{padding:12px 20px;border-top:1px solid var(--g-border);background:rgba(255,255,255,0.02)}
    .subsection{border-top:1px solid var(--g-border)}
    .subsection h3{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:12px 20px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--g-border);color:var(--g-accent)}

    /* ── Today's Edition ── */
    .edition-hero{background:var(--g-card);backdrop-filter:var(--g-blur);-webkit-backdrop-filter:var(--g-blur);border:1px solid var(--g-border);border-radius:var(--g-radius);box-shadow:var(--g-shadow);margin-bottom:20px;overflow:hidden}
    .edition-header{padding:20px 24px;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(14,116,144,0.08));border-bottom:1px solid var(--g-border)}
    .edition-topic{font-size:19px;font-weight:700;margin-bottom:4px;color:var(--g-fg);letter-spacing:-0.3px}
    .edition-meta{font-size:12px;color:var(--g-muted-fg)}
    .edition-body{padding:16px 20px}
    .exercise-cards{display:flex;flex-direction:column;gap:8px}
    .exercise-card{border:1px solid var(--g-border);border-radius:10px;overflow:hidden;background:rgba(255,255,255,0.03);transition:border-color .15s}
    .exercise-card:hover{border-color:var(--g-border-bright)}
    .exercise-card-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;user-select:none}
    .exercise-card-header:hover{background:rgba(255,255,255,0.04)}
    .exercise-type-badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:3px 10px;border-radius:9999px;background:rgba(167,139,250,0.12);color:var(--g-accent);border:1px solid rgba(167,139,250,0.2)}
    .exercise-card-title{font-size:13px;font-weight:500;flex:1;margin:0 12px;color:var(--g-fg)}
    .exercise-card-toggle{color:var(--g-muted-fg);font-size:12px}
    .exercise-card-preview{padding:12px 16px;border-top:1px solid var(--g-border);font-size:13px;line-height:1.6;display:none;background:rgba(255,255,255,0.02);color:var(--g-fg)}
    .exercise-card-preview.open{display:block}
    .exercise-card-actions{padding:8px 16px;border-top:1px solid var(--g-border);display:none;background:rgba(255,255,255,0.02)}
    .exercise-card-actions.open{display:flex;gap:8px}
    .edition-actions{display:flex;gap:8px;padding:16px 20px;border-top:1px solid var(--g-border);flex-wrap:wrap;align-items:center;background:rgba(255,255,255,0.02)}
    .regen-panel{display:none;padding:20px;border-top:1px solid var(--g-border);background:rgba(124,58,237,0.06)}
    .regen-panel.open{display:block}
    .regen-form{display:flex;flex-direction:column;gap:14px;max-width:480px}
    .regen-field{display:flex;flex-direction:column;gap:5px}
    .regen-label{font-size:11px;font-weight:700;color:var(--g-accent);text-transform:uppercase;letter-spacing:.08em}
    .regen-select,.regen-input{font-family:var(--g-font);font-size:13px;padding:9px 12px;border:1px solid var(--g-border);border-radius:8px;background:rgba(255,255,255,0.06);color:var(--g-fg);outline:none;width:100%;box-sizing:border-box}
    .regen-select:focus,.regen-input:focus{border-color:var(--g-accent);box-shadow:0 0 0 2px rgba(167,139,250,0.2)}
    .regen-actions{display:flex;gap:8px}
    .regen-select option,.regen-select optgroup{background:#130e2a;color:var(--g-fg)}

    /* ── No board state ── */
    .no-board{padding:52px 20px;text-align:center}
    .no-board p{color:var(--g-muted-fg);margin-bottom:20px;font-size:15px}
    .generate-form{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}
    .generate-form select{font-family:var(--g-font);border:1px solid var(--g-border);padding:8px 12px;font-size:13px;border-radius:8px;outline:none;background:rgba(255,255,255,0.06);color:var(--g-fg)}

    /* ── Empty state ── */
    .empty-state{text-align:center;padding:36px;color:var(--g-muted-fg);font-style:italic}

    /* ── Toast ── */
    .toast{position:fixed;top:68px;right:16px;background:linear-gradient(135deg,rgba(124,58,237,0.9),rgba(37,99,235,0.9));backdrop-filter:blur(16px);color:#fff;padding:12px 20px;border-radius:10px;border:1px solid rgba(167,139,250,0.4);font-size:13px;font-weight:500;z-index:200;display:none;animation:fadeSlideIn .3s cubic-bezier(.34,1.56,.64,1)}
    @keyframes fadeSlideIn{from{opacity:0;transform:translateY(-12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}

    /* ── Sidebar overlay ── */
    .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:40;backdrop-filter:blur(4px)}
    .sidebar-overlay.open{display:block}

    /* ── Responsive ── */
    @media(max-width:768px){
      .layout{grid-template-columns:1fr}
      .sidebar{display:none;position:fixed;top:54px;left:0;width:260px;height:calc(100vh - 54px);z-index:45;box-shadow:8px 0 32px rgba(0,0,0,0.6)}
      .sidebar.open{display:block}
      .hamburger{display:flex}
      .main{padding:20px 16px}
      .metrics-row{grid-template-columns:repeat(2,1fr)}
      .settings-grid{grid-template-columns:1fr}
      .field{border-right:none!important}
      .edition-actions{flex-direction:column}
    }
  </style>
</head>
<body>
  <div class="blobs" aria-hidden="true">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
    <div class="blob blob-4"></div>
  </div>
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

    // Action dropdown toggle — uses position:fixed to escape overflow:auto table wrappers
    function toggleDropdown(e) {
      e.stopPropagation();
      var btn = e.currentTarget;
      var menu = btn.nextElementSibling;
      var isOpen = menu.classList.contains('open');
      document.querySelectorAll('.action-dropdown-menu.open').forEach(function(m) { m.classList.remove('open'); });
      if (!isOpen) {
        var rect = btn.getBoundingClientRect();
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.classList.add('open');
      }
    }
    document.addEventListener('click', function() {
      document.querySelectorAll('.action-dropdown-menu.open').forEach(function(m) { m.classList.remove('open'); });
    });

    // Section navigation
    function showSection(id, pushHash) {
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
      if (pushHash !== false) history.replaceState(null, '', '#' + id);
    }

    // Restore section from hash, fallback to "today"
    var initialSection = (location.hash.slice(1)) || 'today';
    var validSections = ['today','users','email','topics','settings'];
    if (validSections.indexOf(initialSection) === -1) initialSection = 'today';
    showSection(initialSection, false);

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

    // Board generation/regeneration via fetch (no page navigation)
    var spinnerFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
    function boardFetch(url, body, statusEl, btnEl, btnLabel) {
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Working…'; }
      if (statusEl) { statusEl.style.display = 'inline'; }
      var spinIdx = 0;
      var spinTimer = statusEl ? setInterval(function() {
        spinIdx = (spinIdx + 1) % spinnerFrames.length;
        statusEl.textContent = spinnerFrames[spinIdx] + ' Generating board… this takes ~30s';
      }, 80) : null;
      if (statusEl) statusEl.textContent = spinnerFrames[0] + ' Generating board… this takes ~30s';

      var fd = new FormData();
      Object.keys(body).forEach(function(k) { fd.append(k, body[k]); });
      fetch(url, { method: 'POST', body: fd })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (spinTimer) clearInterval(spinTimer);
          if (d.ok) {
            if (statusEl) statusEl.textContent = '✓ Done! Reloading…';
            setTimeout(function() { window.location.reload(); }, 800);
          } else {
            if (statusEl) { statusEl.style.color = 'var(--admin-destructive)'; statusEl.textContent = '✗ Error: ' + (d.error || 'Unknown error'); }
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnLabel; }
          }
        })
        .catch(function(err) {
          if (spinTimer) clearInterval(spinTimer);
          if (statusEl) { statusEl.style.color = 'var(--admin-destructive)'; statusEl.textContent = '✗ Request failed'; }
          if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnLabel; }
        });
    }

    function regenSameTopic(topic) {
      if (!confirm('Regenerate today\\'s board with the same topic ("' + topic + '")?')) return;
      var statusEl = document.getElementById('regenStatus');
      var btns = document.querySelectorAll('.edition-actions button');
      btns.forEach(function(b) { b.disabled = true; });
      if (statusEl) statusEl.style.display = 'inline';
      boardFetch('/admin/regenerate', {}, statusEl, null, '');
    }

    function regenWithTopic() {
      var sel = document.getElementById('regenSelect');
      var custom = document.getElementById('regenCustom');
      var topic = sel ? sel.value : '';
      var customVal = custom ? custom.value.trim() : '';
      var body = { newTopic: 'true' };
      if (topic === '__custom__') { if (!customVal) { alert('Enter a custom topic.'); return; } body.topic = '__custom__'; body.customTopic = customVal; }
      else if (topic) { body.topic = topic; }
      var btn = document.getElementById('regenSubmitBtn');
      var statusEl = document.getElementById('regenStatus');
      document.querySelectorAll('.edition-actions button').forEach(function(b) { b.disabled = true; });
      document.getElementById('regenPanel').classList.remove('open');
      boardFetch('/admin/regenerate', body, statusEl, btn, 'Regenerate Board');
    }

    function generateBoard() {
      var sel = document.getElementById('generateTopicSelect');
      var custom = document.getElementById('generateCustom');
      var topic = sel ? sel.value : '';
      var customVal = custom ? custom.value.trim() : '';
      var body = {};
      if (topic === '__custom__') { if (!customVal) { alert('Enter a custom topic.'); return; } body.topic = customVal; }
      else if (topic) { body.topic = topic; }
      var btn = document.getElementById('generateBtn');
      var statusEl = document.getElementById('generateStatus');
      boardFetch('/admin/generate', body, statusEl, btn, 'Generate Today\\'s Board');
    }
  </script>
</body>
</html>`;
}

function renderBoardExists(board: Board, exercises: Exercise[], emailSent: boolean, baseUrl: string, topics: AdminData["topics"]): string {
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
      <button type="button" class="btn-outline" onclick="regenSameTopic('${esc(board.topic)}')">↺ Regenerate Same Topic</button>
      <button type="button" class="btn-outline" onclick="document.getElementById('regenPanel').classList.toggle('open')">↺ Regenerate with Topic</button>
      <span id="regenStatus" style="font-size:13px;color:var(--admin-muted-fg);display:none"></span>
      <form method="POST" action="/admin/email" style="display:inline;margin-left:auto">
        <button type="submit" class="btn${emailSent ? "-outline" : " btn-success"}" onclick="this.textContent='Sending...'">${emailSent ? "Resend Email" : "Send Email"}</button>
      </form>
    </div>
    <div class="regen-panel" id="regenPanel">
      <div class="regen-form">
        <div class="regen-field">
          <label class="regen-label">Topic</label>
          <select class="regen-select" id="regenSelect" onchange="document.getElementById('regenCustom').style.display=this.value==='__custom__'?'block':'none'">
            <option value="">Auto-pick from queue</option>
            <optgroup label="Available topics">
              ${topics.filter(t => !t.last_used_on).map(t => `<option value="${esc(t.topic)}">${esc(t.topic)}</option>`).join("")}
            </optgroup>
            <option value="__custom__">Custom topic…</option>
          </select>
          <input type="text" id="regenCustom" class="regen-input" placeholder="Enter any topic…" style="display:none;margin-top:8px" autocomplete="off">
        </div>
        <div class="regen-actions">
          <button type="button" class="btn btn-success" id="regenSubmitBtn" onclick="regenWithTopic()">Regenerate Board</button>
          <button type="button" class="btn-outline" onclick="document.getElementById('regenPanel').classList.remove('open')">Cancel</button>
        </div>
      </div>
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
        <div class="inline-form">
          <select id="generateTopicSelect" class="regen-select" style="min-width:240px" onchange="document.getElementById('generateCustom').style.display=this.value==='__custom__'?'block':'none'">
            <option value="">Auto-pick from queue</option>
            <optgroup label="Available topics">
              ${topicOptions}
            </optgroup>
            <option value="__custom__">Custom topic…</option>
          </select>
          <input type="text" id="generateCustom" class="regen-input" placeholder="Enter any topic…" style="display:none;margin-top:8px" autocomplete="off">
          <button type="button" class="btn btn-success" id="generateBtn" onclick="generateBoard()">Generate Today's Board</button>
        </div>
        <div id="generateStatus" style="font-size:13px;color:var(--admin-muted-fg);margin-top:8px;display:none"></div>
      </div>
    </div>
  </div>`;
}

export interface UserDetailData {
  user: { id: number; name: string; email: string; token: string; created_at: string; is_guest: number };
  streak: number;
  longestStreak: number;
  totalExercises: number;
  totalBoards: number;
  wordBankSize: number;
  lastActive: string | null;
  recentSubmissions: Array<{ date: string; exercise_type: string; score: number | null; max_score: number; feedback?: string }>;
  activityData: Array<{ date: string; submitted: boolean; score: number | null }>;
  wordBank: Array<{ word: string; difficulty?: string }>;
}

export function renderUserDetail(d: UserDetailData): string {
  const EXERCISE_LABELS: Record<string, string> = {
    long_reading: "Long Reading", short_reading: "Short Reading", vocabulary: "Vocabulary",
    fill_gap: "Fill Gap", writing_micro: "Writing Micro", mini_writing: "Mini Writing", word_search: "Word Search",
  };

  // 16-week activity heatmap (112 days)
  const today = new Date();
  const dayMs = 86400000;
  const actMap: Record<string, boolean> = {};
  for (const a of d.activityData) actMap[a.date] = a.submitted;

  const weeks: string[][] = [];
  // Start from 112 days ago (Sunday aligned)
  const startDate = new Date(today.getTime() - 111 * dayMs);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // align to Sunday

  let week: string[] = [];
  for (let i = 0; i < 16 * 7; i++) {
    const d2 = new Date(startDate.getTime() + i * dayMs);
    const ds = d2.toISOString().slice(0, 10);
    week.push(ds);
    if (week.length === 7) { weeks.push(week); week = []; }
  }

  const heatmapCells = weeks.map(w =>
    `<div style="display:flex;flex-direction:column;gap:2px">${w.map(ds => {
      const active = actMap[ds];
      const future = ds > today.toISOString().slice(0, 10);
      const bg = future ? "transparent" : active ? "#2D6A4F" : "#e2e8f0";
      return `<div title="${ds}" style="width:10px;height:10px;border-radius:2px;background:${bg}"></div>`;
    }).join("")}</div>`
  ).join("");

  const submissionRows = d.recentSubmissions.map((s, i) =>
    `<tr>
      <td class="mono" style="font-size:11px">${esc(s.date)}</td>
      <td><span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:11px">${esc(EXERCISE_LABELS[s.exercise_type] || s.exercise_type)}</span></td>
      <td class="mono">${s.score ?? "&mdash;"}/${s.max_score}</td>
      <td>
        ${s.feedback ? `<details><summary style="cursor:pointer;font-size:11px;color:#64748b">Ver feedback</summary><pre style="font-size:10px;white-space:pre-wrap;margin-top:4px;color:#64748b;max-height:100px;overflow:auto">${esc(s.feedback.slice(0, 400))}</pre></details>` : "&mdash;"}
      </td>
    </tr>`
  ).join("");

  const wordBankRows = d.wordBank.slice(0, 20).map(w =>
    `<span style="display:inline-block;background:#f1f5f9;padding:2px 10px;border-radius:9999px;font-size:12px;margin:2px">${esc(w.word)}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(d.user.name)} — Admin Detail</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,sans-serif;background:#06060f;color:#f0f0ff;font-size:14px;line-height:1.5;overflow-x:hidden}
    .blobs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
    .blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:0.45;will-change:transform}
    .blob-1{width:600px;height:600px;background:radial-gradient(circle,#6d28d9 0%,transparent 70%);top:-10%;left:-10%;animation:bf1 22s ease-in-out infinite alternate}
    .blob-2{width:500px;height:500px;background:radial-gradient(circle,#0e7490 0%,transparent 70%);bottom:-5%;right:-5%;animation:bf2 18s ease-in-out infinite alternate}
    @keyframes bf1{0%{transform:translate(0,0)}100%{transform:translate(60px,80px)}}
    @keyframes bf2{0%{transform:translate(0,0)}100%{transform:translate(-50px,-60px)}}
    .topbar{display:flex;align-items:center;gap:12px;padding:0 24px;height:54px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(6,6,15,0.75);backdrop-filter:blur(20px);position:sticky;top:0;z-index:50}
    .topbar a{font-size:13px;color:rgba(220,220,255,0.55);text-decoration:none;font-weight:500;transition:color .15s}
    .topbar a:hover{color:#f0f0ff}
    .topbar-title{font-size:15px;font-weight:700;margin-left:8px;background:linear-gradient(135deg,#c4b5fd,#67e8f9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .shell{max-width:900px;margin:0 auto;padding:32px 24px;position:relative;z-index:1}
    .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#a78bfa;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08)}
    .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:12px;margin-bottom:24px;overflow:hidden}
    .card-header{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#a78bfa}
    .card-body{padding:20px}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:0}
    .stat-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:20px 16px;text-align:center;position:relative;overflow:hidden}
    .stat-card::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(167,139,250,0.07),transparent 60%);pointer-events:none}
    .stat-val{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;background:linear-gradient(135deg,#f0f0ff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
    .stat-lbl{font-size:10px;color:rgba(220,220,255,0.55);margin-top:4px;text-transform:uppercase;letter-spacing:1px;font-weight:600}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:8px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#a78bfa;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(167,139,250,0.05)}
    td{padding:8px 12px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06);color:#f0f0ff}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:rgba(255,255,255,0.04)}
    .mono{font-family:'JetBrains Mono',monospace;font-size:12px}
  </style>
</head>
<body>
  <div class="blobs" aria-hidden="true"><div class="blob blob-1"></div><div class="blob blob-2"></div></div>
  <div class="topbar">
    <a href="/admin#users">&larr; Admin</a>
    <span class="topbar-title">${esc(d.user.name)}</span>
    <span style="margin-left:auto;font-size:12px;color:rgba(220,220,255,0.55)">${esc(d.user.email)}</span>
  </div>
  <div class="shell">

    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card">
        <div class="stat-val">${d.streak}</div>
        <div class="stat-lbl">&#x1F525; Racha actual</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${d.longestStreak}</div>
        <div class="stat-lbl">Racha m&aacute;s larga</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${d.totalExercises}</div>
        <div class="stat-lbl">Ejercicios totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-val">${d.wordBankSize}</div>
        <div class="stat-lbl">Banco de palabras</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Activity (16 weeks)</div>
      <div class="card-body">
        <div style="display:flex;gap:2px;overflow-x:auto">${heatmapCells}</div>
        <div style="margin-top:6px;font-size:11px;color:rgba(220,220,255,0.45)">&#x25A0; Active day</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">Recent Submissions (last 20)</div>
      <div class="card-body" style="padding:0">
        ${d.recentSubmissions.length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--muted-fg);font-style:italic">No submissions yet.</div>`
          : `<table><thead><tr><th>Date</th><th>Exercise</th><th>Score</th><th>Feedback</th></tr></thead><tbody>${submissionRows}</tbody></table>`
        }
      </div>
    </div>

    <div class="card">
      <div class="card-header">Word Bank (first 20)</div>
      <div class="card-body">
        ${d.wordBank.length === 0
          ? `<span style="color:var(--muted-fg);font-style:italic">No words yet.</span>`
          : wordBankRows
        }
      </div>
    </div>

  </div>
</body>
</html>`;
}
