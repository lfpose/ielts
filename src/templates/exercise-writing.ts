import type { User, Exercise, Submission } from "../db.js";
import type { WritingMicroContent } from "../services/content.js";
import type { WritingFeedback } from "../services/grading.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderWritingMicro(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: WritingMicroContent = JSON.parse(exercise.content);
  const feedback: WritingFeedback | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  const scoreHtml = submission
    ? `<div class="score-display">
        <span class="score-num">${submission.score}/${exercise.max_score}</span>
      </div>`
    : '';

  const feedbackHtml = feedback ? `
    <div class="feedback-section">
      <div class="feedback-label">Retroalimentación</div>

      <div class="fb-comment">${esc(feedback.comment)}</div>

      <div class="fb-dimension">
        <span class="fb-dim-icon">${feedback.clarity.score ? '✓' : '✗'}</span>
        <strong>Claridad</strong>: ${esc(feedback.clarity.note)}
      </div>

      <div class="fb-dimension">
        <span class="fb-dim-icon">${feedback.grammar.score ? '✓' : '✗'}</span>
        <strong>Gramática</strong>${feedback.grammar.corrections.length > 0 ? '' : ': ¡Sin errores!'}
      </div>

      ${feedback.grammar.corrections.length > 0 ? feedback.grammar.corrections.map(c =>
        `<div class="fb-correction">
          <span class="corr-original">${esc(c.original)}</span>
          <span class="corr-arrow">→</span>
          <span class="corr-corrected">${esc(c.corrected)}</span>
          <span class="corr-reason">— ${esc(c.reason)}</span>
        </div>`
      ).join('') : ''}

      <div class="fb-dimension">
        <span class="fb-dim-icon">${feedback.vocabulary.score ? '✓' : '✗'}</span>
        <strong>Vocabulario</strong>: ${esc(feedback.vocabulary.note)}
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escritura — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    a{color:var(--fg);text-decoration:none}

    .shell{max-width:720px;margin:0 auto;padding:32px 24px}

    .back{display:inline-flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:24px;transition:color .15s}
    .back:hover{color:var(--fg)}

    .kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--red);margin-bottom:8px}
    .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:24px}

    .score-display{text-align:center;margin-bottom:24px;padding:16px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:var(--correct)}

    /* PROMPT BOX */
    .prompt-box{font-family:'Lora',Georgia,serif;font-style:italic;font-size:16px;line-height:1.7;padding:20px 24px;margin-bottom:24px;background:var(--n100);border-left:3px solid var(--red)}

    /* TEXTAREA */
    .writing-area{margin-bottom:8px}
    .writing-area textarea{width:100%;min-height:180px;background:transparent;border:none;border-bottom:2px solid var(--muted);font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.7;color:var(--fg);padding:12px 4px;resize:vertical;outline:none;border-radius:0;transition:border-color .15s}
    .writing-area textarea:focus{border-color:var(--fg);background:var(--n100)}

    /* WORD COUNTER */
    .word-counter{font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right;margin-bottom:24px;transition:color .2s}
    .wc-gray{color:var(--n500)}
    .wc-green{color:var(--correct)}
    .wc-orange{color:#D97706}

    /* SUBMITTED TEXT */
    .submitted-text{font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.7;padding:16px 0;margin-bottom:24px;border-bottom:1px solid var(--muted)}

    /* FEEDBACK */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .fb-comment{font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.6;margin-bottom:16px;padding:14px 16px;background:var(--n100);font-style:italic}
    .fb-dimension{font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;margin-bottom:10px;padding:8px 12px;border-left:3px solid var(--muted)}
    .fb-dim-icon{font-weight:700;margin-right:4px}
    .fb-correction{font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;margin-bottom:8px;padding:8px 12px 8px 24px;background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .corr-original{text-decoration:line-through;color:var(--red)}
    .corr-arrow{margin:0 6px;color:var(--n500)}
    .corr-corrected{color:var(--correct);font-weight:600}
    .corr-reason{font-size:12px;color:var(--n600)}

    /* SUBMIT */
    .submit-row{text-align:center;margin-top:32px}
    .btn-submit{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;background:var(--fg);color:var(--bg);border:none;cursor:pointer;transition:opacity .15s}
    .btn-submit:disabled{opacity:.3;cursor:not-allowed}
    .btn-submit:not(:disabled):hover{opacity:.85}
    .btn-back{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:1px solid var(--fg);color:var(--fg);transition:all .15s}
    .btn-back:hover{background:var(--fg);color:var(--bg)}

    .footer{text-align:center;padding:32px 0 16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .title{font-size:22px}
      .prompt-box{padding:16px;font-size:15px}
      .writing-area textarea{min-height:150px;font-size:14px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <a href="/s/${esc(user.token)}" class="back">&larr; Volver al tablero</a>

    <div class="kicker">Escritura</div>
    <h1 class="title">Escribe tu respuesta</h1>

    ${scoreHtml}

    <div class="prompt-box">${esc(content.prompt)}</div>

    ${submission ? `<div class="submitted-text">${esc((JSON.parse(submission.answers) as { text: string }).text)}</div>` : `
    <div class="writing-area">
      <textarea id="writingInput" placeholder="Escribe tu respuesta en inglés..."></textarea>
    </div>
    <div class="word-counter wc-gray" id="wordCounter">0 palabras</div>
    `}

    ${feedbackHtml}

    ${submission
      ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>`
      : `<div class="submit-row"><button type="button" class="btn-submit" id="submitBtn" disabled>Enviar respuesta</button></div>`}

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission ? '' : `<script>
(function() {
  var textarea = document.getElementById('writingInput');
  var counter = document.getElementById('wordCounter');
  var btn = document.getElementById('submitBtn');
  var MIN = 15;
  var MAX = 100;

  function countWords(text) {
    var trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\\s+/).length;
  }

  function updateCounter() {
    var count = countWords(textarea.value);
    counter.textContent = count + ' palabras';

    counter.className = 'word-counter';
    if (count < MIN) {
      counter.classList.add('wc-gray');
    } else if (count > 90) {
      counter.classList.add('wc-orange');
    } else {
      counter.classList.add('wc-green');
    }

    btn.disabled = count < MIN || count > MAX;
  }

  textarea.addEventListener('input', updateCounter);
  updateCounter();

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    fetch('/s/${esc(user.token)}/exercise/${exercise.id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { text: textarea.value } })
    })
    .then(function(r) { return r.json(); })
    .then(function() { window.location.reload(); })
    .catch(function() { btn.disabled = false; btn.textContent = 'Enviar respuesta'; });
  });
})();
</script>`}
</body>
</html>`;
}
