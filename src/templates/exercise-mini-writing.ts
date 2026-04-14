import type { User, Exercise, Submission } from "../db.js";
import type { MiniWritingContent } from "../services/content.js";
import type { MiniWritingFeedback } from "../services/grading.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderMiniWriting(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: MiniWritingContent = JSON.parse(exercise.content);
  const feedback: MiniWritingFeedback | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  const scoreHtml = submission
    ? `<div class="score-display" style="animation:slideIn 300ms ease-out both">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : '';

  const feedbackHtml = feedback ? `
    <div class="feedback-section" style="animation:slideIn 300ms ease-out both">
      <div class="feedback-label">Retroalimentación</div>
      <div class="tu-oracion">
        <span class="to-label">Tu oración:</span>
        <span class="to-text">${esc((JSON.parse(submission!.answers) as { text: string }).text)}</span>
      </div>
      ${feedback.is_correct
        ? `<div class="fb-result fb-good">
            <span class="fb-result-icon">✓</span>
            <div>
              <div class="fb-result-msg">${esc(feedback.comment)}</div>
            </div>
          </div>`
        : `<div class="fb-result fb-bad">
            <span class="fb-result-icon">✗</span>
            <div>
              ${feedback.correction ? `<div class="fb-correction-line"><span class="corr-label">Mejor:</span> <span class="corr-corrected">${esc(feedback.correction)}</span></div>` : ''}
              ${feedback.reason ? `<div class="fb-reason">${esc(feedback.reason)}</div>` : ''}
              <div class="fb-result-msg">${esc(feedback.comment)}</div>
            </div>
          </div>`
      }
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Una Frase — The IELTS Daily</title>
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

    /* KICKER */
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-darkred);margin-bottom:8px}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* PROMPT BOX */
    .prompt-section{margin-bottom:28px}
    .prompt-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .prompt-box{font-family:'Lora',Georgia,serif;font-style:italic;font-size:16px;line-height:1.7;padding:20px 24px;background:var(--n100);border-left:4px solid var(--red)}

    /* SINGLE-LINE INPUT */
    .input-area{margin-bottom:8px}
    .input-area input[type="text"]{width:100%;background:transparent;border:none;border-bottom:2px solid var(--muted);font-family:'Lora',Georgia,serif;font-size:16px;line-height:1.6;color:var(--fg);padding:10px 4px;outline:none;border-radius:0;transition:border-color .15s}
    .input-area input[type="text"]::placeholder{color:var(--n500)}
    .input-area input[type="text"]:focus{border-color:var(--fg);background:var(--n100)}

    /* WORD COUNTER */
    .word-counter{font-family:'JetBrains Mono',monospace;font-size:12px;text-align:right;margin-bottom:28px;transition:color .2s}
    .wc-gray{color:var(--n500)}
    .wc-green{color:var(--correct)}
    .wc-red{color:var(--red)}

    /* FEEDBACK */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .tu-oracion{font-family:'Lora',Georgia,serif;font-size:15px;line-height:1.7;padding:14px 16px;background:var(--n100);border-radius:4px;margin-bottom:14px}
    .to-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--n500);margin-right:6px}
    .to-text{font-style:italic}

    .fb-result{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:6px;margin-bottom:10px}
    .fb-good{background:color-mix(in srgb, var(--correct) 8%, var(--bg));border:1px solid color-mix(in srgb, var(--correct) 20%, var(--muted))}
    .fb-bad{background:color-mix(in srgb, var(--red) 4%, var(--bg));border:1px solid color-mix(in srgb, var(--red) 12%, var(--muted))}
    .fb-result-icon{font-size:18px;font-weight:700;flex-shrink:0;margin-top:1px}
    .fb-good .fb-result-icon{color:var(--correct)}
    .fb-bad .fb-result-icon{color:var(--red)}
    .fb-correction-line{font-family:'Inter',sans-serif;font-size:13px;margin-bottom:6px}
    .corr-label{font-size:11px;font-weight:600;color:var(--n500);text-transform:uppercase;letter-spacing:1px;margin-right:4px}
    .corr-corrected{color:var(--correct);font-weight:600}
    .fb-reason{font-family:'Inter',sans-serif;font-size:12px;color:var(--n600);margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid var(--muted)}
    .fb-result-msg{font-family:'Lora',Georgia,serif;font-style:italic;font-size:14px;color:var(--n600);line-height:1.5}

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
      .header-bar{font-size:10px}
      .header-center{font-size:11px}
      .prompt-box{padding:16px;font-size:15px}
      .input-area input[type="text"]{font-size:15px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 6 de 7 &middot; ~1 min</span>
      <span class="header-right">~1 min</span>
    </div>

    <div class="ex-kicker">Una Frase</div>

    ${scoreHtml}

    <div class="prompt-section">
      <div class="prompt-label">Consigna</div>
      <div class="prompt-box">${esc(content.prompt)}</div>
    </div>

    ${submission ? '' : `
    <div class="input-area">
      <input type="text" id="sentenceInput" placeholder="Escribe tu oración en inglés..." autocomplete="off" spellcheck="true">
    </div>
    <div class="word-counter wc-gray" id="wordCounter">0 palabras</div>
    `}

    ${feedbackHtml}

    ${submission
      ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>`
      : `<div class="submit-row"><button type="button" class="btn-submit" id="submitBtn" disabled>Enviar oración</button></div>
    <div id="thinkingAnim" style="display:none;align-items:center;gap:10px;justify-content:center;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:14px;color:var(--n500)"><span id="spinnerFrame">⠋</span><span id="spinnerMsg">Leyendo tu respuesta...</span></div>`}

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission ? `<script>
(function() {
  var scoreEl = document.querySelector('.score-num');
  if (scoreEl) {
    var target = parseInt(scoreEl.getAttribute('data-score') || '0', 10);
    var max = parseInt(scoreEl.getAttribute('data-max') || '1', 10);
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
})();
</script>` : `<script>
(function() {
  var input = document.getElementById('sentenceInput');
  var counter = document.getElementById('wordCounter');
  var btn = document.getElementById('submitBtn');
  var MIN = 5;
  var MAX = 30;

  function countWords(text) {
    var trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\\s+/).length;
  }

  function updateCounter() {
    var count = countWords(input.value);
    counter.className = 'word-counter';
    if (count < MIN) {
      counter.classList.add('wc-gray');
    } else if (count <= MAX) {
      counter.classList.add('wc-green');
    } else {
      counter.classList.add('wc-red');
    }
    counter.textContent = count + ' palabras';
    btn.disabled = count < MIN || count > MAX;
  }

  input.addEventListener('input', updateCounter);
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
      body: JSON.stringify({ answers: { text: input.value } })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { stopThinking(); if(d&&d.showEmailPrompt)sessionStorage.setItem('emailPromptPending','1'); window.location.reload(); })
    .catch(function() { stopThinking(); btn.disabled = false; btn.textContent = 'Enviar oración'; });
  });
})();
</script>`}
</body>
</html>`;
}
