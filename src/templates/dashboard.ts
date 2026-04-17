import type { User, BoardWithStatus, ActivityDay, ExerciseType, ExerciseWithStatus } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function spanishDate(): string {
  const d = new Date();
  const weekday = d.toLocaleDateString("es-ES", { weekday: "long" });
  const day = d.getDate();
  const month = d.toLocaleDateString("es-ES", { month: "long" });
  const year = d.getFullYear();
  return `${weekday.toUpperCase()}, ${day} DE ${month.toUpperCase()} DE ${year}`;
}

function fmtDateShort(d: string): string {
  const date = new Date(d + "T12:00:00");
  const wd = date.toLocaleDateString("es-ES", { weekday: "short" });
  const day = date.getDate();
  const mo = date.toLocaleDateString("es-ES", { month: "short" });
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)} ${day} ${mo}`;
}

function getExcerpt(content: string, type: ExerciseType): { title: string; excerpt: string; words: string[] } {
  try {
    const parsed = JSON.parse(content);
    if (type === "long_reading" || type === "short_reading") {
      const passage = (parsed.passage || "") as string;
      return {
        title: parsed.title || "",
        excerpt: passage.length > 160 ? passage.slice(0, 160) + "\u2026" : passage,
        words: [],
      };
    }
    if (type === "writing_micro") {
      const prompt = (parsed.prompt || "") as string;
      return { title: "", excerpt: prompt.length > 100 ? prompt.slice(0, 100) + "\u2026" : prompt, words: [] };
    }
    if (type === "vocabulary") {
      const wordObjs = (parsed.words || []) as { word: string }[];
      const words = wordObjs.map(w => w.word);
      return { title: "", excerpt: "", words };
    }
    if (type === "fill_gap") {
      const text = (parsed.text || parsed.paragraph || "") as string;
      return { title: "", excerpt: text.length > 100 ? text.slice(0, 100) + "\u2026" : text, words: [] };
    }
  } catch { /* fallback */ }
  return { title: "", excerpt: "", words: [] };
}

function findByType(exercises: ExerciseWithStatus[], type: ExerciseType): ExerciseWithStatus | undefined {
  return exercises.find(e => e.type === type);
}

function exerciseHref(ex: ExerciseWithStatus, token: string): string {
  return `/s/${esc(token)}/exercise/${ex.id}`;
}

function ctaBadge(ex: ExerciseWithStatus, ctaText: string): string {
  if (ex.completed) {
    return `<span class="cta-badge done">${ex.user_score}/${ex.max_score} &middot; &#10003; Completado</span>`;
  }
  return `<span class="cta-badge">${esc(ctaText)} &rarr;</span>`;
}

function renderArchive(archives: BoardWithStatus[], token: string): string {
  if (archives.length === 0) return "";
  const items = archives.map(bws => {
    const link = `/s/${esc(token)}/exercise/${bws.exercises[0]?.id || ""}`;
    return `<a href="${link}" class="arch-item">${fmtDateShort(bws.board.date)} &middot; ${esc(bws.board.topic)} &middot; ${bws.completedCount}/${bws.exercises.length}</a>`;
  }).join("");
  return `<div class="archive-section">
    <div class="section-rule"><span class="section-label">EDICIONES ANTERIORES</span><hr></div>
    <div class="arch-list">${items}</div>
  </div>`;
}

export function renderDashboard(
  user: User,
  todaysBoard: BoardWithStatus | null,
  _activityData: ActivityDay[],
  currentStreak: number,
  _longestStreak: number,
  recentBoards: BoardWithStatus[]
): string {
  const today = new Date().toISOString().slice(0, 10);
  const archives = recentBoards.filter(b => b.board.date !== today);
  const streakText = currentStreak > 0
    ? `&#x1F525; ${currentStreak} d&iacute;as`
    : `<span class="muted-text">Sin racha</span>`;

  // Parse illustration JSON
  let imageUrl = "";
  let subheadline = "";
  if (todaysBoard?.board.illustration) {
    try {
      const illus = JSON.parse(todaysBoard.board.illustration);
      imageUrl = illus.imageUrl || "";
      subheadline = illus.subheadline || "";
    } catch {
      // legacy string — ignore
    }
  }

  // Find exercises by type
  const longReading = todaysBoard ? findByType(todaysBoard.exercises, "long_reading") : undefined;
  const shortReading = todaysBoard ? findByType(todaysBoard.exercises, "short_reading") : undefined;
  const vocabulary = todaysBoard ? findByType(todaysBoard.exercises, "vocabulary") : undefined;
  const wordSearch = todaysBoard ? findByType(todaysBoard.exercises, "word_search") : undefined;
  const fillGap = todaysBoard ? findByType(todaysBoard.exercises, "fill_gap") : undefined;
  const miniWriting = todaysBoard ? findByType(todaysBoard.exercises, "mini_writing") : undefined;
  const writing = todaysBoard ? findByType(todaysBoard.exercises, "writing_micro") : undefined;
  const hangman = todaysBoard ? findByType(todaysBoard.exercises, "hangman") : undefined;
  const numberWords = todaysBoard ? findByType(todaysBoard.exercises, "number_words") : undefined;

  // Extract content for cards
  const lrData = longReading ? getExcerpt(longReading.content, "long_reading") : { title: "", excerpt: "", words: [] };
  const srData = shortReading ? getExcerpt(shortReading.content, "short_reading") : { title: "", excerpt: "", words: [] };
  const vocabData = vocabulary ? getExcerpt(vocabulary.content, "vocabulary") : { title: "", excerpt: "", words: [] };

  // Progress dots
  const dots = todaysBoard
    ? todaysBoard.exercises.map(ex =>
        ex.completed ? `<span class="dot filled"></span>` : `<span class="dot"></span>`
      ).join("")
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;
      --correct:#2D6A4F;
      --accent-navy:#1a1a2e;--accent-green:#2d4a22;--accent-purple:#4a1942;--accent-amber:#3d2200;--accent-darkred:#1a0000;--accent-teal:#1a3a3a}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --correct:#40C463;
      --accent-navy:#8888cc;--accent-green:#6aaa5a;--accent-purple:#bb88cc;--accent-amber:#dda030;--accent-darkred:#cc6666;--accent-teal:#55aaaa}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;
      --correct:#40C463;
      --accent-navy:#8888cc;--accent-green:#6aaa5a;--accent-purple:#bb88cc;--accent-amber:#dda030;--accent-darkred:#cc6666;--accent-teal:#55aaaa}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    a{color:var(--fg);text-decoration:none}
    .muted-text{color:var(--n500)}

    .shell{max-width:960px;margin:0 auto;padding:24px}

    /* === MASTHEAD === */
    .edition-line{display:flex;justify-content:space-between;align-items:center;font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:14px;flex-wrap:wrap;gap:4px}
    .edition-line a{color:var(--n500);font-size:9px;letter-spacing:2px;margin-left:12px}
    .edition-line a:hover{color:var(--red)}
    .masthead-title{font-family:'Playfair Display',serif;font-size:52px;font-weight:900;line-height:.88;letter-spacing:-2px;text-align:center}
    .masthead-tagline{text-align:center;font-family:'Inter',sans-serif;font-size:10px;letter-spacing:4px;color:var(--n500);margin-top:10px;text-transform:uppercase}
    .double-rule{margin-top:14px;border:none;border-top:3px solid var(--fg);padding-bottom:2px;position:relative}
    .double-rule::after{content:'';display:block;margin-top:2px;border-top:1px solid var(--fg)}

    /* === TOPIC BANNER === */
    .topic-banner{padding:20px 0 16px;text-align:center}
    .topic-kicker-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .topic-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--red);white-space:nowrap;font-variant:small-caps}
    .topic-kicker-row hr{flex:1;border:none;border-top:1px solid var(--muted)}
    .progress-dots{display:flex;gap:6px;white-space:nowrap}
    .dot{width:10px;height:10px;border-radius:50%;border:1.5px solid var(--fg);display:inline-block}
    .dot.filled{background:var(--fg)}
    .topic-headline{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:1.05;letter-spacing:-1px;margin-bottom:6px}
    .topic-sub{font-family:'Lora',serif;font-size:15px;font-style:italic;color:var(--n500);max-width:600px;margin:0 auto;line-height:1.5}

    /* === MAIN COLUMNS === */
    .main-cols{display:grid;grid-template-columns:58% 42%;border-top:1px solid var(--muted);margin-bottom:0}
    .col-feature{padding:20px 24px 20px 0;border-right:1px solid var(--muted)}
    .col-secondary{padding:20px 0 20px 24px}

    /* Feature image with dither */
    .feature-image{position:relative;overflow:hidden;background:var(--bg);aspect-ratio:16/9;margin-bottom:14px}
    .feature-image img{width:100%;height:100%;display:block;object-fit:cover;filter:grayscale(1) contrast(1.6) brightness(0.9);mix-blend-mode:multiply}
    .feature-image::after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,#000 1px,transparent 1px);background-size:3px 3px;opacity:0.25;pointer-events:none}
    [data-theme="dark"] .feature-image img{mix-blend-mode:screen}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .feature-image img{mix-blend-mode:screen}}
    .feature-image-placeholder{aspect-ratio:16/9;background:linear-gradient(135deg,var(--muted) 0%,var(--n100) 100%);margin-bottom:14px;display:flex;align-items:center;justify-content:center;padding:20px}
    .feature-image-placeholder span{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:var(--n500);text-align:center;text-transform:uppercase;letter-spacing:2px;opacity:0.5}

    /* Kickers */
    .kicker{font-family:'Inter',sans-serif;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px;font-variant:small-caps}
    .kicker-navy{color:var(--accent-navy)}
    .kicker-green{color:var(--accent-green)}
    .kicker-purple{color:var(--accent-purple)}
    .kicker-amber{color:var(--accent-amber)}
    .kicker-darkred{color:var(--accent-darkred)}
    .kicker-teal{color:var(--accent-teal)}

    /* Story blocks */
    .story-title{font-family:'Playfair Display',serif;font-weight:700;line-height:1.2;margin-bottom:6px}
    .story-title.lg{font-size:26px}
    .story-title.md{font-size:18px}
    .story-lead{font-family:'Lora',serif;font-size:14px;color:var(--n500);line-height:1.6;margin-bottom:10px}
    .thin-rule{border:none;border-top:1px solid var(--muted);margin:16px 0}
    .vocab-words{font-family:'Inter',sans-serif;font-size:13px;font-weight:500;font-style:italic;color:var(--n600);margin-bottom:4px}
    .vocab-sub{font-family:'Inter',sans-serif;font-size:12px;color:var(--n500);margin-bottom:8px}

    /* Clickable story blocks */
    .story-block{display:block;text-decoration:none;color:inherit;padding:10px;margin:-10px;border-radius:2px;transition:background .18s}
    .story-block:hover{background:rgba(0,0,0,.04)}
    [data-theme="dark"] .story-block:hover{background:rgba(255,255,255,.05)}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .story-block:hover{background:rgba(255,255,255,.05)}}

    /* CTA badge (inside story-block / brief-item) */
    .cta-badge{font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:var(--red);display:inline-block;margin-top:4px;transition:transform .15s}
    .cta-badge.done{color:var(--correct)}
    .story-block:hover .cta-badge:not(.done),.brief-item:hover .cta-badge:not(.done){transform:translateX(3px)}

    /* === EN BREVE === */
    .briefs-section{border-top:1px solid var(--muted);padding-top:0;margin-bottom:24px}
    .section-rule{display:flex;align-items:center;gap:12px;padding:12px 0}
    .section-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--red);white-space:nowrap;font-variant:small-caps}
    .section-rule hr{flex:1;border:none;border-top:1px solid var(--muted)}
    .briefs-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px}
    .brief-item{display:block;text-decoration:none;color:inherit;padding:10px;margin:-10px;border-radius:2px;transition:background .18s}
    .brief-item:hover{background:rgba(0,0,0,.04)}
    [data-theme="dark"] .brief-item:hover{background:rgba(255,255,255,.05)}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .brief-item:hover{background:rgba(255,255,255,.05)}}
    .brief-desc{font-family:'Lora',serif;font-size:13px;color:var(--n500);line-height:1.5;margin-bottom:8px}

    /* === ARCHIVE === */
    .archive-section{margin-bottom:24px}
    .arch-list{display:flex;flex-wrap:wrap;gap:4px 16px;padding:8px 0}
    .arch-item{font-family:'Inter',sans-serif;font-size:12px;color:var(--n500);white-space:nowrap;font-variant:small-caps}
    .arch-item:hover{color:var(--red)}

    /* === NO BOARD === */
    .no-board{padding:48px 24px;text-align:center;border:1px solid var(--muted);margin-bottom:28px}
    .no-board p{font-size:15px;color:var(--n600);line-height:1.7}
    .no-board .title{font-family:'Playfair Display',serif;font-size:20px;font-weight:700;margin-bottom:8px;color:var(--fg)}

    /* === FOOTER === */
    .ornament{text-align:center;padding:24px 0 6px;font-family:'Playfair Display',serif;font-size:16px;color:var(--muted);letter-spacing:.8em}
    .footer{text-align:center;padding:8px 0 20px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    /* Dark mode toggle */
    .btn-icon{background:none;border:1px solid var(--fg);color:var(--fg);width:26px;height:26px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;vertical-align:middle;margin-left:6px}
    .btn-icon:hover{background:var(--fg);color:var(--bg)}

    /* === TOAST === */
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);font-family:'Inter',sans-serif;font-size:14px;font-weight:600;
      padding:12px 28px;background:var(--fg);color:var(--bg);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);
      opacity:0;transition:opacity .4s ease;z-index:1000;pointer-events:none;white-space:nowrap}
    .toast.show{opacity:1}

    /* === CONFETTI === */
    .confetti-container{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:999}
    .confetti-piece{position:absolute;top:-20px;width:10px;height:10px;opacity:0;animation:confettiFall 2.5s ease-in forwards}
    @keyframes confettiFall{
      0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}
      75%{opacity:1}
      100%{opacity:0;transform:translateY(100vh) rotate(720deg) scale(0.5)}
    }

    /* === EMAIL PROMPT MODAL === */
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2000;display:none;align-items:center;justify-content:center;padding:24px}
    .modal-overlay.open{display:flex}
    .modal-box{background:var(--bg);border:1px solid var(--muted);max-width:420px;width:100%;padding:32px 28px;text-align:center}
    .modal-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;margin-bottom:12px}
    .modal-desc{font-family:'Lora',serif;font-size:15px;color:var(--n600);line-height:1.7;margin-bottom:20px}
    .modal-input{width:100%;padding:12px;font-family:'Lora',serif;font-size:15px;border:none;border-bottom:2px solid var(--muted);background:transparent;color:var(--fg);outline:none;transition:border-color .2s;margin-bottom:16px}
    .modal-input:focus{border-bottom-color:var(--fg)}
    .modal-btn{width:100%;padding:13px;background:var(--fg);color:var(--bg);border:none;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;margin-bottom:10px;transition:opacity .15s}
    .modal-btn:hover{opacity:.85}
    .modal-btn-skip{background:none;border:none;font-family:'Inter',sans-serif;font-size:12px;color:var(--n500);cursor:pointer;text-decoration:underline;transition:color .15s}
    .modal-btn-skip:hover{color:var(--fg)}
    .modal-note{font-family:'Inter',sans-serif;font-size:11px;color:var(--n500);margin-top:12px}
    .modal-success{font-family:'Lora',serif;font-size:15px;color:var(--correct);display:none;padding:8px 0}
    .modal-error{font-family:'Inter',sans-serif;font-size:12px;color:var(--red);display:none;margin-top:6px}

    /* === GUEST NUDGE === */
    .guest-nudge{font-family:'Inter',sans-serif;font-size:12px;color:var(--n500);background:var(--n100);padding:8px 16px;text-align:center;cursor:pointer;transition:color .15s;border-bottom:1px solid var(--muted)}
    .guest-nudge:hover{color:var(--fg)}

    /* === MOBILE === */
    @media(max-width:700px){
      .shell{padding:16px 12px}
      .edition-line{flex-direction:column;align-items:flex-start;gap:2px}
      .masthead-title{font-size:36px}
      .topic-headline{font-size:32px}
      .topic-sub{font-size:13px}
      .main-cols{grid-template-columns:1fr}
      .col-feature{border-right:none;padding:16px 0;border-bottom:1px solid var(--muted)}
      .col-secondary{padding:16px 0}
      .story-title.lg{font-size:22px}
      .briefs-grid{grid-template-columns:1fr}
      .arch-list{overflow-x:auto;flex-wrap:nowrap}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    ${user.is_guest ? `<!-- GUEST NUDGE -->
    <div class="guest-nudge" id="guestNudge" onclick="document.getElementById('emailModal').classList.add('open')">
      Guarda tu progreso &mdash; ingresa tu correo para acceder desde cualquier dispositivo &rarr;
    </div>` : ""}

    <!-- EDITION LINE -->
    <div class="edition-line">
      <span>Vol. 1 &middot; ${spanishDate()}</span>
      <span>
        Hola, ${esc(user.name)} &middot; ${streakText}
        <a href="/s/${esc(user.token)}/stats">Stats</a>
        <button class="btn-icon" onclick="toggleTheme()" id="themeBtn"></button>
      </span>
    </div>

    <!-- MASTHEAD -->
    <div class="masthead-title">The IELTS Daily</div>
    <div class="masthead-tagline">Read &middot; Write &middot; Improve &middot; Repeat</div>
    <div class="double-rule"></div>

    ${todaysBoard ? `
    <!-- TOPIC BANNER -->
    <div class="topic-banner" data-board-date="${esc(todaysBoard.board.date)}">
      <div class="topic-kicker-row">
        <span class="topic-kicker">Tema del D&iacute;a</span>
        <hr>
        <div class="progress-dots">${dots}</div>
      </div>
      <div class="topic-headline">${esc(todaysBoard.board.topic)}</div>
      ${subheadline ? `<div class="topic-sub">${esc(subheadline)}</div>` : ""}
    </div>

    <!-- MAIN TWO COLUMNS -->
    <div class="main-cols">
      <div class="col-feature">
        ${imageUrl
          ? `<div class="feature-image" id="feat-img-wrap" data-topic="${esc(todaysBoard.board.topic)}"><img src="${esc(imageUrl)}" alt="${esc(todaysBoard.board.topic)}" crossorigin="anonymous" onerror="var w=document.getElementById('feat-img-wrap');var d=document.createElement('div');d.className='feature-image-placeholder';var s=document.createElement('span');s.textContent=w.dataset.topic;d.appendChild(s);w.parentNode.replaceChild(d,w)"></div>`
          : `<div class="feature-image-placeholder"><span>${esc(todaysBoard?.board.topic || "")}</span></div>`}
        ${longReading ? `
        <a href="${exerciseHref(longReading, user.token)}" class="story-block">
          <div class="kicker kicker-navy">LECTURA PRINCIPAL</div>
          <div class="story-title lg">${esc(lrData.title) || "Lectura Principal"}</div>
          <div class="story-lead">${esc(lrData.excerpt)}</div>
          ${ctaBadge(longReading, "Comenzar lectura")}
        </a>
        ` : ""}
      </div>
      <div class="col-secondary">
        ${shortReading ? `
        <a href="${exerciseHref(shortReading, user.token)}" class="story-block">
          <div class="kicker kicker-green">AN&Aacute;LISIS BREVE</div>
          <div class="story-title md">${esc(srData.title) || "Lectura Corta"}</div>
          <div class="story-lead">${esc(srData.excerpt)}</div>
          ${ctaBadge(shortReading, "Leer")}
        </a>
        <hr class="thin-rule">
        ` : ""}
        ${vocabulary ? `
        <a href="${exerciseHref(vocabulary, user.token)}" class="story-block">
          <div class="kicker kicker-purple">VOCABULARIO</div>
          <div class="vocab-words">${esc(vocabData.words.slice(0, 4).join(" \u00b7 "))}${vocabData.words.length > 4 ? " \u2026" : ""}</div>
          <div class="vocab-sub">Juego de emparejamiento &middot; ${vocabData.words.length} palabras</div>
          ${ctaBadge(vocabulary, "Jugar")}
        </a>
        ` : ""}
        ${wordSearch ? `
        <hr class="thin-rule">
        <a href="${exerciseHref(wordSearch, user.token)}" class="story-block">
          <div class="kicker kicker-teal">SOPA DE LETRAS</div>
          <div class="vocab-sub">4 palabras escondidas</div>
          ${ctaBadge(wordSearch, "Buscar")}
        </a>
        ` : ""}
      </div>
    </div>

    <!-- EN BREVE -->
    <div class="briefs-section">
      <div class="section-rule"><span class="section-label">EN BREVE</span><hr></div>
      <div class="briefs-grid">
        ${fillGap ? `<a href="${exerciseHref(fillGap, user.token)}" class="brief-item">
          <div class="kicker kicker-amber">COMPLETA LOS ESPACIOS</div>
          <div class="brief-desc">Elige las palabras correctas para el p&aacute;rrafo</div>
          ${ctaBadge(fillGap, "Comenzar")}
        </a>` : `<div></div>`}
        ${miniWriting ? `<a href="${exerciseHref(miniWriting, user.token)}" class="brief-item">
          <div class="kicker kicker-darkred">UNA FRASE</div>
          <div class="brief-desc">Escribe una oraci&oacute;n sobre el tema</div>
          ${ctaBadge(miniWriting, "Escribir")}
        </a>` : `<div></div>`}
        ${writing ? `<a href="${exerciseHref(writing, user.token)}" class="brief-item">
          <div class="kicker kicker-darkred">MICRO ESCRITURA</div>
          <div class="brief-desc">Escribe 2-3 oraciones sobre el tema de hoy</div>
          ${ctaBadge(writing, "Escribir")}
        </a>` : `<div></div>`}
        ${hangman ? `<a href="${exerciseHref(hangman, user.token)}" class="brief-item">
          <div class="kicker kicker-amber">HANGMAN</div>
          <div class="brief-desc">Adivina la palabra letra por letra</div>
          ${ctaBadge(hangman, "Jugar")}
        </a>` : `<div></div>`}
        ${numberWords ? `<a href="${exerciseHref(numberWords, user.token)}" class="brief-item">
          <div class="kicker kicker-darkred">N&Uacute;MEROS EN PALABRAS</div>
          <div class="brief-desc">Escribe los n&uacute;meros con letras en ingl&eacute;s</div>
          ${ctaBadge(numberWords, "Comenzar")}
        </a>` : `<div></div>`}
      </div>
    </div>
    ` : `
    <div class="no-board">
      <div class="title">Sin tablero todav&iacute;a</div>
      <p>Los ejercicios de hoy se generar&aacute;n pronto. Vuelve m&aacute;s tarde.</p>
    </div>
    `}

    <!-- ARCHIVE -->
    ${renderArchive(archives, user.token)}

    <div class="ornament">&#x2727; &#x2727; &#x2727;</div>
    <div class="footer">The IELTS Daily &middot; Read &middot; Write &middot; Improve &middot; Repeat</div>

  </div>
  ${todaysBoard && todaysBoard.completedCount > 0 ? `<div class="toast" id="toast">${todaysBoard.completedCount} de ${todaysBoard.exercises.length} completados${todaysBoard.completedCount === todaysBoard.exercises.length ? " \\u2014 \\u00a1Felicidades! \\ud83c\\udf89" : ""}</div>` : ""}
  ${todaysBoard && todaysBoard.completedCount === todaysBoard.exercises.length ? `<div class="confetti-container" id="confetti"></div>` : ""}
  <script>
    function isDark(){var t=localStorage.getItem('theme')||'auto';return t==='dark'?true:t==='light'?false:window.matchMedia('(prefers-color-scheme:dark)').matches}
    function updateIcon(){var b=document.getElementById('themeBtn');if(b)b.textContent=isDark()?'\\u2600':'\\u263E'}
    function toggleTheme(){var c=localStorage.getItem('theme')||'auto',pd=window.matchMedia('(prefers-color-scheme:dark)').matches;
      var n=c==='auto'?(pd?'light':'dark'):c==='dark'?'light':'dark';localStorage.setItem('theme',n);
      document.documentElement.removeAttribute('data-theme');if(n==='dark')document.documentElement.setAttribute('data-theme','dark');else if(n==='light')document.documentElement.setAttribute('data-theme','light');updateIcon()}
    updateIcon();

    /* Toast */
    (function(){
      var toast=document.getElementById('toast');
      if(!toast)return;
      setTimeout(function(){toast.classList.add('show')},300);
      setTimeout(function(){toast.classList.remove('show')},3300);
    })();

    /* Confetti */
    (function(){
      var box=document.getElementById('confetti');
      if(!box)return;
      var key='confetti_shown_'+document.querySelector('[data-board-date]')?.getAttribute('data-board-date');
      if(key&&sessionStorage.getItem(key))return;
      var colors=['#CC0000','#F59E0B','#2D6A4F','#4A1942','#1A1A2E','#E8E8E4'];
      var shapes=['border-radius:50%','border-radius:2px','border-radius:50%;width:6px;height:14px'];
      for(var i=0;i<40;i++){
        var el=document.createElement('div');
        el.className='confetti-piece';
        el.style.cssText='left:'+Math.random()*100+'%;background:'+colors[i%colors.length]+';'+shapes[i%shapes.length]+';animation-delay:'+(Math.random()*1.2).toFixed(2)+'s;animation-duration:'+(2+Math.random()*1.5).toFixed(2)+'s';
        box.appendChild(el);
      }
      if(key)sessionStorage.setItem(key,'1');
      setTimeout(function(){box.remove()},4000);
    })();

    /* Email prompt modal */
    (function(){
      var isGuest = ${user.is_guest ? "true" : "false"};
      if (!isGuest) return;
      var modal = document.getElementById('emailModal');
      if (!modal) return;
      var pending = sessionStorage.getItem('emailPromptPending');
      if (pending === '1') {
        sessionStorage.removeItem('emailPromptPending');
        if (!localStorage.getItem('email_prompt_dismissed')) {
          modal.classList.add('open');
        }
      }
      document.getElementById('emailModalSkip').addEventListener('click', function() {
        localStorage.setItem('email_prompt_dismissed', '1');
        modal.classList.remove('open');
      });
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('open'); });
      document.getElementById('emailModalForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var emailVal = document.getElementById('emailModalInput').value.trim();
        var errEl = document.getElementById('emailModalErr');
        var successEl = document.getElementById('emailModalSuccess');
        if (!emailVal || !emailVal.includes('@')) { errEl.textContent = 'Por favor ingresa un correo válido.'; errEl.style.display = 'block'; return; }
        errEl.style.display = 'none';
        var btn = document.getElementById('emailModalSubmit');
        btn.disabled = true; btn.textContent = 'Guardando...';
        fetch('/s/${esc(user.token)}/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailVal })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.ok) {
            successEl.style.display = 'block';
            document.getElementById('emailModalFormContent').style.display = 'none';
            localStorage.setItem('email_prompt_dismissed', '1');
            setTimeout(function() { modal.classList.remove('open'); }, 2000);
          } else {
            errEl.textContent = d.error || 'Error al guardar.'; errEl.style.display = 'block';
            btn.disabled = false; btn.textContent = 'Guardar progreso';
          }
        })
        .catch(function() { errEl.textContent = 'Error de conexión.'; errEl.style.display = 'block'; btn.disabled = false; btn.textContent = 'Guardar progreso'; });
      });
    })();
  </script>

  ${user.is_guest ? `<div class="modal-overlay" id="emailModal">
    <div class="modal-box">
      <div class="modal-title">¡Buen trabajo!</div>
      <div id="emailModalFormContent">
        <div class="modal-desc">Guarda tu progreso y recibe el ejercicio diario en tu correo &mdash; completamente opcional.</div>
        <form id="emailModalForm">
          <input class="modal-input" id="emailModalInput" type="email" placeholder="Tu correo electrónico" autocomplete="email">
          <div class="modal-error" id="emailModalErr"></div>
          <button type="submit" class="modal-btn" id="emailModalSubmit">Guardar progreso</button>
          <button type="button" class="modal-btn-skip" id="emailModalSkip">Ahora no</button>
          <div class="modal-note">Sin spam. Cancela cuando quieras.</div>
        </form>
      </div>
      <div class="modal-success" id="emailModalSuccess">¡Listo! Tu progreso está guardado.</div>
    </div>
  </div>` : ""}

</body>
</html>`;
}
