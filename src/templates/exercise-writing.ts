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
    ? `<div class="score-display" style="animation:slideIn 300ms ease-out both">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : '';

  const feedbackHtml = feedback ? `
    <div class="feedback-section">
      <div class="feedback-label">Retroalimentación</div>

      <div class="fb-comment" style="animation:slideIn 300ms ease-out both">${esc(feedback.comment)}</div>

      <div class="fb-card" style="animation:slideIn 300ms ease-out 50ms both">
        <div class="fb-card-header" onclick="this.parentNode.classList.toggle('open')">
          <span class="fb-card-indicator ${feedback.clarity.score ? 'ind-good' : 'ind-bad'}">${feedback.clarity.score ? '✓' : '✗'}</span>
          <strong class="fb-card-title">Claridad</strong>
          <span class="fb-card-score">${feedback.clarity.score}/1</span>
          <span class="fb-card-chevron">▸</span>
        </div>
        <div class="fb-card-body">
          <p>${esc(feedback.clarity.note)}</p>
        </div>
      </div>

      <div class="fb-card" style="animation:slideIn 300ms ease-out 100ms both">
        <div class="fb-card-header" onclick="this.parentNode.classList.toggle('open')">
          <span class="fb-card-indicator ${feedback.grammar.score ? 'ind-good' : 'ind-bad'}">${feedback.grammar.score ? '✓' : '✗'}</span>
          <strong class="fb-card-title">Gramática</strong>
          <span class="fb-card-score">${feedback.grammar.score}/1</span>
          <span class="fb-card-chevron">▸</span>
        </div>
        <div class="fb-card-body">
          ${feedback.grammar.corrections.length > 0 ? feedback.grammar.corrections.map(c =>
            `<div class="fb-correction">
              <div class="corr-line"><span class="corr-label">Escribiste:</span> <span class="corr-original">${esc(c.original)}</span></div>
              <div class="corr-line"><span class="corr-label">Mejor:</span> <span class="corr-corrected">${esc(c.corrected)}</span></div>
              <div class="corr-reason">${esc(c.reason)}</div>
            </div>`
          ).join('') : '<p>¡Sin errores gramaticales!</p>'}
        </div>
      </div>

      <div class="fb-card" style="animation:slideIn 300ms ease-out 150ms both">
        <div class="fb-card-header" onclick="this.parentNode.classList.toggle('open')">
          <span class="fb-card-indicator ${feedback.vocabulary.score ? 'ind-good' : 'ind-bad'}">${feedback.vocabulary.score ? '✓' : '✗'}</span>
          <strong class="fb-card-title">Vocabulario</strong>
          <span class="fb-card-score">${feedback.vocabulary.score}/1</span>
          <span class="fb-card-chevron">▸</span>
        </div>
        <div class="fb-card-body">
          <p>${esc(feedback.vocabulary.note)}</p>
        </div>
      </div>
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escritura — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F;--accent-darkred:#6b0f0f}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-darkred:#e05555}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-darkred:#e05555}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      transition:background .2s,color .2s}
    a{color:var(--fg);text-decoration:none}

    /* HEADER BAR */
    .header-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:24px;border-bottom:1px solid var(--muted);font-family:'Inter',sans-serif;font-size:12px}
    .header-back{display:inline-flex;align-items:center;gap:6px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);transition:color .15s;font-size:11px}
    .header-back:hover{color:var(--fg)}
    .header-center{font-weight:600;color:var(--fg);letter-spacing:1px}
    .header-right{color:var(--n500);font-size:11px;letter-spacing:1px}

    .shell{max-width:720px;margin:0 auto;padding:32px 24px}

    /* KICKER + TITLE */
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-darkred);margin-bottom:8px}
    .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:24px}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* PROMPT BOX */
    .prompt-section{margin-bottom:24px}
    .prompt-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .prompt-box{font-family:'Lora',Georgia,serif;font-style:italic;font-size:16px;line-height:1.7;padding:20px 24px;background:var(--n100);border-left:4px solid var(--red)}

    /* TEXTAREA */
    .writing-area{margin-bottom:8px}
    .writing-area textarea{width:100%;min-height:120px;background:transparent;border:none;border-bottom:2px solid var(--muted);font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.7;color:var(--fg);padding:12px 4px;resize:vertical;outline:none;border-radius:0;transition:border-color .15s}
    .writing-area textarea:focus{border-color:var(--fg);background:var(--n100)}

    /* WORD COUNTER */
    .word-counter{font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right;margin-bottom:24px;transition:color .2s;display:flex;align-items:center;justify-content:flex-end;gap:6px}
    .wc-gray{color:var(--n500)}
    .wc-green{color:var(--correct)}
    .wc-orange{color:#e67e22}
    .wc-red{color:var(--red)}
    .wc-icon{font-size:14px}
    .wc-max-msg{font-family:'Inter',sans-serif;font-size:11px;color:var(--red);text-align:right;margin-top:-16px;margin-bottom:16px}

    /* SUBMITTED TEXT */
    .submitted-text{font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.7;padding:16px 0;margin-bottom:24px;border-bottom:1px solid var(--muted)}

    /* FEEDBACK */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .fb-comment{font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.6;margin-bottom:16px;padding:14px 16px;background:var(--n100);font-style:italic;border-radius:4px}

    /* EXPANDABLE FEEDBACK CARDS */
    .fb-card{border:1px solid var(--muted);border-radius:6px;margin-bottom:10px;overflow:hidden;transition:border-color .2s}
    .fb-card:hover{border-color:var(--n500)}
    .fb-card-header{display:flex;align-items:center;gap:10px;padding:14px 16px;cursor:pointer;user-select:none;font-family:'Inter',sans-serif;font-size:14px;transition:background .15s}
    .fb-card-header:hover{background:var(--n100)}
    .fb-card-indicator{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:13px;font-weight:700;flex-shrink:0}
    .ind-good{background:color-mix(in srgb, var(--correct) 15%, var(--bg));color:var(--correct)}
    .ind-bad{background:color-mix(in srgb, var(--red) 10%, var(--bg));color:var(--red)}
    .fb-card-title{flex:1;min-width:0}
    .fb-card-score{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--n500)}
    .fb-card-chevron{font-size:12px;color:var(--n500);transition:transform .2s;flex-shrink:0}
    .fb-card.open .fb-card-chevron{transform:rotate(90deg)}
    .fb-card-body{max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;padding:0 16px}
    .fb-card.open .fb-card-body{max-height:500px;padding:0 16px 16px}
    .fb-card-body p{font-family:'Inter',sans-serif;font-size:13px;line-height:1.6;color:var(--n600)}

    /* GRAMMAR CORRECTIONS (diff-style) */
    .fb-correction{font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;margin-bottom:10px;padding:10px 12px;background:color-mix(in srgb, var(--red) 4%, var(--bg));border-radius:4px;border:1px solid color-mix(in srgb, var(--red) 12%, var(--muted))}
    .corr-line{margin-bottom:3px}
    .corr-label{font-size:11px;font-weight:600;color:var(--n500);text-transform:uppercase;letter-spacing:1px}
    .corr-original{text-decoration:line-through;color:var(--red)}
    .corr-corrected{color:var(--correct);font-weight:600}
    .corr-reason{font-size:12px;color:var(--n600);margin-top:4px;padding-top:4px;border-top:1px solid var(--muted)}

    /* SUBMIT */
    .submit-row{text-align:center;margin-top:32px}
    .btn-submit{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:none;cursor:pointer;transition:all .3s}
    .btn-submit:disabled{background:var(--muted);color:var(--n500);cursor:not-allowed}
    .btn-submit:not(:disabled){background:var(--fg);color:var(--bg)}
    .btn-submit:not(:disabled):hover{opacity:.85}
    .btn-back{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:1px solid var(--fg);color:var(--fg);transition:all .15s;animation:slideIn 300ms ease-out both}
    .btn-back:hover{background:var(--fg);color:var(--bg)}

    /* ANIMATIONS */
    @keyframes slideIn{
      from{opacity:0;transform:translateY(12px)}
      to{opacity:1;transform:translateY(0)}
    }

    .footer{text-align:center;padding:32px 0 16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .title{font-size:22px}
      .header-bar{font-size:10px}
      .header-center{font-size:11px}
      .prompt-box{padding:16px;font-size:15px}
      .writing-area textarea{min-height:120px;font-size:14px}
      .fb-card-header{padding:12px 14px;font-size:13px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 5 de 5 &middot; ~3 min</span>
      <span class="header-right">~3 min</span>
    </div>

    <div class="ex-kicker">Escritura</div>
    <h1 class="title">Escribe tu respuesta</h1>

    ${scoreHtml}

    <div class="prompt-section">
      <div class="prompt-label">Consigna</div>
      <div class="prompt-box">${esc(content.prompt)}</div>
    </div>

    ${submission ? `<div class="submitted-text">${esc((JSON.parse(submission.answers) as { text: string }).text)}</div>` : `
    <div class="writing-area">
      <textarea id="writingInput" placeholder="Escribe tu respuesta en inglés..."></textarea>
    </div>
    <div class="word-counter wc-gray" id="wordCounter"><span class="wc-text">0 palabras</span></div>
    <div class="wc-max-msg" id="maxMsg" style="display:none">Máximo: 100 palabras</div>
    `}

    ${feedbackHtml}

    ${submission
      ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>`
      : `<div class="submit-row"><button type="button" class="btn-submit" id="submitBtn" disabled>Enviar respuesta</button></div>
    <div id="thinkingAnim" style="display:none;align-items:center;gap:10px;justify-content:center;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--n500)"><span id="spinnerFrame">⠋</span><span id="spinnerMsg">Leyendo tu respuesta...</span></div>`}

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission ? `<script>
(function() {
  // Score count-up animation
  var scoreEl = document.querySelector('.score-num');
  if (scoreEl) {
    var target = parseInt(scoreEl.getAttribute('data-score') || '0', 10);
    var max = parseInt(scoreEl.getAttribute('data-max') || '3', 10);
    var duration = 600;
    var start = performance.now();
    function animate(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      scoreEl.textContent = current + '/' + max;
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  // Auto-open feedback cards
  var cards = document.querySelectorAll('.fb-card');
  cards.forEach(function(card) { card.classList.add('open'); });
})();
</script>` : `<script>
(function() {
  var textarea = document.getElementById('writingInput');
  var counter = document.getElementById('wordCounter');
  var maxMsg = document.getElementById('maxMsg');
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
    var icon = '';

    counter.className = 'word-counter';
    if (count < MIN) {
      counter.classList.add('wc-gray');
      icon = '';
    } else if (count <= 90) {
      counter.classList.add('wc-green');
      icon = '<span class="wc-icon">✓</span>';
    } else if (count <= MAX) {
      counter.classList.add('wc-orange');
      icon = '<span class="wc-icon">⚠</span>';
    } else {
      counter.classList.add('wc-red');
      icon = '<span class="wc-icon">✗</span>';
    }

    counter.innerHTML = icon + '<span class="wc-text">' + count + ' palabras</span>';

    if (count > MAX) {
      maxMsg.style.display = 'block';
    } else {
      maxMsg.style.display = 'none';
    }

    btn.disabled = count < MIN || count > MAX;
  }

  textarea.addEventListener('input', updateCounter);
  updateCounter();

  var thinkEl = document.getElementById('thinkingAnim');
  var spinEl = document.getElementById('spinnerFrame');
  var msgEl = document.getElementById('spinnerMsg');
  var spinFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  var spinMsgs = ['Leyendo tu respuesta...','Analizando gramática...','Evaluando vocabulario...','Preparando feedback...'];
  var spinTimer, msgTimer;

  function startThinking() {
    var fi = 0, mi = 0;
    thinkEl.style.display = 'flex';
    spinTimer = setInterval(function() { fi = (fi+1)%spinFrames.length; spinEl.textContent = spinFrames[fi]; }, 80);
    msgTimer = setInterval(function() { mi = (mi+1)%spinMsgs.length; msgEl.textContent = spinMsgs[mi]; }, 1500);
  }
  function stopThinking() {
    clearInterval(spinTimer); clearInterval(msgTimer);
    thinkEl.style.display = 'none';
  }

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Evaluando...';
    startThinking();
    fetch('/s/${esc(user.token)}/exercise/${exercise.id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { text: textarea.value } })
    })
    .then(function(r) { return r.json(); })
    .then(function() { stopThinking(); window.location.reload(); })
    .catch(function() { stopThinking(); btn.disabled = false; btn.textContent = 'Enviar respuesta'; });
  });
})();
</script>`}
</body>
</html>`;
}
