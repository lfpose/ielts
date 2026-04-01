import type { User, PracticeWithStatus } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function excerpt(text: string | null, words = 40): string {
  if (!text) return "";
  const w = text.split(/\s+/).slice(0, words).join(" ");
  return w + (text.split(/\s+/).length > words ? "..." : "");
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function fmtDateShort(d: string): string {
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const todayLong = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export function renderNewspaper(
  user: User,
  practices: PracticeWithStatus[],
  currentStreak: number,
  totalDone: number
): string {
  const today = practices[0]; // most recent = today (or latest)
  const archive = practices.slice(1);

  const archiveItems = archive.map((p) => {
    const done = p.completed;
    return `
      <a href="/practice/${esc(user.token)}?date=${esc(p.date)}" class="story${done ? " done" : ""}">
        <div class="story-meta">${fmtDateShort(p.date)} &middot; ${esc(p.article_source || "Reading")}</div>
        <div class="story-title">${esc(p.article_title || "Practice")}</div>
        ${done ? `<div class="story-score">${esc(p.score || "")} &#10003;</div>` : '<div class="story-cta">Pendiente</div>'}
      </a>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    .shell{max-width:960px;margin:0 auto;padding:24px}

    /* MASTHEAD */
    .masthead{border-bottom:4px double var(--fg);padding-bottom:12px;margin-bottom:6px}
    .masthead-top{display:flex;justify-content:space-between;align-items:baseline;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:12px}
    .masthead h1{font-family:'Playfair Display',serif;font-size:64px;font-weight:900;line-height:.88;letter-spacing:-2px;text-align:center}
    .masthead .tagline{text-align:center;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:6px;color:var(--n500);margin-top:10px}

    /* NAV BAR */
    .nav{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--fg);margin-bottom:24px;font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px}
    .nav a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--muted);padding-bottom:1px;transition:border-color .2s}
    .nav a:hover{border-bottom-color:var(--red)}
    .nav .streak{display:flex;align-items:center;gap:8px}
    .nav .streak-num{font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:var(--red)}
    .btn-icon{background:none;border:1px solid var(--fg);color:var(--fg);width:32px;height:32px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;border-radius:0;transition:all .2s}
    .btn-icon:hover{background:var(--fg);color:var(--bg)}

    /* GRID LAYOUT */
    .grid{display:grid;grid-template-columns:8fr 4fr;gap:0;border:1px solid var(--fg);margin-bottom:24px}

    /* LEAD STORY */
    .lead{padding:28px 24px;border-right:1px solid var(--fg);display:flex;flex-direction:column;justify-content:space-between}
    .lead .label{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--red);font-weight:700;margin-bottom:12px}
    .lead h2{font-family:'Playfair Display',serif;font-size:36px;font-weight:900;line-height:1.1;letter-spacing:-0.5px;margin-bottom:16px}
    .lead .excerpt{font-size:16px;line-height:1.75;color:var(--n600);margin-bottom:20px;text-align:justify}
    .lead .source{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-bottom:20px}
    .lead .begin-btn{display:inline-block;background:var(--fg);color:var(--bg);text-decoration:none;padding:14px 36px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;transition:all .2s;border:1px solid transparent}
    .lead .begin-btn:hover{background:var(--bg);color:var(--fg);border-color:var(--fg)}
    .lead .done-badge{display:inline-block;border:2px solid var(--fg);padding:12px 28px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500)}

    /* SIDEBAR */
    .sidebar{display:flex;flex-direction:column}
    .sidebar-block{padding:20px;border-bottom:1px solid var(--fg);flex:1}
    .sidebar-block:last-child{border-bottom:none}
    .sidebar-block .label{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:2.5px;color:var(--n500);margin-bottom:8px}
    .sidebar-block .big-num{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;line-height:1}
    .sidebar-block .unit{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--n500);margin-top:2px}

    /* ARCHIVE GRID */
    .archive-head{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:2px solid var(--fg);margin-bottom:0;
      font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .archive{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--fg);border-top:none}
    .story{display:block;padding:20px;border-right:1px solid var(--fg);border-bottom:1px solid var(--fg);text-decoration:none;color:var(--fg);transition:background .15s}
    .story:nth-child(3n){border-right:none}
    .story:hover{background:var(--n100)}
    .story.done{opacity:.7}
    .story-meta{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    .story-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;line-height:1.3;margin-bottom:8px}
    .story-score{font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--n500)}
    .story-cta{font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--red);font-weight:600}

    .empty-archive{padding:32px;text-align:center;font-style:italic;color:var(--n500);border:1px solid var(--fg);border-top:none}

    .footer-rule{text-align:center;padding:28px 0 8px;font-family:'Playfair Display',serif;font-size:18px;color:var(--muted);letter-spacing:.8em}
    .footer{text-align:center;padding:8px 0 24px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:768px){
      .shell{padding:16px 12px}
      .masthead h1{font-size:40px}
      .grid{grid-template-columns:1fr}
      .lead{border-right:none;border-bottom:1px solid var(--fg)}
      .lead h2{font-size:28px}
      .archive{grid-template-columns:1fr}
      .story{border-right:none}
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
      <div class="masthead-top">
        <span>Vol. 1 &middot; ${todayLong()}</span>
        <span>${totalDone} ejercicios completados</span>
      </div>
      <h1>The IELTS Daily</h1>
      <div class="tagline">All the Practice That&rsquo;s Fit to Print</div>
    </header>

    <nav class="nav">
      <div class="streak">
        <span class="streak-num">${currentStreak}</span>
        <span>d&iacute;as de racha</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <a href="/stats/${esc(user.token)}">Estad&iacute;sticas</a>
        <button class="btn-icon" onclick="toggleTheme()" id="themeBtn"></button>
      </div>
    </nav>

    ${today ? renderLeadStory(today, user, currentStreak) : '<div style="padding:48px;text-align:center;font-style:italic;color:var(--n500);">No hay práctica disponible aún hoy.</div>'}

    ${archive.length > 0 ? `
      <div class="archive-head">
        <span>Ediciones Anteriores</span>
        <span style="font-weight:400;letter-spacing:1px;color:var(--n500);">&Uacute;ltimos ${archive.length}</span>
      </div>
      <div class="archive">${archiveItems}</div>
    ` : ''}

    <div class="footer-rule">&#x2727; &#x2727; &#x2727;</div>
    <div class="footer">IELTS Daily &middot; Cada d&iacute;a un paso m&aacute;s cerca</div>

  </div>
  <script>
    function isDark(){var t=localStorage.getItem('theme')||'auto';if(t==='dark')return true;if(t==='light')return false;return window.matchMedia('(prefers-color-scheme:dark)').matches}
    function updateIcon(){var b=document.getElementById('themeBtn');if(b)b.textContent=isDark()?'\\u2600':'\\u263E'}
    function toggleTheme(){var c=localStorage.getItem('theme')||'auto',pd=window.matchMedia('(prefers-color-scheme:dark)').matches;
      var n=c==='auto'?(pd?'light':'dark'):c==='dark'?'light':'dark';localStorage.setItem('theme',n);
      var h=document.documentElement;h.removeAttribute('data-theme');if(n==='dark')h.setAttribute('data-theme','dark');else if(n==='light')h.setAttribute('data-theme','light');updateIcon()}
    updateIcon();
  </script>
</body>
</html>`;
}

function renderLeadStory(practice: PracticeWithStatus, user: User, streak: number): string {
  const done = practice.completed;
  return `
    <div class="grid">
      <div class="lead">
        <div>
          <div class="label">Ejercicio de Hoy &mdash; Lectura</div>
          <h2>${esc(practice.article_title || "Today's Practice")}</h2>
          <div class="source">${esc(practice.article_source || "")} &middot; ${fmtDate(practice.date)}</div>
          <div class="excerpt">${esc(excerpt(practice.passage, 50))}</div>
        </div>
        ${done
          ? `<div><span class="done-badge">Completado &mdash; ${esc(practice.score || "")}</span></div>`
          : `<div><a href="/practice/${esc(user.token)}" class="begin-btn">Comenzar Pr&aacute;ctica</a></div>`
        }
      </div>
      <div class="sidebar">
        <div class="sidebar-block">
          <div class="label">Racha</div>
          <div class="big-num">${streak}</div>
          <div class="unit">d&iacute;as seguidos</div>
        </div>
        <div class="sidebar-block">
          <div class="label">Hoy</div>
          <div class="big-num" style="color:${done ? "var(--fg)" : "var(--red)"}">${done ? "&#10003;" : "?"}</div>
          <div class="unit">${done ? "completado" : "pendiente"}</div>
        </div>
      </div>
    </div>`;
}

