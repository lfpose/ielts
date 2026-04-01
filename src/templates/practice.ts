import type { DailyPractice, Submission, User } from "../db.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nl2p(text: string): string {
  return esc(text)
    .split("\n\n")
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const SHARED_HEAD = `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root { --bg:#F9F9F7; --fg:#111; --muted:#E5E5E0; --red:#CC0000; --n100:#F5F5F5; --n500:#737373; --n600:#525252; }
    [data-theme="dark"] { --bg:#111; --fg:#E8E8E4; --muted:#2A2A28; --red:#FF4444; --n100:#1A1A1A; --n500:#888; --n600:#AAA; }
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;}}
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
    .meta-bar a{color:var(--fg);text-decoration:none;border-bottom:1px solid var(--muted)}
    .meta-bar a:hover{border-bottom-color:var(--red)}
    .section{border:1px solid var(--fg);margin-bottom:24px}
    .section-head{padding:10px 20px;border-bottom:1px solid var(--fg);background:var(--n100);
      font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px}
    .section-body{padding:24px 20px}
    .section-body p{margin-bottom:16px;line-height:1.75;text-align:justify}
    .question-block{margin-bottom:20px}
    .question-block p{margin-bottom:12px;line-height:1.7;text-align:left}
    textarea{width:100%;min-height:200px;background:transparent;border:none;border-bottom:2px solid var(--fg);
      font-family:'Lora',serif;font-size:15px;color:var(--fg);padding:12px 4px;resize:vertical;outline:none;border-radius:0}
    textarea:focus{background:var(--n100)}
    .btn{font-family:'Inter',sans-serif;background:var(--fg);color:var(--bg);border:1px solid transparent;
      padding:12px 36px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;cursor:pointer;border-radius:0;transition:all .2s}
    .btn:hover{background:var(--bg);color:var(--fg);border-color:var(--fg)}
    .btn-row{text-align:center;padding:20px 0}
    .feedback-box{border:1px solid var(--fg);margin-top:24px}
    .feedback-box .section-head{background:var(--fg);color:var(--bg)}
    .feedback-box .section-body p{text-align:left}
    .score-big{font-family:'Playfair Display',serif;font-size:64px;font-weight:900;text-align:center;padding:24px 0;border-bottom:1px solid var(--muted)}
    .done-msg{text-align:center;padding:48px 24px;font-style:italic;color:var(--n500)}
    .footer{text-align:center;padding:32px 0;font-family:'Playfair Display',serif;font-size:18px;color:var(--muted);letter-spacing:.6em}
    .nav-link{font-family:'Inter',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:2px}
    @media(max-width:600px){.shell{padding:16px 12px}.masthead h1{font-size:28px}}
  </style>
  <script>
    (function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');
    else if(t==='light')document.documentElement.setAttribute('data-theme','light');})();
  </script>`;

export function renderPracticePage(
  user: User,
  practice: DailyPractice,
  existingSubmission: Submission | null
): string {
  const dateLabel = new Date(practice.date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const hasSubmitted = existingSubmission?.score != null;

  return `<!DOCTYPE html>
<html>
<head>
  <title>IELTS Daily &mdash; Practice</title>
  ${SHARED_HEAD}
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <h1>The IELTS Daily</h1>
      <div class="sub">${esc(dateLabel)}</div>
    </header>

    <div class="meta-bar">
      <span>Hola, ${esc(user.name)}</span>
      <span><a href="/s/${esc(user.token)}" class="nav-link">&larr; Portada</a> &middot; <a href="/stats/${esc(user.token)}" class="nav-link">Estad&iacute;sticas</a></span>
    </div>

    ${practice.type === "reading" ? renderReadingPractice(practice, user, existingSubmission, hasSubmitted) : ""}

    <div class="footer">&#x2727; &#x2727; &#x2727;</div>
  </div>
</body>
</html>`;
}

function renderReadingPractice(
  practice: DailyPractice,
  user: User,
  submission: Submission | null,
  hasSubmitted: boolean
): string {
  return `
    <!-- ARTICLE -->
    <div class="section">
      <div class="section-head">Lectura &mdash; ${esc(practice.article_title || "")}</div>
      <div class="section-body">
        ${practice.passage ? nl2p(practice.passage) : ""}
        ${practice.article_url ? `<p style="margin-top:16px;font-family:'Inter',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:1px;text-align:left;">
          <a href="${esc(practice.article_url)}" target="_blank" style="color:var(--fg);border-bottom:1px solid var(--muted);">Fuente: ${esc(practice.article_source || "")}</a>
        </p>` : ""}
      </div>
    </div>

    <!-- QUESTIONS -->
    <div class="section">
      <div class="section-head">Preguntas</div>
      <div class="section-body">
        <div class="question-block">
          ${practice.questions ? nl2p(practice.questions) : ""}
        </div>
      </div>
    </div>

    ${hasSubmitted ? renderFeedback(submission!) : renderAnswerForm(user)}
  `;
}

function renderAnswerForm(user: User): string {
  return `
    <form method="POST" action="/practice/${esc(user.token)}">
      <div class="section">
        <div class="section-head">Tus Respuestas</div>
        <div class="section-body">
          <p style="font-style:italic;color:var(--n500);font-size:14px;margin-bottom:16px;text-align:left;">
            Escribe tus respuestas abajo. Numera cada respuesta (1, 2, 3...).
          </p>
          <textarea name="answers" placeholder="1. True&#10;2. B&#10;3. atmosphere&#10;..." required></textarea>
        </div>
      </div>
      <div class="btn-row">
        <button type="submit" class="btn">Enviar Respuestas</button>
      </div>
    </form>
  `;
}

function renderFeedback(submission: Submission): string {
  return `
    <div class="feedback-box">
      <div class="section-head">Resultados</div>
      <div class="score-big">${esc(submission.score || "")}</div>
      <div class="section-body">
        ${submission.feedback ? nl2p(submission.feedback) : ""}
      </div>
    </div>
  `;
}

export function renderNoPracticePage(user: User): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>IELTS Daily</title>
  ${SHARED_HEAD}
</head>
<body>
  <div class="shell">
    <header class="masthead">
      <h1>The IELTS Daily</h1>
      <div class="sub">practice</div>
    </header>
    <div class="meta-bar">
      <span>Hola, ${esc(user.name)}</span>
      <span><a href="/s/${esc(user.token)}" class="nav-link">&larr; Portada</a> &middot; <a href="/stats/${esc(user.token)}" class="nav-link">Estad&iacute;sticas</a></span>
    </div>
    <div class="done-msg">
      No hay pr&aacute;ctica disponible hoy todav&iacute;a.<br>
      Vuelve m&aacute;s tarde o revisa tu email para el enlace del d&iacute;a.
    </div>
    <div class="footer">&#x2727; &#x2727; &#x2727;</div>
  </div>
</body>
</html>`;
}
