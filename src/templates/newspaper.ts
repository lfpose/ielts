import type { User, PracticeWithStatus, ActivityDay } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function excerpt(text: string | null, words = 35): string {
  if (!text) return "";
  const w = text.split(/\s+/).slice(0, words).join(" ");
  return w + (text.split(/\s+/).length > words ? "\u2026" : "");
}

function fmtDate(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

const todayLong = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

function buildMiniHeatmap(activityData: ActivityDay[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityMap = new Map<string, ActivityDay>();
  for (const d of activityData) activityMap.set(d.date, d);
  const weeks = 16;
  const cs = 10, cg = 2, step = cs + cg;
  const w = weeks * step + 20, h = 7 * step + 16;
  const start = new Date(today);
  start.setDate(start.getDate() - weeks * 7 + (7 - start.getDay()));
  let cells = "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mLabels: Array<{x:number;l:string}> = [];
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
        fill = sn >= 8 ? "var(--cell-4)" : sn >= 6 ? "var(--cell-3)" : sn >= 4 ? "var(--cell-2)" : "var(--cell-1)";
      }
      cells += `<rect x="${x}" y="${y}" width="${cs}" height="${cs}" fill="${fill}" rx="1"><title>${ds}${a?.submitted ? " — " + a.score : ""}</title></rect>`;
      if (day === 0 && d.getMonth() !== lastM) { lastM = d.getMonth(); mLabels.push({ x, l: months[d.getMonth()] }); }
    }
  }
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" style="max-width:${w}px;">${mLabels.map(m => `<text x="${m.x}" y="10" fill="var(--n500)" font-size="8" font-family="'Inter',sans-serif">${m.l}</text>`).join("")}${cells}</svg>`;
}

export function renderNewspaper(
  user: User,
  todayPractices: PracticeWithStatus[],
  archivePractices: PracticeWithStatus[],
  currentStreak: number,
  longestStreak: number,
  totalDone: number,
  activityData: ActivityDay[]
): string {
  const reading = todayPractices.find((p) => p.slot === "reading");
  const writing = todayPractices.find((p) => p.slot === "writing");
  const news = todayPractices.find((p) => p.slot === "news");

  const archiveItems = archivePractices.slice(0, 6).map((p) => `
    <a href="/practice/${esc(user.token)}?id=${p.id}" class="story${p.completed ? " done" : ""}">
      <div class="story-meta">${fmtDate(p.date)} &middot; ${esc(p.article_source || "")}</div>
      <div class="story-title">${esc(p.article_title || "Practice")}</div>
      ${p.completed ? `<div class="story-score">${esc(p.score || "")} &#10003;</div>` : '<div class="story-cta">Pendiente</div>'}
    </a>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;
      --cell-empty:#EBEDF0;--cell-1:#9BE9A8;--cell-2:#40C463;--cell-3:#30A14E;--cell-4:#216E39}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --cell-empty:#1A1A1A;--cell-1:#0E4429;--cell-2:#006D32;--cell-3:#26A641;--cell-4:#39D353}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");transition:background .2s,color .2s}
    a{color:var(--fg);text-decoration:none}
    .shell{max-width:960px;margin:0 auto;padding:24px}

    .masthead{border-bottom:4px double var(--fg);padding-bottom:10px;margin-bottom:6px}
    .mast-top{display:flex;justify-content:space-between;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:14px}
    .masthead h1{font-family:'Playfair Display',serif;font-size:60px;font-weight:900;line-height:.88;letter-spacing:-2px;text-align:center}
    .masthead .tag{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:4px;color:var(--n500);margin-top:8px;text-transform:uppercase}

    .nav{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--fg);margin-bottom:20px;font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px}
    .nav a{border-bottom:1px solid var(--muted);transition:border-color .2s}.nav a:hover{border-bottom-color:var(--red)}
    .btn-icon{background:none;border:1px solid var(--fg);color:var(--fg);width:30px;height:30px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;border-radius:0;transition:all .15s;vertical-align:middle;margin-left:6px}
    .btn-icon:hover{background:var(--fg);color:var(--bg)}

    /* STATS BAR */
    .stats-bar{display:grid;grid-template-columns:auto auto 1fr;border:1px solid var(--fg);margin-bottom:20px}
    .sbar-stat{padding:16px 20px;border-right:1px solid var(--fg);text-align:center}
    .sbar-stat .num{font-family:'Playfair Display',serif;font-size:36px;font-weight:900;line-height:1}
    .sbar-stat .lbl{font-family:'Inter',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-top:2px}
    .sbar-graph{padding:12px 16px;display:flex;align-items:center;overflow-x:auto}

    /* MAIN GRID: 8 / 4 newspaper columns */
    .main-grid{display:grid;grid-template-columns:8fr 4fr;border:1px solid var(--fg);margin-bottom:20px}

    /* LEAD (reading) */
    .lead{padding:24px;border-right:1px solid var(--fg)}
    .lead .kicker{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--red);font-weight:700;margin-bottom:10px}
    .lead h2{font-family:'Playfair Display',serif;font-size:32px;font-weight:900;line-height:1.1;letter-spacing:-0.5px;margin-bottom:12px}
    .lead .src{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px}
    .lead .blurb{font-size:15px;line-height:1.75;color:var(--n600);margin-bottom:20px;text-align:justify}
    .lead .blurb::first-letter{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;float:left;line-height:1;margin:0 8px -4px 0;color:var(--fg)}
    .begin-btn{display:inline-block;background:var(--fg);color:var(--bg);padding:12px 32px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;border:1px solid transparent;transition:all .2s}
    .begin-btn:hover{background:var(--bg);color:var(--fg);border-color:var(--fg)}
    .done-badge{display:inline-block;border:2px solid var(--fg);padding:10px 24px;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500)}

    /* SIDEBAR: writing + news stacked */
    .sidebar{display:flex;flex-direction:column}
    .side-card{padding:20px;border-bottom:1px solid var(--fg);flex:1}
    .side-card:last-child{border-bottom:none}
    .side-card .kicker{font-family:'Inter',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:2.5px;color:var(--n500);font-weight:700;margin-bottom:8px}
    .side-card h3{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;line-height:1.25;margin-bottom:8px}
    .side-card .blurb{font-size:13px;line-height:1.65;color:var(--n600);margin-bottom:12px}
    .side-card .link{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;border-bottom:1px solid var(--muted);padding-bottom:1px;transition:border-color .15s}
    .side-card .link:hover{border-bottom-color:var(--red)}
    .side-card .link.done-link{color:var(--n500)}

    /* ARCHIVE */
    .archive-head{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:2px solid var(--fg);
      font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .archive-head span:last-child{font-weight:400;color:var(--n500);letter-spacing:1px}
    .archive{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--fg);border-top:none}
    .story{display:block;padding:18px;border-right:1px solid var(--fg);border-bottom:1px solid var(--fg);transition:background .15s}
    .story:nth-child(3n){border-right:none}
    .story:hover{background:var(--n100)}
    .story.done{opacity:.65}
    .story-meta{font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
    .story-title{font-family:'Playfair Display',serif;font-size:15px;font-weight:700;line-height:1.3;margin-bottom:6px}
    .story-score{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--n500)}
    .story-cta{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--red);font-weight:600}

    .ornament{text-align:center;padding:24px 0 6px;font-family:'Playfair Display',serif;font-size:16px;color:var(--muted);letter-spacing:.8em}
    .footer{text-align:center;padding:8px 0 20px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    .empty-slot{padding:24px;text-align:center;font-style:italic;color:var(--n500);font-size:14px}

    @media(max-width:768px){
      .shell{padding:16px 12px}
      .masthead h1{font-size:38px}
      .main-grid{grid-template-columns:1fr}
      .lead{border-right:none;border-bottom:1px solid var(--fg)}
      .lead h2{font-size:26px}
      .stats-bar{grid-template-columns:1fr 1fr}
      .sbar-graph{grid-column:1/-1;border-top:1px solid var(--fg)}
      .archive{grid-template-columns:1fr}
      .story{border-right:none}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');else if(t==='light')document.documentElement.setAttribute('data-theme','light');})()</script>
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
        <a href="/stats/${esc(user.token)}">Estad&iacute;sticas</a>
        <button class="btn-icon" onclick="toggleTheme()" id="themeBtn"></button>
      </span>
    </nav>

    <!-- STATS BAR -->
    <div class="stats-bar">
      <div class="sbar-stat">
        <div class="num" style="color:${currentStreak > 0 ? "var(--red)" : "var(--fg)"}">${currentStreak}</div>
        <div class="lbl">Racha actual</div>
      </div>
      <div class="sbar-stat">
        <div class="num">${totalDone}</div>
        <div class="lbl">Completados</div>
      </div>
      <div class="sbar-graph">${buildMiniHeatmap(activityData)}</div>
    </div>

    <!-- MAIN: Reading lead + Writing/News sidebar -->
    <div class="main-grid">
      ${reading ? renderLeadStory(reading, user) : '<div class="lead"><div class="empty-slot">No hay lectura disponible hoy.</div></div>'}
      <div class="sidebar">
        ${writing ? renderWritingCard(writing, user) : '<div class="side-card"><div class="empty-slot">Escritura no disponible.</div></div>'}
        ${news ? renderNewsCard(news, user) : '<div class="side-card"><div class="empty-slot">Noticias no disponibles.</div></div>'}
      </div>
    </div>

    <!-- ARCHIVE -->
    ${archivePractices.length > 0 ? `
    <div class="archive-head">
      <span>Ediciones Anteriores</span>
      <span>${archivePractices.length} art&iacute;culos</span>
    </div>
    <div class="archive">${archiveItems}</div>
    ` : ""}

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

function renderLeadStory(p: PracticeWithStatus, user: User): string {
  return `<div class="lead">
    <div class="kicker">Lectura / Reading Practice</div>
    <h2>${esc(p.article_title || "")}</h2>
    <div class="src">${esc(p.article_source || "")} &middot; ${fmtDate(p.date)}</div>
    <div class="blurb">${esc(excerpt(p.passage, 55))}</div>
    ${p.completed
      ? `<span class="done-badge">Completado &mdash; ${esc(p.score || "")}</span>`
      : `<a href="/practice/${esc(user.token)}?id=${p.id}" class="begin-btn">Comenzar Lectura</a>`}
  </div>`;
}

function renderWritingCard(p: PracticeWithStatus, user: User): string {
  return `<div class="side-card">
    <div class="kicker">Escritura / Writing Task</div>
    <h3>${esc(p.article_title || "Writing Practice")}</h3>
    <div class="blurb">${esc(excerpt(p.writing_prompt || p.passage, 25))}</div>
    ${p.completed
      ? `<span class="link done-link">Completado &mdash; ${esc(p.score || "")} &#10003;</span>`
      : `<a href="/practice/${esc(user.token)}?id=${p.id}" class="link">Escribir Ensayo &rarr;</a>`}
  </div>`;
}

function renderNewsCard(p: PracticeWithStatus, _user: User): string {
  return `<div class="side-card">
    <div class="kicker">Lectura Libre / Just Read</div>
    <h3>${esc(p.article_title || "")}</h3>
    <div class="blurb">${esc(excerpt(p.passage, 25))}</div>
    <a href="${esc(p.article_url || "#")}" target="_blank" class="link">Leer Art&iacute;culo &rarr;</a>
  </div>`;
}
