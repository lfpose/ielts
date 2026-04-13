import type { User, Exercise, Submission } from "../db.js";
import type { LongReadingContent } from "../services/content.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripOptionPrefix(s: string): string {
  return s.replace(/^[A-Da-d][).]\s*/, "");
}

interface FeedbackItem {
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation: string;
}

export function renderLongReading(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: LongReadingContent = JSON.parse(exercise.content);
  const feedback: FeedbackItem[] | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  const passageHtml = content.passage
    .split(/\n\n+/)
    .map((p) => `<p>${esc(p)}</p>`)
    .join("");

  const questionsHtml = content.questions
    .map((q, i) => {
      const fb = feedback?.[i] ?? null;
      const answered = submission !== null;
      const staggerDelay = i * 50;

      let inputHtml = "";
      if (q.type === "multiple_choice" && q.options) {
        const letters = ["A", "B", "C", "D"];
        inputHtml = `<div class="options vertical">${q.options
          .map((opt, oi) => {
            const val = letters[oi];
            const selected = fb?.user_answer === val;
            const isCorrect = fb?.correct_answer === val;
            let cls = "mc-option";
            if (answered && fb) {
              if (selected && fb.correct) cls = "mc-option correct";
              else if (selected && !fb.correct) cls = "mc-option incorrect";
              else if (isCorrect) cls = "mc-option correct-answer";
            }
            return `<label class="${cls}">
              <input type="radio" name="q${q.number}" value="${val}" ${answered ? "disabled" : ""} ${selected ? "checked" : ""}>
              <span class="mc-badge">${val}</span>
              <span class="mc-text">${esc(stripOptionPrefix(opt))}</span>
            </label>`;
          })
          .join("")}</div>`;
      } else if (q.type === "true_false_ng") {
        const tfnOptions: Array<{ val: string; label: string }> = [
          { val: "True", label: "Verdadero" },
          { val: "False", label: "Falso" },
          { val: "Not Given", label: "No se menciona" },
        ];
        inputHtml = `<div class="options horizontal">${tfnOptions
          .map(({ val, label }) => {
            const selected = fb?.user_answer === val;
            const isCorrect = fb?.correct_answer === val;
            let cls = "tfng-pill";
            if (answered && fb) {
              if (selected && fb.correct) cls = "tfng-pill correct";
              else if (selected && !fb.correct) cls = "tfng-pill incorrect";
              else if (isCorrect) cls = "tfng-pill correct-answer";
            }
            return `<label class="${cls}">
              <input type="radio" name="q${q.number}" value="${val}" ${answered ? "disabled" : ""} ${selected ? "checked" : ""}>
              <span class="tfng-text">${esc(label)}</span>
            </label>`;
          })
          .join("")}</div>`;
      }

      const questionText = q.type === "true_false_ng" ? q.statement : q.question;

      let feedbackHtml = "";
      if (answered && fb) {
        feedbackHtml = `<div class="q-feedback ${fb.correct ? "fb-correct" : "fb-incorrect"}" style="animation-delay:${staggerDelay}ms">
          <span class="fb-icon">${fb.correct ? "\u2713" : "\u2717"}</span>
          ${!fb.correct ? `<div class="fb-answer">Respuesta correcta: <strong>${esc(fb.correct_answer)}</strong></div>` : ""}
          <div class="fb-explanation">${esc(fb.explanation)}</div>
        </div>`;
      }

      return `<div class="question-card" style="animation-delay:${staggerDelay}ms">
        <div class="q-number">${q.number}</div>
        <div class="q-body">
          <div class="q-text">${esc(questionText || "")}</div>
          ${inputHtml}
          ${feedbackHtml}
        </div>
      </div>`;
    })
    .join("");

  const scoreHtml = submission
    ? `<div class="score-display">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lectura Larga — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F;--accent-navy:#1a1a2e}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-navy:#8888cc}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-navy:#8888cc}}
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
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-navy);margin-bottom:8px}
    .article-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:24px}

    /* PASSAGE */
    .passage{margin-bottom:32px}
    .passage p{font-family:'Lora',Georgia,serif;font-size:16px;line-height:1.7;text-align:justify;margin-bottom:16px}
    .passage p:last-child{margin-bottom:0}
    .passage p:first-child::first-letter{font-family:'Playfair Display',serif;font-weight:900;float:left;font-size:3.6em;line-height:0.8;padding-right:8px;padding-top:4px;color:var(--fg)}

    /* DIVIDER */
    .divider{border:none;border-top:2px solid var(--fg);margin:32px 0}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg));animation:slideIn 300ms ease-out both}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* QUESTIONS */
    .questions-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid var(--fg)}

    /* QUESTION CARDS */
    .question-card{display:flex;gap:16px;margin-bottom:24px;padding:16px;border-left:3px solid var(--muted);background:var(--n100);border-radius:0 6px 6px 0}
    .question-card.revealed{animation:slideIn 300ms ease-out both}
    .q-number{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700;color:var(--n500);flex-shrink:0;width:32px;line-height:1.2}
    .q-body{flex:1;min-width:0}
    .q-text{font-family:'Inter',sans-serif;font-size:15px;font-weight:500;line-height:1.5;margin-bottom:14px}

    /* T/F/NG PILLS */
    .options.horizontal{display:flex;gap:8px;flex-wrap:wrap}
    .tfng-pill{display:inline-flex;align-items:center;justify-content:center;padding:8px 18px;height:36px;border:1.5px solid var(--muted);border-radius:4px;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;user-select:none}
    .tfng-pill:hover{border-color:var(--fg)}
    .tfng-pill input{position:absolute;opacity:0;width:0;height:0}
    .tfng-pill.selected{background:var(--fg);color:var(--bg);border-color:var(--fg)}
    .tfng-text{line-height:1}

    /* T/F/NG FEEDBACK STATES */
    .tfng-pill.correct{background:var(--correct);border-color:var(--correct);color:#fff}
    .tfng-pill.incorrect{background:var(--red);border-color:var(--red);color:#fff}
    .tfng-pill.correct-answer{border-color:var(--correct);border-style:dashed;color:var(--correct)}

    /* MC OPTIONS */
    .options.vertical{display:flex;flex-direction:column;gap:8px}
    .mc-option{display:flex;align-items:center;gap:12px;padding:10px 14px;border:1.5px solid var(--muted);border-radius:4px;cursor:pointer;transition:all .2s;font-family:'Inter',sans-serif;font-size:14px}
    .mc-option:hover{border-color:var(--fg)}
    .mc-option input{position:absolute;opacity:0;width:0;height:0}
    .mc-option.selected{background:var(--fg);color:var(--bg);border-color:var(--fg)}
    .mc-option.selected .mc-badge{background:var(--bg);color:var(--fg)}
    .mc-badge{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--muted);border-radius:3px;flex-shrink:0;color:var(--n500);transition:all .2s}
    .mc-text{line-height:1.4;flex:1}

    /* MC FEEDBACK STATES */
    .mc-option.correct{border-color:var(--correct);background:color-mix(in srgb, var(--correct) 10%, var(--bg));color:var(--fg)}
    .mc-option.correct .mc-badge{border-color:var(--correct);background:var(--correct);color:#fff}
    .mc-option.incorrect{border-color:var(--red);background:color-mix(in srgb, var(--red) 8%, var(--bg));color:var(--fg)}
    .mc-option.incorrect .mc-badge{border-color:var(--red);background:var(--red);color:#fff}
    .mc-option.correct-answer{border-color:var(--correct);border-style:dashed}
    .mc-option.correct-answer .mc-badge{border-color:var(--correct);color:var(--correct)}

    /* QUESTION FEEDBACK */
    .q-feedback{margin-top:12px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;border-left:3px solid;border-radius:0 4px 4px 0;animation:slideIn 300ms ease-out both}
    .fb-correct{border-color:var(--correct);background:color-mix(in srgb, var(--correct) 6%, var(--bg))}
    .fb-incorrect{border-color:var(--red);background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .fb-icon{font-weight:700;margin-right:4px}
    .fb-correct .fb-icon{color:var(--correct)}
    .fb-incorrect .fb-icon{color:var(--red)}
    .fb-answer{margin-top:4px;font-size:12px;color:var(--n600)}
    .fb-explanation{margin-top:4px;color:var(--n600)}

    /* SUBMIT */
    .submit-row{text-align:center;margin-top:32px}
    .btn-submit{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:none;cursor:pointer;transition:all .3s}
    .btn-submit:disabled{background:var(--muted);color:var(--n500);cursor:not-allowed}
    .btn-submit:not(:disabled){background:var(--fg);color:var(--bg)}
    .btn-submit:not(:disabled):hover{opacity:.85}
    .btn-back{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:1px solid var(--fg);color:var(--fg);transition:all .15s;animation:slideIn 300ms ease-out both;animation-delay:${content.questions.length * 50 + 300}ms}
    .btn-back:hover{background:var(--fg);color:var(--bg)}

    /* ANIMATIONS */
    @keyframes slideIn{
      from{opacity:0;transform:translateY(12px)}
      to{opacity:1;transform:translateY(0)}
    }

    /* FOOTER */
    .footer{text-align:center;padding:32px 0 16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    /* HIGHLIGHT TOOLBAR */
    #hl-toolbar{position:fixed;z-index:9999;background:var(--bg);border:1px solid var(--muted);border-radius:999px;padding:6px 10px;display:none;gap:8px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.18)}
    .hl-btn{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.18);cursor:pointer;padding:0;transition:transform .12s}
    .hl-btn:hover{transform:scale(1.25)}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .article-title{font-size:22px}
      .passage p{font-size:15px}
      .options.horizontal{flex-direction:column}
      .tfng-pill{flex:1;justify-content:center}
      .header-bar{font-size:10px}
      .header-center{font-size:11px}
      .question-card{padding:12px;gap:12px}
      .q-number{font-size:18px;width:26px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 1 de 5</span>
      <span class="header-right">~8 min</span>
    </div>

    <div class="ex-kicker">Lectura Larga</div>
    <h1 class="article-title">${esc(content.title)}</h1>

    <div class="passage">${passageHtml}</div>

    <hr class="divider">

    ${scoreHtml}

    <div class="questions-label">Preguntas</div>

    ${submission ? `<div class="questions">${questionsHtml}</div>` : `<form id="exerciseForm" method="POST" action="/s/${esc(user.token)}/exercise/${exercise.id}">
      <div class="questions">${questionsHtml}</div>
      <div class="submit-row">
        <button type="submit" class="btn-submit" id="submitBtn" disabled>Enviar respuestas</button>
      </div>
    </form>`}

    ${submission ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>` : ""}

    <div class="footer">The IELTS Daily</div>
  </div>

  <div id="hl-toolbar">
    <button class="hl-btn" data-color="#FEF3C7" style="background:#FEF3C7" title="Amarillo"></button>
    <button class="hl-btn" data-color="#D1FAE5" style="background:#D1FAE5" title="Verde"></button>
    <button class="hl-btn" data-color="#FCE7F3" style="background:#FCE7F3" title="Rosa"></button>
  </div>

  <script>
(function() {
  var toolbar = document.getElementById('hl-toolbar');
  var passage = document.querySelector('.passage');
  if (!passage || !toolbar) return;
  var savedRange = null;

  document.addEventListener('mouseup', function() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { toolbar.style.display = 'none'; return; }
    var range = sel.getRangeAt(0);
    if (!passage.contains(range.commonAncestorContainer)) { toolbar.style.display = 'none'; return; }
    savedRange = range.cloneRange();
    toolbar.style.display = 'flex';
    requestAnimationFrame(function() {
      var rect = range.getBoundingClientRect();
      var tw = toolbar.offsetWidth;
      var left = Math.max(4, rect.left + rect.width / 2 - tw / 2);
      toolbar.style.left = left + 'px';
      toolbar.style.top = (rect.top + window.scrollY - toolbar.offsetHeight - 8) + 'px';
    });
  });

  toolbar.querySelectorAll('.hl-btn').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      var color = this.getAttribute('data-color');
      if (!savedRange) return;
      var span = document.createElement('span');
      span.style.background = color;
      span.style.borderRadius = '2px';
      try { savedRange.surroundContents(span); } catch(err) {}
      toolbar.style.display = 'none';
      window.getSelection().removeAllRanges();
      savedRange = null;
    });
  });

  document.addEventListener('mousedown', function(e) {
    if (!toolbar.contains(e.target)) toolbar.style.display = 'none';
  });

  passage.addEventListener('click', function(e) {
    var el = e.target;
    if (el.tagName === 'SPAN' && el.style.background && el.parentNode) {
      var parent = el.parentNode;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      parent.normalize();
    }
  });
})();
</script>

  ${submission ? `<script>
(function() {
  // Animate score count-up
  var scoreEl = document.querySelector('.score-num');
  if (scoreEl) {
    var target = parseInt(scoreEl.getAttribute('data-score') || '0', 10);
    var max = parseInt(scoreEl.getAttribute('data-max') || '5', 10);
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

  // Stagger reveal question cards
  var cards = document.querySelectorAll('.question-card');
  cards.forEach(function(card) {
    card.classList.add('revealed');
  });
})();
</script>` : `<script>
(function() {
  var form = document.getElementById('exerciseForm');
  var btn = document.getElementById('submitBtn');
  var total = ${content.questions.length};

  function checkAll() {
    var answered = 0;
    for (var i = 1; i <= total; i++) {
      var radios = form.querySelectorAll('input[name="q' + i + '"]');
      for (var j = 0; j < radios.length; j++) {
        if (radios[j].checked) { answered++; break; }
      }
    }
    btn.disabled = answered < total;
  }

  // Style selected pills and MC options
  form.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
      var group = form.querySelectorAll('input[name="' + e.target.name + '"]');
      for (var k = 0; k < group.length; k++) {
        group[k].closest('.tfng-pill, .mc-option').classList.remove('selected');
      }
      e.target.closest('.tfng-pill, .mc-option').classList.add('selected');
      checkAll();
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    var answers = {};
    for (var i = 1; i <= total; i++) {
      var sel = form.querySelector('input[name="q' + i + '"]:checked');
      if (sel) answers[i] = sel.value;
    }
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    })
    .then(function(r) { return r.json(); })
    .then(function() { window.location.reload(); })
    .catch(function() { btn.disabled = false; btn.textContent = 'Enviar respuestas'; });
  });
})();
</script>`}
</body>
</html>`;
}
