import type { User, ActivityDay, ExerciseType, RecentSubmissionRow } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  long_reading: "Lectura Larga",
  short_reading: "Lectura Corta",
  vocabulary: "Vocabulario",
  fill_gap: "Completar",
  writing_micro: "Escritura",
  mini_writing: "Mini Escritura",
  word_search: "Sopa de Letras",
  hangman: "Hangman",
  number_words: "Números en Palabras",
};

const EXERCISE_ACCENT: Record<ExerciseType, string> = {
  long_reading: "#1a3a5c",
  short_reading: "#2e7d32",
  vocabulary: "#5e35b1",
  fill_gap: "#f59e0b",
  writing_micro: "#991b1b",
  mini_writing: "#7b2d2d",
  word_search: "#1a4a3a",
  hangman: "#7a3a00",
  number_words: "#2a1a5c",
};

function buildHeatmap(activityData: ActivityDay[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityMap = new Map<string, ActivityDay>();
  for (const d of activityData) activityMap.set(d.date, d);

  const weeks = 16;
  const cs = 14, cg = 3, step = cs + cg;
  const labelW = 24;
  const w = weeks * step + labelW + 4;
  const monthH = 16;
  const h = 7 * step + monthH + 4;

  // Align start to Monday, 16 weeks back
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7) + 1);
  const dow = start.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + mondayOffset);

  // Month labels (Spanish)
  const months: { label: string; x: number }[] = [];
  let lastMonth = -1;
  for (let wk = 0; wk < weeks; wk++) {
    const d = new Date(start);
    d.setDate(d.getDate() + wk * 7);
    const m = d.getMonth();
    if (m !== lastMonth) {
      const monthName = d.toLocaleDateString("es-ES", { month: "short" });
      months.push({ label: monthName.charAt(0).toUpperCase() + monthName.slice(1), x: labelW + wk * step });
      lastMonth = m;
    }
  }

  const dayLabels = ["L", "M", "X", "J", "V", "S", "D"];
  let svg = "";

  for (const m of months) {
    svg += `<text x="${m.x}" y="${monthH - 3}" font-family="Inter,sans-serif" font-size="9" fill="var(--n500)">${m.label}</text>`;
  }

  for (let day = 0; day < 7; day++) {
    if (day % 2 === 0) {
      svg += `<text x="0" y="${monthH + day * step + cs - 2}" font-family="Inter,sans-serif" font-size="9" fill="var(--n500)">${dayLabels[day]}</text>`;
    }
  }

  const todayStr = today.toISOString().slice(0, 10);
  for (let wk = 0; wk < weeks; wk++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start);
      d.setDate(d.getDate() + wk * 7 + day);
      if (d > today) continue;
      const ds = d.toISOString().slice(0, 10);
      const a = activityMap.get(ds);
      const x = labelW + wk * step;
      const y = monthH + day * step;
      let fill = "var(--cell-empty)";
      if (a?.submitted) {
        const sn = a.score ?? 0;
        fill = sn >= 20 ? "var(--cell-4)" : sn >= 14 ? "var(--cell-3)" : sn >= 8 ? "var(--cell-2)" : "var(--cell-1)";
      }
      const isToday = ds === todayStr;
      const dayName = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      const tooltip = a?.submitted ? `${a.score} puntos &middot; ${dayName}` : dayName;
      svg += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${fill}" rx="2"${isToday ? ` stroke="var(--red)" stroke-width="1.5"` : ""}><title>${tooltip}</title></rect>`;
    }
  }

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="max-width:${w}px;">${svg}</svg>`;
}

export function renderStatsPage(
  user: User,
  activityData: ActivityDay[],
  currentStreak: number,
  longestStreak: number,
  totalExercises: number,
  totalBoards: number,
  recentSubmissions: RecentSubmissionRow[]
): string {
  const historyRows = recentSubmissions
    .map(
      (s) => `
    <tr>
      <td class="td mono">${esc(s.date)}</td>
      <td class="td"><span class="type-badge type-${esc(s.exercise_type)}">${esc(EXERCISE_LABELS[s.exercise_type] || s.exercise_type)}</span></td>
      <td class="td score-cell">${s.score != null ? `${s.score}/${s.max_score}` : "&mdash;"}</td>
    </tr>`
    )
    .join("");

  const streakEmoji = currentStreak > 0 ? "&#x1F525;" : "";
  const streakWarm = currentStreak > 7;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IELTS Daily &mdash; Estad&iacute;sticas</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root {
      --bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;
      --cell-empty:#EBEDF0;--cell-1:#9BE9A8;--cell-2:#40C463;--cell-3:#30A14E;--cell-4:#216E39;
      --accent-navy:#1a3a5c;--accent-green:#2e7d32;--accent-purple:#5e35b1;--accent-amber:#f59e0b;--accent-darkred:#991b1b;
    }
    [data-theme="dark"]{
      --bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
      --accent-navy:#5b9bd5;--accent-green:#66bb6a;--accent-purple:#b39ddb;--accent-amber:#ffd54f;--accent-darkred:#ef9a9a;
    }
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){
      --bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
      --accent-navy:#5b9bd5;--accent-green:#66bb6a;--accent-purple:#b39ddb;--accent-amber:#ffd54f;--accent-darkred:#ef9a9a;
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
    .theme-btn{background:none;border:1px solid var(--muted);border-radius:4px;padding:4px 10px;font-family:'Inter',sans-serif;
      font-size:11px;color:var(--n500);cursor:pointer;transition:border-color .2s}
    .theme-btn:hover{border-color:var(--fg)}

    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--fg);margin-bottom:24px}
    .stat{padding:20px;border-right:1px solid var(--fg);text-align:center}
    .stat:last-child{border-right:none}
    .stat .label{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:6px}
    .stat .val{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:1}
    .stat .unit{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--n500);margin-top:4px}
    .stat .val .streak-fire{font-size:28px;vertical-align:middle;margin-right:4px}
    .stat.streak-warm{background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(245,158,11,0.03))}

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
    .score-cell{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500}
    tr:hover .td{background:var(--n100)}
    .empty-state{text-align:center;padding:48px;font-style:italic;color:var(--n500)}

    .type-badge{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;
      padding:3px 10px;border-radius:3px;border-left:3px solid}
    .type-long_reading{color:var(--accent-navy);border-left-color:var(--accent-navy);background:rgba(26,58,92,0.06)}
    .type-short_reading{color:var(--accent-green);border-left-color:var(--accent-green);background:rgba(46,125,50,0.06)}
    .type-vocabulary{color:var(--accent-purple);border-left-color:var(--accent-purple);background:rgba(94,53,177,0.06)}
    .type-fill_gap{color:var(--accent-amber);border-left-color:var(--accent-amber);background:rgba(245,158,11,0.06)}
    .type-writing_micro{color:var(--accent-darkred);border-left-color:var(--accent-darkred);background:rgba(153,27,27,0.06)}

    .footer{text-align:center;padding:32px 0;font-family:'Playfair Display',serif;font-size:18px;color:var(--muted);letter-spacing:.6em}
    @media(max-width:600px){
      .shell{padding:16px 12px}
      .masthead h1{font-size:28px}
      .stats-grid{grid-template-columns:repeat(2,1fr)}
      .stat:nth-child(2){border-right:none}
      .stat:nth-child(1),.stat:nth-child(2){border-bottom:1px solid var(--fg)}
      .stat .val{font-size:32px}
    }
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
      <span>${esc(user.name)}</span>
      <div style="display:flex;align-items:center;gap:12px">
        <button class="theme-btn" id="theme-toggle" title="Cambiar tema">&#x263E;</button>
        <a href="/s/${esc(user.token)}">&larr; Volver al tablero</a>
      </div>
    </div>

    <!-- STATS -->
    <div class="stats-grid">
      <div class="stat${streakWarm ? " streak-warm" : ""}">
        <div class="label">Racha Actual</div>
        <div class="val"><span class="streak-fire">${streakEmoji}</span>${currentStreak}</div>
        <div class="unit">d&iacute;as</div>
      </div>
      <div class="stat">
        <div class="label">Mejor Racha</div>
        <div class="val">${longestStreak}</div>
        <div class="unit">d&iacute;as</div>
      </div>
      <div class="stat">
        <div class="label">Ejercicios</div>
        <div class="val">${totalExercises}</div>
        <div class="unit">completados</div>
      </div>
      <div class="stat">
        <div class="label">Tableros</div>
        <div class="val">${totalBoards}</div>
        <div class="unit">completados</div>
      </div>
    </div>

    <!-- ACTIVITY HEATMAP -->
    <div class="section">
      <div class="section-head">
        <span>Actividad &mdash; &Uacute;ltimas 16 Semanas</span>
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

    <!-- RECENT HISTORY -->
    <div class="section">
      <div class="section-head">
        <span>Historial Reciente</span>
        <span style="font-weight:400;letter-spacing:1px">&Uacute;ltimos 20</span>
      </div>
      ${
        recentSubmissions.length === 0
          ? '<div class="empty-state">A&uacute;n no has completado ning&uacute;n ejercicio.</div>'
          : `<table>
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Puntaje</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>`
      }
    </div>

    <div class="footer">&#x2727; &#x2727; &#x2727;</div>
  </div>

  <script>
    (function(){
      var btn=document.getElementById('theme-toggle');
      if(!btn)return;
      function update(){var d=document.documentElement.getAttribute('data-theme');btn.textContent=d==='dark'?'\\u2600':'\\u263E';}
      update();
      btn.addEventListener('click',function(){
        var cur=document.documentElement.getAttribute('data-theme');
        var next=cur==='dark'?'light':'dark';
        document.documentElement.setAttribute('data-theme',next);
        localStorage.setItem('theme',next);
        update();
      });
    })();
  </script>
</body>
</html>`;
}
