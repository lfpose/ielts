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
    preview = `<strong>${esc(title)}</strong><br><span style="color:#737373">${esc(passage)}${passage.length >= 200 ? "..." : ""}</span><br><span style="color:#737373;font-size:12px">${qCount} questions</span>`;
  } else if (type === "vocabulary") {
    const words = (content.words || []).map((w: { word: string }) => w.word).join(", ");
    preview = `<strong>Words:</strong> ${esc(words)}`;
  } else if (type === "fill_gap") {
    const paragraph = (content.paragraph || "").substring(0, 200);
    const bankSize = content.word_bank?.length || 0;
    preview = `<span style="color:#737373">${esc(paragraph)}${paragraph.length >= 200 ? "..." : ""}</span><br><span style="color:#737373;font-size:12px">${bankSize} words in bank</span>`;
  } else if (type === "writing_micro") {
    const prompt = content.prompt || "";
    preview = `<strong>Prompt:</strong> ${esc(prompt)}`;
  }

  return preview;
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

  // Today's Edition section
  const todaySection = todaysBoard
    ? renderBoardExists(todaysBoard, exercises, emailSent, baseUrl)
    : renderNoBoard();

  // Readership metrics
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

  // Users table
  const userRows = users.map((u) => {
    const streakDisplay = u.streak > 0 ? `<span class="streak-badge">${u.streak}d</span>` : `<span style="color:#999">0</span>`;
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
        <a href="${esc(baseUrl)}/s/${esc(u.token)}" target="_blank" class="action-link">View</a>
        <form method="POST" action="/admin/users/${u.id}/remove" style="display:inline" onsubmit="return confirm('Remove ${esc(u.name)}?')">
          <button type="submit" class="action-link danger">Remove</button>
        </form>
      </td>
    </tr>`;
  }).join("");

  const usersSection = `
    <div class="section">
      <div class="section-header">
        <h2>Users</h2>
        <span class="badge">${users.length} users</span>
      </div>
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
      </div>
    </div>`;

  // Email log
  const emailLogRows = emailLogs.map((l) => {
    const statusClass = l.status === "error" || l.status === "partial_failure" ? "status-error" : "status-success";
    const statusLabel = l.status === "sent" || l.status === "success" ? "Sent" : l.status === "partial_failure" ? "Partial" : "Failed";
    const duration = l.duration_ms ? `${(l.duration_ms / 1000).toFixed(1)}s` : "&mdash;";
    const recipientCount = l.recipients ? l.recipients.split(",").length : 0;
    return `<tr>
      <td class="mono">${esc(l.sent_at)}</td>
      <td>${l.topic ? esc(l.topic) : "&mdash;"}</td>
      <td class="mono">${recipientCount} recipient${recipientCount !== 1 ? "s" : ""}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td class="mono">${duration}</td>
      ${l.error ? `<td class="error-text" title="${esc(l.error)}">${esc(l.error.substring(0, 50))}</td>` : "<td></td>"}
    </tr>`;
  }).join("");

  const emailLogSection = `
    <div class="section">
      <div class="section-header">
        <h2>Email Log</h2>
        <span class="badge">Last 30</span>
      </div>
      ${emailLogs.length === 0
        ? '<div class="empty-state">No emails sent yet.</div>'
        : `<div class="table-wrap"><table>
          <thead><tr><th>Sent</th><th>Topic</th><th>Recipients</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
          <tbody>${emailLogRows}</tbody>
        </table></div>`
      }
    </div>`;

  // Settings
  const difficultyOptions = ["B1", "B2", "C1"].map((d) =>
    `<option value="${d}"${settings.difficulty === d ? " selected" : ""}>${d}</option>`
  ).join("");

  const settingsSection = `
    <div class="section">
      <div class="section-header">
        <h2>Settings</h2>
      </div>
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
      </form>
    </div>`;

  // Topic Queue
  const topicRows = topics.map((t) => {
    const lastUsed = t.last_used_on || "Never";
    const forcedBadge = t.forced_next ? '<span class="status-badge status-warning">Forced Next</span>' : "";
    return `<tr data-topic-id="${t.id}">
      <td class="mono" style="width:40px;color:#999">${t.position}</td>
      <td>${esc(t.topic)} ${forcedBadge}</td>
      <td>${esc(lastUsed)}</td>
      <td class="mono">${t.times_used}</td>
      <td>
        <form method="POST" action="/admin/topics/force" style="display:inline">
          <input type="hidden" name="topicId" value="${t.id}">
          <button type="submit" class="action-link" title="Force as next topic">Force</button>
        </form>
        <form method="POST" action="/admin/topics/remove" style="display:inline" onsubmit="return confirm('Remove topic?')">
          <input type="hidden" name="topicId" value="${t.id}">
          <button type="submit" class="action-link danger">Remove</button>
        </form>
      </td>
    </tr>`;
  }).join("");

  const topicHistoryRows = topicHistory.slice(0, 30).map((h) => `
    <tr>
      <td>${esc(h.used_on)}</td>
      <td>${esc(h.topic)}</td>
    </tr>
  `).join("");

  const topicSection = `
    <div class="section">
      <div class="section-header">
        <h2>Topic Queue</h2>
        <span class="badge">${topics.length} topics</span>
      </div>
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
      </div>` : ""}
    </div>`;

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
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:#fff;color:#111;min-height:100vh;font-size:14px;line-height:1.5}
    .shell{max-width:1100px;margin:0 auto;padding:32px 24px}

    /* Header */
    .header{display:flex;justify-content:space-between;align-items:center;padding-bottom:24px;border-bottom:1px solid #e5e5e5;margin-bottom:32px}
    .header h1{font-size:20px;font-weight:700;letter-spacing:-0.5px}
    .header-meta{font-size:12px;color:#737373}

    /* Section */
    .section{border:1px solid #e5e5e5;border-radius:8px;margin-bottom:24px;overflow:hidden}
    .section-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #e5e5e5;background:#fafafa}
    .section-header h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
    .section-footer{padding:12px 20px;border-top:1px solid #e5e5e5;background:#fafafa}
    .subsection{padding:0;border-top:1px solid #e5e5e5}
    .subsection h3{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:12px 20px;background:#fafafa;border-bottom:1px solid #e5e5e5;color:#737373}

    /* Badge */
    .badge{font-size:11px;font-weight:500;color:#737373;background:#f5f5f5;padding:2px 8px;border-radius:4px}

    /* Metrics */
    .metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
    .metric-card{border:1px solid #e5e5e5;border-radius:8px;padding:20px;text-align:center}
    .metric-value{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:#111}
    .metric-label{font-size:12px;color:#737373;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}

    /* Tables */
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#737373;border-bottom:1px solid #e5e5e5;background:#fafafa}
    td{padding:10px 16px;font-size:13px;border-bottom:1px solid #f0f0f0}
    tr:hover td{background:#fafafa}
    .mono{font-family:'JetBrains Mono',monospace;font-size:12px}

    /* Status badges */
    .status-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;display:inline-block}
    .status-success{background:#dcfce7;color:#166534}
    .status-warning{background:#fef9c3;color:#854d0e}
    .status-error{background:#fee2e2;color:#991b1b}
    .status-draft{background:#fef9c3;color:#854d0e}

    /* Streak badge */
    .streak-badge{background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;padding:1px 6px;border-radius:3px}

    /* Buttons */
    .btn{font-family:'Inter',sans-serif;background:#111;color:#fff;border:none;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:6px;transition:background .15s}
    .btn:hover{background:#333}
    .btn-sm{padding:6px 14px;font-size:12px}
    .btn-outline{background:transparent;color:#111;border:1px solid #d4d4d4;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
    .btn-outline:hover{border-color:#111;background:#f5f5f5}
    .btn-danger{background:#dc2626;color:#fff}
    .btn-danger:hover{background:#b91c1c}
    .btn-success{background:#16a34a;color:#fff}
    .btn-success:hover{background:#15803d}

    /* Action links */
    .action-link{background:none;border:none;color:#2563eb;font-size:12px;font-weight:500;cursor:pointer;padding:2px 4px;text-decoration:none}
    .action-link:hover{text-decoration:underline}
    .action-link.danger{color:#dc2626}

    /* Error text */
    .error-text{color:#dc2626;font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

    /* Forms */
    .inline-form{display:flex;gap:8px;align-items:center}
    .inline-form input[type="text"],.inline-form input[type="email"]{font-family:'Inter',sans-serif;border:1px solid #d4d4d4;padding:6px 12px;font-size:13px;border-radius:6px;outline:none;min-width:160px}
    .inline-form input:focus{border-color:#111;box-shadow:0 0 0 1px #111}
    .settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:0}
    .field{padding:16px 20px;border-bottom:1px solid #f0f0f0}
    .field:nth-child(odd){border-right:1px solid #f0f0f0}
    .field label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#737373;margin-bottom:6px}
    .field input,.field select{width:100%;font-family:'Inter',sans-serif;border:1px solid #d4d4d4;padding:8px 12px;font-size:13px;border-radius:6px;outline:none;background:#fff}
    .field input:focus,.field select:focus{border-color:#111;box-shadow:0 0 0 1px #111}
    .form-actions{padding:16px 20px;text-align:right;border-top:1px solid #e5e5e5}

    /* Today's Edition */
    .edition-hero{border:1px solid #e5e5e5;border-radius:8px;margin-bottom:24px;overflow:hidden}
    .edition-header{padding:20px;background:#fafafa;border-bottom:1px solid #e5e5e5}
    .edition-topic{font-size:18px;font-weight:700;margin-bottom:4px}
    .edition-meta{font-size:12px;color:#737373}
    .edition-body{padding:16px 20px}
    .exercise-cards{display:flex;flex-direction:column;gap:8px}
    .exercise-card{border:1px solid #e5e5e5;border-radius:6px;overflow:hidden}
    .exercise-card-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;cursor:pointer;user-select:none}
    .exercise-card-header:hover{background:#fafafa}
    .exercise-type-badge{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;padding:2px 8px;border-radius:4px;background:#f0f0ff;color:#4338ca}
    .exercise-card-title{font-size:13px;font-weight:500;flex:1;margin:0 12px}
    .exercise-card-toggle{color:#999;font-size:12px}
    .exercise-card-preview{padding:12px 16px;border-top:1px solid #f0f0f0;font-size:13px;line-height:1.6;display:none;background:#fcfcfc}
    .exercise-card-preview.open{display:block}
    .exercise-card-actions{padding:8px 16px;border-top:1px solid #f0f0f0;display:none;background:#fafafa}
    .exercise-card-actions.open{display:flex;gap:8px}
    .edition-actions{display:flex;gap:8px;padding:16px 20px;border-top:1px solid #e5e5e5;flex-wrap:wrap}

    /* No board state */
    .no-board{padding:48px 20px;text-align:center}
    .no-board p{color:#737373;margin-bottom:16px}
    .generate-form{display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap}
    .generate-form select{font-family:'Inter',sans-serif;border:1px solid #d4d4d4;padding:8px 12px;font-size:13px;border-radius:6px;outline:none}

    /* Empty state */
    .empty-state{text-align:center;padding:32px;color:#999;font-style:italic}

    /* Toast */
    .toast{position:fixed;top:16px;right:16px;background:#111;color:#fff;padding:12px 20px;border-radius:6px;font-size:13px;font-weight:500;z-index:100;display:none;animation:fadeIn .3s}
    @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

    /* Responsive */
    @media(max-width:768px){
      .shell{padding:16px 12px}
      .metrics-row{grid-template-columns:repeat(2,1fr)}
      .settings-grid{grid-template-columns:1fr}
      .field{border-right:none!important}
      .header{flex-direction:column;gap:8px;align-items:flex-start}
      .edition-actions{flex-direction:column}
      .inline-form{flex-wrap:wrap}
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="header">
      <h1>IELTS Daily &mdash; Admin</h1>
      <div class="header-meta">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
    </div>

    ${todaySection}

    <div class="section">
      <div class="section-header"><h2>Readership</h2></div>
      <div style="padding:20px">
        ${metricsSection}
      </div>
    </div>

    ${usersSection}
    ${topicSection}
    ${emailLogSection}
    ${settingsSection}
  </div>

  <div class="toast" id="toast"></div>

  <script>
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
    ? '<span class="status-badge status-success">Live</span>'
    : '<span class="status-badge status-draft">Draft</span>';

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

  // Find a test user for "Preview as Student"
  const previewLink = `${esc(baseUrl)}/s/`;

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

function renderNoBoard(): string {
  return `
  <div class="edition-hero">
    <div class="no-board">
      <p>No board generated for today yet.</p>
      <div class="generate-form">
        <form method="POST" action="/admin/generate" class="inline-form">
          <select name="topic">
            <option value="">Random Topic</option>
          </select>
          <button type="submit" class="btn btn-success" onclick="this.textContent='Generating...'">Generate Today's Board</button>
        </form>
      </div>
    </div>
  </div>`;
}
