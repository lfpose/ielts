import type { User, ActivityDay, Submission } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHeatmap(activityData: ActivityDay[]): string {
  // Build a 26-week (6 month) × 7-day grid, like GitHub's contribution graph
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map activity data by date for lookup
  const activityMap = new Map<string, ActivityDay>();
  for (const d of activityData) activityMap.set(d.date, d);

  const weeks = 26;
  const cellSize = 14;
  const cellGap = 3;
  const cellStep = cellSize + cellGap;
  const width = weeks * cellStep + 30;
  const height = 7 * cellStep + 24;

  // Start from (weeks) weeks ago, aligned to Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7) + (7 - start.getDay()));

  let cells = "";
  const monthLabels: Array<{ x: number; label: string }> = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = -1;

  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start);
      d.setDate(d.getDate() + week * 7 + day);
      if (d > today) continue;

      const dateStr = d.toISOString().slice(0, 10);
      const activity = activityMap.get(dateStr);
      const x = week * cellStep + 28;
      const y = day * cellStep + 20;

      let fill: string;
      if (!activity) {
        fill = "var(--cell-empty)";
      } else if (activity.submitted) {
        // Color intensity based on score
        const scoreNum = activity.score ?? 0;
        if (scoreNum >= 8) fill = "var(--cell-4)";
        else if (scoreNum >= 6) fill = "var(--cell-3)";
        else if (scoreNum >= 4) fill = "var(--cell-2)";
        else fill = "var(--cell-1)";
      } else {
        fill = "var(--cell-empty)";
      }

      cells += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fill}" rx="2">
        <title>${dateStr}${activity?.submitted ? ` — Score: ${activity.score}` : ""}</title>
      </rect>`;

      // Month labels
      if (day === 0 && d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth();
        monthLabels.push({ x, label: months[d.getMonth()] });
      }
    }
  }

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
  let dayLabelsSvg = "";
  for (let i = 0; i < 7; i++) {
    if (dayLabels[i]) {
      dayLabelsSvg += `<text x="0" y="${i * cellStep + 20 + 11}" fill="var(--n500)" font-size="10" font-family="'Inter',sans-serif">${dayLabels[i]}</text>`;
    }
  }

  let monthLabelsSvg = "";
  for (const ml of monthLabels) {
    monthLabelsSvg += `<text x="${ml.x}" y="12" fill="var(--n500)" font-size="10" font-family="'Inter',sans-serif">${ml.label}</text>`;
  }

  return `<svg width="100%" viewBox="0 0 ${width} ${height}" style="max-width:${width}px;">
    ${monthLabelsSvg}
    ${dayLabelsSvg}
    ${cells}
  </svg>`;
}

export function renderStatsPage(
  user: User,
  activityData: ActivityDay[],
  currentStreak: number,
  longestStreak: number,
  totalSubmissions: number,
  recentSubmissions: Array<Submission & { date: string; article_title: string }>
): string {
  const historyRows = recentSubmissions
    .map(
      (s) => `
    <tr>
      <td class="td mono">${s.date}</td>
      <td class="td" style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.article_title || "")}</td>
      <td class="td score-cell">${s.score != null ? esc(String(s.score)) : "&mdash;"}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily &mdash; Stats</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root {
      --bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;
      --cell-empty:#EBEDF0;--cell-1:#9BE9A8;--cell-2:#40C463;--cell-3:#30A14E;--cell-4:#216E39;
    }
    [data-theme="dark"]{
      --bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
    }
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
      --bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
    }}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    .shell{max-width:780px;margin:0 auto;padding:32px 24px}
    .masthead{border-bottom:4px double var(--fg);padding-bottom:10px;margin-bottom:24px;text-align:center}
    .masthead h1{font-family:'Playfair Display',serif;font-size:36px;font-weight:900;letter-spacing:-0.5px}
    .masthead .sub{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:4px;color:var(--n500);margin-top:6px}
    .meta-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--fg);margin-bottom:24px;
      font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px}
    .meta-bar a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--muted);font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px}
    .meta-bar a:hover{border-bottom-color:var(--red)}

    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--fg);margin-bottom:24px}
    .stat{padding:20px;border-right:1px solid var(--fg);text-align:center}
    .stat:last-child{border-right:none}
    .stat .label{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:6px}
    .stat .val{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:1}
    .stat .unit{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--n500);margin-top:4px}

    .section{border:1px solid var(--fg);margin-bottom:24px}
    .section-head{padding:10px 20px;border-bottom:1px solid var(--fg);background:var(--n100);
      font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;display:flex;justify-content:space-between;align-items:center}
    .section-body{padding:20px;overflow-x:auto}

    .legend{display:flex;align-items:center;gap:4px;font-family:'Inter',sans-serif;font-size:10px;color:var(--n500)}
    .legend-cell{width:12px;height:12px;border-radius:2px}

    table{width:100%;border-collapse:collapse}
    th{text-align:left;padding:10px 14px;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;
      text-transform:uppercase;letter-spacing:2px;color:var(--n500);border-bottom:2px solid var(--fg);background:var(--n100)}
    .td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--muted);color:var(--fg)}
    .td.mono{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--n500)}
    .score-cell{font-family:'Playfair Display',serif;font-size:16px;font-weight:700}
    tr:hover .td{background:var(--n100)}
    .empty-state{text-align:center;padding:48px;font-style:italic;color:var(--n500)}

    .footer{text-align:center;padding:32px 0;font-family:'Playfair Display',serif;font-size:18px;color:var(--muted);letter-spacing:.6em}
    @media(max-width:600px){.shell{padding:16px 12px}.masthead h1{font-size:28px}.stats-grid{grid-template-columns:1fr}.stat{border-right:none;border-bottom:1px solid var(--fg)}.stat:last-child{border-bottom:none}}
  </style>
  <script>
    (function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');
    else if(t==='light')document.documentElement.setAttribute('data-theme','light');})();
  </script>
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <h1>The IELTS Daily</h1>
      <div class="sub">Estad&iacute;sticas</div>
    </header>

    <div class="meta-bar">
      <span>${esc(user.name)} &middot; ${esc(user.email)}</span>
      <span><a href="/s/${esc(user.token)}">&larr; Portada</a> &middot; <a href="/practice/${esc(user.token)}">Pr&aacute;ctica de Hoy</a></span>
    </div>

    <!-- STREAK STATS -->
    <div class="stats-grid">
      <div class="stat">
        <div class="label">Racha Actual</div>
        <div class="val">${currentStreak}</div>
        <div class="unit">d&iacute;as</div>
      </div>
      <div class="stat">
        <div class="label">Mejor Racha</div>
        <div class="val">${longestStreak}</div>
        <div class="unit">d&iacute;as</div>
      </div>
      <div class="stat">
        <div class="label">Total Completado</div>
        <div class="val">${totalSubmissions}</div>
        <div class="unit">pr&aacute;cticas</div>
      </div>
    </div>

    <!-- ACTIVITY GRAPH -->
    <div class="section">
      <div class="section-head">
        <span>Actividad</span>
        <div class="legend">
          Menos <span class="legend-cell" style="background:var(--cell-empty)"></span>
          <span class="legend-cell" style="background:var(--cell-1)"></span>
          <span class="legend-cell" style="background:var(--cell-2)"></span>
          <span class="legend-cell" style="background:var(--cell-3)"></span>
          <span class="legend-cell" style="background:var(--cell-4)"></span> M&aacute;s
        </div>
      </div>
      <div class="section-body">
        ${buildHeatmap(activityData)}
      </div>
    </div>

    <!-- SCORE HISTORY -->
    <div class="section">
      <div class="section-head">
        <span>Historial de Puntajes</span>
        <span style="font-weight:400;letter-spacing:1px">&Uacute;ltimos 20</span>
      </div>
      ${
        recentSubmissions.length === 0
          ? '<div class="empty-state">A&uacute;n no has completado ninguna pr&aacute;ctica.</div>'
          : `<table>
        <thead><tr><th>Fecha</th><th>Art&iacute;culo</th><th>Puntaje</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>`
      }
    </div>

    <div class="footer">&#x2727; &#x2727; &#x2727;</div>
  </div>
</body>
</html>`;
}
