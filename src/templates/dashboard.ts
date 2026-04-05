import type { User, BoardWithStatus, ActivityDay, ExerciseType, ExerciseWithStatus } from "../db.js";

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

const EXERCISE_ACCENT: Record<ExerciseType, string> = {
  long_reading: "#1a1a2e",
  short_reading: "#2d4a22",
  vocabulary: "#4a1942",
  fill_gap: "#3d2200",
  writing_micro: "#1a0000",
};

const EXERCISE_SYMBOL: Record<ExerciseType, string> = {
  long_reading: "¶",
  short_reading: "§",
  vocabulary: "Aa",
  fill_gap: "__",
  writing_micro: "✎",
};

const EXERCISE_TIME: Record<ExerciseType, string> = {
  long_reading: "~8 min",
  short_reading: "~3 min",
  vocabulary: "~3 min",
  fill_gap: "~3 min",
  writing_micro: "~5 min",
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
  const cs = 14, cg = 3, step = cs + cg;
  const labelW = 24;
  const w = weeks * step + labelW + 4;
  const monthH = 16;
  const h = 7 * step + monthH + 4;

  // Find start: go back 16 weeks from today, align to Monday
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7) + 1);
  // Align to Monday (ISO: Mon=1)
  const dow = start.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + mondayOffset);

  // Month labels
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

  // Month labels
  for (const m of months) {
    svg += `<text x="${m.x}" y="${monthH - 3}" font-family="Inter,sans-serif" font-size="9" fill="var(--n500)">${m.label}</text>`;
  }

  // Day labels
  for (let day = 0; day < 7; day++) {
    if (day % 2 === 0) {
      svg += `<text x="0" y="${monthH + day * step + cs - 2}" font-family="Inter,sans-serif" font-size="9" fill="var(--n500)">${dayLabels[day]}</text>`;
    }
  }

  // Cells
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
        fill = sn >= 16 ? "var(--cell-4)" : sn >= 11 ? "var(--cell-3)" : sn >= 6 ? "var(--cell-2)" : "var(--cell-1)";
      }
      const isToday = ds === todayStr;
      const dayName = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      const tooltip = a?.submitted ? `${a.score} puntos · ${dayName}` : dayName;
      svg += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${fill}" rx="2"${isToday ? ` stroke="var(--red)" stroke-width="1.5"` : ""}><title>${tooltip}</title></rect>`;
    }
  }

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="max-width:${w}px;">${svg}</svg>`;
}

function getExcerpt(content: string, type: ExerciseType): { title: string; excerpt: string } {
  try {
    const parsed = JSON.parse(content);
    if (type === "long_reading" || type === "short_reading") {
      const passage = (parsed.passage || "") as string;
      return {
        title: parsed.title || "",
        excerpt: passage.length > 120 ? passage.slice(0, 120) + "\u2026" : passage,
      };
    }
    if (type === "writing_micro") {
      const prompt = (parsed.prompt || "") as string;
      return { title: "", excerpt: prompt.length > 100 ? prompt.slice(0, 100) + "\u2026" : prompt };
    }
    if (type === "vocabulary") {
      const words = (parsed.words || []) as string[];
      return { title: "", excerpt: words.slice(0, 4).join(" \u00b7 ") + (words.length > 4 ? " \u2026" : "") };
    }
    if (type === "fill_gap") {
      const text = (parsed.text || parsed.paragraph || "") as string;
      return { title: "", excerpt: text.length > 100 ? text.slice(0, 100) + "\u2026" : text };
    }
  } catch { /* fallback */ }
  return { title: "", excerpt: "" };
}

function renderExerciseCard(ex: ExerciseWithStatus, token: string, index: number): string {
  const label = EXERCISE_LABELS[ex.type] || ex.type;
  const accent = EXERCISE_ACCENT[ex.type] || "var(--fg)";
  const symbol = EXERCISE_SYMBOL[ex.type] || "";
  const time = EXERCISE_TIME[ex.type] || "";
  const link = `/s/${esc(token)}/exercise/${ex.id}`;
  const { title } = getExcerpt(ex.content, ex.type);
  const done = ex.completed;

  const statusBadge = done
    ? `<span class="ex-badge done">✓ ${ex.user_score}/${ex.max_score}</span>`
    : `<span class="ex-badge avail">Disponible</span>`;

  return `<a href="${link}" class="ex-card${done ? " ex-done" : ""}" style="--accent:${accent}">
    <div class="ex-accent"></div>
    <div class="ex-body">
      <div class="ex-head">
        <span class="ex-symbol">${esc(symbol)}</span>
        <span class="ex-type">${esc(label)}</span>
        <span class="ex-time">${esc(time)}</span>
      </div>
      ${title ? `<div class="ex-title">${esc(title)}</div>` : `<div class="ex-title">Ejercicio ${index + 1}</div>`}
      <div class="ex-foot">${statusBadge}</div>
    </div>
  </a>`;
}

function renderProgressBar(board: BoardWithStatus): string {
  const allDone = board.completedCount === 5;
  const segments = board.exercises.map((ex) => {
    const cls = ex.completed ? (allDone ? "filled all" : "filled") : "empty";
    return `<div class="prog-seg ${cls}"></div>`;
  });
  return `<div class="progress">
    <div class="prog-bar">${segments.join("")}</div>
    <div class="prog-label">${board.completedCount} de 5 completados</div>
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
  const today = new Date().toISOString().slice(0, 10);
  const archives = recentBoards.filter((b) => b.board.date !== today);
  const warmStreak = currentStreak > 7;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
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

    .shell{max-width:1000px;margin:0 auto;padding:24px}

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

    /* TWO-COLUMN LAYOUT */
    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:28px;border:1px solid var(--muted)}
    .col-left{padding:24px;border-right:1px solid var(--muted)}
    .col-right{padding:24px}

    /* TOPIC HEADLINE */
    .topic-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:4px;color:var(--n500);margin-bottom:8px}
    .topic-headline{font-family:'Playfair Display',serif;font-size:36px;font-weight:900;line-height:1.1;margin-bottom:12px}
    .topic-meta{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px}
    .illus-box{text-align:center;margin-top:8px}
    .illus-art{font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.3;white-space:pre;overflow-x:auto;color:var(--n500);margin:0;display:inline-block;text-align:left;max-width:64ch}
    .illus-label{font-family:'Inter',sans-serif;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px;margin-top:6px}

    /* STREAK WIDGET */
    .streak-widget{margin-bottom:20px;padding:16px;border:1px solid var(--muted);text-align:center}
    .streak-widget.warm{background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.3)}
    .streak-fire{font-size:24px;line-height:1}
    .streak-num{font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:700;line-height:1.1}
    .streak-label{font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-top:2px}
    .streak-record{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);margin-top:8px}
    .streak-motive{font-family:'Lora',serif;font-size:13px;font-style:italic;color:var(--n500);margin-top:8px}

    /* PROGRESS BAR */
    .progress{margin-bottom:20px}
    .prog-bar{display:flex;gap:4px;margin-bottom:6px}
    .prog-seg{flex:1;height:8px;border-radius:4px}
    .prog-seg.filled{background:var(--fg)}
    .prog-seg.filled.all{background:var(--correct)}
    .prog-seg.empty{background:var(--muted);border:1px solid color-mix(in srgb,var(--muted) 70%,var(--fg))}
    .prog-label{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px}

    /* SECTION HEAD */
    .section-head{display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:2px solid var(--fg);margin-bottom:16px;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .section-head span:last-child{font-weight:400;color:var(--n500);letter-spacing:1px;font-size:10px}

    /* EXERCISE CARDS */
    .ex-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
    .ex-card{display:flex;border:1px solid var(--muted);transition:all .15s;cursor:pointer;text-decoration:none;color:var(--fg)}
    .ex-card:hover{border-color:var(--fg);transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.06)}
    .ex-card.ex-done{background:#f0f7f0}
    [data-theme="dark"] .ex-card.ex-done{background:rgba(45,106,79,0.1)}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .ex-card.ex-done{background:rgba(45,106,79,0.1)}}
    .ex-accent{width:4px;flex-shrink:0;background:var(--accent)}
    .ex-body{flex:1;padding:16px}
    .ex-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .ex-symbol{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;color:var(--accent);opacity:0.7}
    .ex-type{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--accent)}
    .ex-time{font-family:'Inter',sans-serif;font-size:10px;color:var(--n500);margin-left:auto}
    .ex-title{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;line-height:1.25;margin-bottom:8px}
    .ex-foot{display:flex;justify-content:flex-end}
    .ex-badge{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:3px 8px}
    .ex-badge.avail{color:var(--n500);border:1px solid var(--muted)}
    .ex-badge.done{color:var(--correct);border:1px solid var(--correct);font-family:'JetBrains Mono',monospace}

    /* HEATMAP SECTION */
    .heatmap-section{margin-bottom:28px}
    .heatmap-wrap{padding:16px;border:1px solid var(--muted);overflow-x:auto}

    /* NO BOARD */
    .no-board{padding:48px 24px;text-align:center;border:1px solid var(--muted);margin-bottom:28px}
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
      .two-col{grid-template-columns:1fr;border:none}
      .col-left{border-right:none;border-bottom:1px solid var(--muted);padding:16px 0}
      .col-right{padding:16px 0}
      .topic-headline{font-size:28px}
      .streak-num{font-size:36px}
      .ex-grid{grid-template-columns:1fr}
      .arch-date{min-width:auto;font-size:10px}
      .arch-topic{font-size:14px}
    }
    @media(min-width:601px) and (max-width:800px){
      .ex-grid{grid-template-columns:repeat(2,1fr)}
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

    ${todaysBoard ? `
    <!-- TWO-COLUMN: TOPIC + STREAK -->
    <div class="two-col">
      <div class="col-left">
        <div class="topic-kicker">Tema del D&iacute;a</div>
        <div class="topic-headline">${esc(todaysBoard.board.topic)}</div>
        <div class="topic-meta">5 ejercicios &middot; ~20 min</div>
        ${todaysBoard.board.illustration ? `<div class="illus-box">
          <pre class="illus-art">${esc(todaysBoard.board.illustration)}</pre>
          <div class="illus-label">Ilustraci&oacute;n generada por IA</div>
        </div>` : ""}
      </div>
      <div class="col-right">
        <div class="streak-widget${warmStreak ? " warm" : ""}">
          <div class="streak-fire">&#x1F525;</div>
          <div class="streak-num">${currentStreak}</div>
          <div class="streak-label">d&iacute;as seguidos</div>
          ${currentStreak === 0 ? `<div class="streak-motive">&iexcl;Empieza hoy!</div>` : ""}
          <div class="streak-record">R&eacute;cord: ${longestStreak} d&iacute;as</div>
        </div>
        ${renderProgressBar(todaysBoard)}
      </div>
    </div>

    <!-- EXERCISE CARDS -->
    <div class="today-section">
      <div class="section-head">
        <span>Ejercicios de Hoy</span>
        <span>${fmtDate(todaysBoard.board.date)}</span>
      </div>
      <div class="ex-grid">
        ${todaysBoard.exercises.map((ex, i) => renderExerciseCard(ex, user.token, i)).join("")}
      </div>
    </div>

    <!-- HEATMAP -->
    <div class="heatmap-section">
      <div class="section-head">
        <span>Actividad &mdash; &Uacute;ltimas 16 Semanas</span>
      </div>
      <div class="heatmap-wrap">${buildHeatmap(activityData)}</div>
    </div>
    ` : `
    <div class="no-board">
      <div class="title">Sin tablero todav&iacute;a</div>
      <p>Los ejercicios de hoy se generar&aacute;n pronto. Vuelve m&aacute;s tarde.</p>
    </div>

    <!-- HEATMAP -->
    <div class="heatmap-section">
      <div class="section-head">
        <span>Actividad &mdash; &Uacute;ltimas 16 Semanas</span>
      </div>
      <div class="heatmap-wrap">${buildHeatmap(activityData)}</div>
    </div>
    `}

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
