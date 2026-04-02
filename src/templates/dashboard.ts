import type { User, BoardWithStatus, ActivityDay, ExerciseType } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const EXERCISE_LABELS: Record<ExerciseType, string> = {
  long_reading: "Lectura Larga",
  short_reading: "Lectura Corta",
  vocabulary: "Vocabulario",
  fill_gap: "Completar Espacios",
  writing_micro: "Escritura",
};

const EXERCISE_ICONS: Record<ExerciseType, string> = {
  long_reading: "1",
  short_reading: "2",
  vocabulary: "3",
  fill_gap: "4",
  writing_micro: "5",
};

function fmtDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const todayLong = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function buildHeatmap(activityData: ActivityDay[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityMap = new Map<string, ActivityDay>();
  for (const d of activityData) activityMap.set(d.date, d);

  const weeks = 16;
  const cs = 12, cg = 3, step = cs + cg;
  const w = weeks * step + 20, h = 7 * step + 16;
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + (7 - start.getDay()));

  let cells = "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mLabels: Array<{ x: number; l: string }> = [];
  let lastM = -1;

  for (let wk = 0; wk < weeks; wk++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(start);
      d.setDate(d.getDate() + wk * 7 + day);
      if (d > today) continue;
      const ds = d.toISOString().slice(0, 10);
      const a = activityMap.get(ds);
      const x = wk * step + 18, y = day * step + 14;
      let fill = "var(--cell-empty)";
      if (a?.submitted) {
        const sn = a.score ?? 0;
        // 21-point scale: 16+, 11-15, 6-10, 1-5
        fill = sn >= 16 ? "var(--cell-4)" : sn >= 11 ? "var(--cell-3)" : sn >= 6 ? "var(--cell-2)" : "var(--cell-1)";
      }
      cells += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${fill}" rx="2"><title>${ds}${a?.submitted ? " — " + a.score + "/21" : ""}</title></rect>`;
      if (day === 0 && d.getMonth() !== lastM) {
        lastM = d.getMonth();
        mLabels.push({ x, l: months[d.getMonth()] });
      }
    }
  }

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="max-width:${w}px;">${mLabels.map((m) => `<text x="${m.x}" y="10" fill="var(--n500)" font-size="9" font-family="'Inter',sans-serif">${m.l}</text>`).join("")}${cells}</svg>`;
}

function renderExerciseCards(board: BoardWithStatus, token: string): string {
  return board.exercises
    .map((ex) => {
      const label = EXERCISE_LABELS[ex.type] || ex.type;
      const num = EXERCISE_ICONS[ex.type] || "?";
      const link = `/s/${esc(token)}/exercise/${ex.id}`;

      if (ex.completed) {
        return `<a href="${link}" class="ex-card completed">
          <div class="ex-num">${num}</div>
          <div class="ex-info">
            <div class="ex-type">${esc(label)}</div>
          </div>
          <div class="ex-score">${ex.user_score}/${ex.max_score}</div>
        </a>`;
      }
      return `<a href="${link}" class="ex-card available">
        <div class="ex-num">${num}</div>
        <div class="ex-info">
          <div class="ex-type">${esc(label)}</div>
        </div>
        <div class="ex-status">Disponible</div>
      </a>`;
    })
    .join("");
}

function renderProgressBar(board: BoardWithStatus): string {
  const segments = board.exercises.map((ex) => {
    return `<div class="prog-seg ${ex.completed ? "filled" : "empty"}"></div>`;
  });
  return `<div class="progress">
    <div class="prog-bar">${segments.join("")}</div>
    <div class="prog-label">${board.completedCount}/5 completados</div>
  </div>`;
}

function renderArchive(archives: BoardWithStatus[], token: string): string {
  if (archives.length === 0) return "";
  const items = archives
    .map((bws) => {
      const link = `/s/${esc(token)}/exercise/${bws.exercises[0]?.id || ""}`;
      return `<a href="${link}" class="arch-item${bws.completedCount === 5 ? " all-done" : ""}">
        <div class="arch-date">${fmtDate(bws.board.date)}</div>
        <div class="arch-topic">${esc(bws.board.topic)}</div>
        <div class="arch-score">${bws.completedCount}/5</div>
      </a>`;
    })
    .join("");

  return `<div class="archive-section">
    <div class="section-head">
      <span>Ediciones Anteriores</span>
    </div>
    <div class="arch-list">${items}</div>
  </div>`;
}

export function renderDashboard(
  user: User,
  todaysBoard: BoardWithStatus | null,
  activityData: ActivityDay[],
  currentStreak: number,
  longestStreak: number,
  recentBoards: BoardWithStatus[]
): string {
  // Filter out today's board from archive
  const today = new Date().toISOString().slice(0, 10);
  const archives = recentBoards.filter((b) => b.board.date !== today);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;
      --cell-empty:#EBEDF0;--cell-1:#9BE9A8;--cell-2:#40C463;--cell-3:#30A14E;--cell-4:#216E39;
      --correct:#2D6A4F}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
      --correct:#40C463}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353;
      --correct:#40C463}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    a{color:var(--fg);text-decoration:none}

    .shell{max-width:960px;margin:0 auto;padding:24px}

    /* MASTHEAD */
    .masthead{border-bottom:4px double var(--fg);padding-bottom:10px;margin-bottom:6px}
    .mast-top{display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:14px}
    .masthead h1{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;line-height:.88;letter-spacing:-2px;text-align:center}
    .masthead .tag{text-align:center;font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:var(--n500);margin-top:8px;text-transform:uppercase}

    /* NAV */
    .nav{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--fg);margin-bottom:20px;font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px}
    .nav a{border-bottom:1px solid var(--muted);transition:border-color .2s}.nav a:hover{border-bottom-color:var(--red)}
    .btn-icon{background:none;border:1px solid var(--fg);color:var(--fg);width:30px;height:30px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;vertical-align:middle;margin-left:6px}
    .btn-icon:hover{background:var(--fg);color:var(--bg)}

    /* STATS ROW */
    .stats-row{display:grid;grid-template-columns:auto auto 1fr;border:1px solid var(--fg);margin-bottom:24px}
    .stat-cell{padding:16px 24px;border-right:1px solid var(--fg);text-align:center}
    .stat-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:500;line-height:1}
    .stat-lbl{font-family:'Inter',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-top:4px}
    .stat-heatmap{padding:12px 16px;display:flex;align-items:center;overflow-x:auto}

    /* TODAY'S BOARD */
    .today-section{margin-bottom:28px}
    .section-head{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:2px solid var(--fg);margin-bottom:16px;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .section-head span:last-child{font-weight:400;color:var(--n500);letter-spacing:1px;font-size:10px}
    .today-topic{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:16px;line-height:1.2}

    /* PROGRESS BAR */
    .progress{margin-bottom:20px}
    .prog-bar{display:flex;gap:4px;margin-bottom:6px}
    .prog-seg{flex:1;height:6px;border-radius:3px}
    .prog-seg.filled{background:var(--correct)}
    .prog-seg.empty{background:var(--muted)}
    .prog-label{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px}

    /* EXERCISE CARDS */
    .ex-grid{display:flex;flex-direction:column;gap:8px}
    .ex-card{display:flex;align-items:center;gap:16px;padding:14px 18px;border:1px solid var(--muted);transition:all .15s;cursor:pointer}
    .ex-card.available:hover{border-color:var(--fg)}
    .ex-card.completed{background:color-mix(in srgb, var(--correct) 6%, var(--bg))}
    .ex-num{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid var(--muted);border-radius:50%;color:var(--n500);flex-shrink:0}
    .ex-card.completed .ex-num{border-color:var(--correct);color:var(--correct)}
    .ex-info{flex:1;min-width:0}
    .ex-type{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
    .ex-status{font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--red);font-weight:600;flex-shrink:0}
    .ex-score{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;color:var(--correct);flex-shrink:0}

    /* NO BOARD */
    .no-board{padding:48px 24px;text-align:center;border:1px solid var(--muted)}
    .no-board p{font-size:15px;color:var(--n600);line-height:1.7}
    .no-board .title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-bottom:8px;color:var(--fg)}

    /* ARCHIVE */
    .archive-section{margin-bottom:28px}
    .arch-list{border:1px solid var(--muted);border-top:none}
    .arch-item{display:flex;align-items:center;gap:16px;padding:12px 18px;border-top:1px solid var(--muted);transition:background .15s}
    .arch-item:hover{background:var(--n100)}
    .arch-item.all-done{opacity:.7}
    .arch-date{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;min-width:160px;flex-shrink:0}
    .arch-topic{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .arch-score{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--n500);flex-shrink:0}

    /* FOOTER */
    .ornament{text-align:center;padding:24px 0 6px;font-family:'Playfair Display',serif;font-size:16px;color:var(--muted);letter-spacing:.8em}
    .footer{text-align:center;padding:8px 0 20px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .masthead h1{font-size:36px}
      .stats-row{grid-template-columns:1fr 1fr}
      .stat-heatmap{grid-column:1/-1;border-top:1px solid var(--fg);border-right:none}
      .stat-cell:nth-child(2){border-right:none}
      .arch-date{min-width:auto;font-size:10px}
      .arch-topic{font-size:14px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <header class="masthead">
      <div class="mast-top">
        <span>Vol. 1 &middot; ${todayLong()}</span>
        <span>Ed. Digital</span>
      </div>
      <h1>The IELTS Daily</h1>
      <div class="tag">Read &middot; Write &middot; Improve &middot; Repeat</div>
    </header>

    <nav class="nav">
      <span>Hola, ${esc(user.name)}</span>
      <span>
        <a href="/s/${esc(user.token)}/stats">Estad&iacute;sticas</a>
        <button class="btn-icon" onclick="toggleTheme()" id="themeBtn"></button>
      </span>
    </nav>

    <!-- STATS -->
    <div class="stats-row">
      <div class="stat-cell">
        <div class="stat-num" style="color:${currentStreak > 0 ? "var(--red)" : "var(--fg)"}">${currentStreak}</div>
        <div class="stat-lbl">Racha actual</div>
      </div>
      <div class="stat-cell">
        <div class="stat-num">${longestStreak}</div>
        <div class="stat-lbl">Mejor racha</div>
      </div>
      <div class="stat-heatmap">${buildHeatmap(activityData)}</div>
    </div>

    <!-- TODAY'S BOARD -->
    <div class="today-section">
      <div class="section-head">
        <span>Ejercicios de hoy</span>
        ${todaysBoard ? `<span>${fmtDate(todaysBoard.board.date)}</span>` : ""}
      </div>
      ${
        todaysBoard
          ? `<div class="today-topic">${esc(todaysBoard.board.topic)}</div>
             ${renderProgressBar(todaysBoard)}
             <div class="ex-grid">${renderExerciseCards(todaysBoard, user.token)}</div>`
          : `<div class="no-board">
               <div class="title">Sin tablero todav&iacute;a</div>
               <p>Los ejercicios de hoy se generar&aacute;n pronto. Vuelve m&aacute;s tarde.</p>
             </div>`
      }
    </div>

    <!-- ARCHIVE -->
    ${renderArchive(archives, user.token)}

    <div class="ornament">&#x2727; &#x2727; &#x2727;</div>
    <div class="footer">The IELTS Daily &middot; Read &middot; Write &middot; Improve &middot; Repeat</div>

  </div>
  <script>
    function isDark(){var t=localStorage.getItem('theme')||'auto';return t==='dark'?true:t==='light'?false:window.matchMedia('(prefers-color-scheme:dark)').matches}
    function updateIcon(){var b=document.getElementById('themeBtn');if(b)b.textContent=isDark()?'\\u2600':'\\u263E'}
    function toggleTheme(){var c=localStorage.getItem('theme')||'auto',pd=window.matchMedia('(prefers-color-scheme:dark)').matches;
      var n=c==='auto'?(pd?'light':'dark'):c==='dark'?'light':'dark';localStorage.setItem('theme',n);
      document.documentElement.removeAttribute('data-theme');if(n==='dark')document.documentElement.setAttribute('data-theme','dark');else if(n==='light')document.documentElement.setAttribute('data-theme','light');updateIcon()}
    updateIcon();
  </script>
</body>
</html>`;
}
