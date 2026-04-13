import type { User, Exercise, Submission } from "../db.js";
import type { FillGapContent } from "../services/content.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface FillGapFeedbackItem {
  blank_number: number;
  user_word: string;
  correct_word: string;
  correct: boolean;
  explanation: string;
}

export function renderFillGap(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: FillGapContent = JSON.parse(exercise.content);
  const feedback: FillGapFeedbackItem[] | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  // Build paragraph HTML with blanks
  let paragraphHtml = esc(content.paragraph);
  // Replace blanks in reverse order to preserve indices
  for (let i = content.blanks.length; i >= 1; i--) {
    const blankToken = `__(${i})__`;
    if (feedback) {
      const fb = feedback.find(f => f.blank_number === i);
      if (fb) {
        const cls = fb.correct ? 'blank-correct' : 'blank-incorrect';
        const word = fb.correct ? esc(fb.user_word) : esc(fb.correct_word);
        const label = fb.correct ? '' : ` <span class="blank-user-word">(${esc(fb.user_word)})</span>`;
        paragraphHtml = paragraphHtml.replace(blankToken,
          `<span class="blank-slot filled ${cls}" data-blank="${i}"><span class="blank-num">${i}</span><span class="blank-word">${word}</span>${label}</span>`);
      }
    } else {
      paragraphHtml = paragraphHtml.replace(blankToken,
        `<span class="blank-slot" data-blank="${i}"><span class="blank-num">${i}</span><span class="blank-word"></span></span>`);
    }
  }

  // Word bank chips
  const wordBankHtml = content.word_bank.map((word, i) => {
    if (feedback) {
      return `<span class="word-chip used">${esc(word)}</span>`;
    }
    return `<span class="word-chip" data-word="${esc(word)}" data-idx="${i}">${esc(word)}</span>`;
  }).join('');

  const feedbackHtml = feedback ? feedback.filter(fb => !fb.correct).map((fb, idx) =>
    `<div class="gap-feedback fb-incorrect" style="animation:slideIn 300ms ease-out ${idx * 50}ms both">
      <span class="fb-icon">\u2717</span>
      <div class="fb-body">
        <strong>Espacio ${fb.blank_number}</strong>: la palabra correcta es <strong>${esc(fb.correct_word)}</strong>${fb.explanation ? ` — ${esc(fb.explanation)}` : ''}
      </div>
    </div>`
  ).join('') : '';

  const scoreHtml = submission
    ? `<div class="score-display" style="animation:slideIn 300ms ease-out both">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Completa los espacios — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F;--accent-amber:#3d2200}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-amber:#e6a44a}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-amber:#e6a44a}}
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
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-amber);margin-bottom:8px}
    .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:8px}
    .subtitle{font-family:'Inter',sans-serif;font-size:14px;color:var(--n500);margin-bottom:28px}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* PARAGRAPH */
    .paragraph-card{background:var(--n100);padding:28px 24px;border-radius:6px;margin-bottom:32px}
    .paragraph{font-family:'Lora',Georgia,serif;font-size:17px;line-height:1.9;text-align:left}

    /* BLANK SLOTS */
    .blank-slot{display:inline-flex;align-items:center;gap:4px;padding:2px 10px;margin:0 2px;border-bottom:2px solid var(--muted);cursor:pointer;min-width:80px;transition:all .2s;vertical-align:baseline}
    .blank-slot:hover:not(.filled){background:color-mix(in srgb, var(--accent-amber) 6%, var(--bg))}
    .blank-slot.selected{border-color:var(--red);background:color-mix(in srgb, #ffc107 12%, var(--bg))}
    .blank-slot.filled{border-bottom-style:solid;border-color:var(--accent-amber)}
    .blank-num{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--n500);font-weight:500}
    .blank-word{font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:var(--accent-amber)}
    .blank-correct{border-color:var(--correct)!important;background:color-mix(in srgb, var(--correct) 10%, var(--bg))!important;cursor:default}
    .blank-correct .blank-word{color:var(--correct)}
    .blank-incorrect{border-color:var(--red)!important;background:color-mix(in srgb, var(--red) 8%, var(--bg))!important;cursor:default}
    .blank-incorrect .blank-word{color:var(--red)}
    .blank-user-word{font-family:'Inter',sans-serif;font-size:11px;color:var(--red);font-weight:400;text-decoration:line-through}

    /* WORD BANK */
    .word-bank-section{margin-bottom:32px}
    .word-bank-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--fg)}
    .word-bank{display:flex;flex-wrap:wrap;gap:10px}
    .word-chip{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;padding:8px 18px;border:1.5px solid var(--fg);border-radius:999px;cursor:pointer;transition:all .2s;user-select:none;background:var(--bg)}
    .word-chip:hover:not(.used):not(.chip-selected){background:var(--fg);color:var(--bg)}
    .word-chip.chip-selected{background:var(--fg);color:var(--bg);transform:scale(1.04)}
    .word-chip.used{opacity:0.4;cursor:not-allowed;text-decoration:line-through}

    /* FEEDBACK */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .gap-feedback{display:flex;gap:10px;padding:12px 14px;margin-bottom:10px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;border-left:3px solid var(--red);border-radius:0 4px 4px 0;background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .gap-feedback .fb-icon{color:var(--red);font-weight:700;flex-shrink:0;font-size:16px}
    .fb-body{flex:1;min-width:0}

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

    /* MOBILE */
    @media(max-width:600px){
      .shell{padding:16px 12px}
      .title{font-size:22px}
      .header-bar{font-size:10px}
      .header-center{font-size:11px}
      .paragraph-card{padding:20px 16px}
      .paragraph{font-size:15px;line-height:1.9}
      .blank-slot{min-width:60px;padding:2px 6px}
      .word-chip{padding:6px 14px;font-size:12px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 4 de 5 &middot; ~3 min</span>
      <span class="header-right">~3 min</span>
    </div>

    <div class="ex-kicker">Completa los espacios</div>
    <h1 class="title">Coloca las palabras en los espacios correctos</h1>
    <p class="subtitle">Toca un espacio, luego toca una palabra para colocarla</p>

    ${scoreHtml}

    <div class="paragraph-card">
      <div class="paragraph">${paragraphHtml}</div>
    </div>

    <div class="word-bank-section">
      <div class="word-bank-label">Banco de palabras</div>
      <div class="word-bank">${wordBankHtml}</div>
    </div>

    ${feedback && feedbackHtml ? `<div class="feedback-section"><div class="feedback-label">Correcciones</div>${feedbackHtml}</div>` : ''}

    ${submission
      ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>`
      : `<div class="submit-row"><button type="button" class="btn-submit" id="submitBtn" disabled>Enviar respuestas</button></div>`}

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission ? `<script>
(function() {
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
})();
</script>` : `<script>
(function() {
  var blanks = document.querySelectorAll('.blank-slot');
  var chips = document.querySelectorAll('.word-chip');
  var btn = document.getElementById('submitBtn');
  var fills = {}; // blankNumber -> { word, chipIdx }
  var selectedBlank = null;
  var selectedChip = null;

  function clearSelection() {
    blanks.forEach(function(b) { b.classList.remove('selected'); });
    chips.forEach(function(c) { c.classList.remove('chip-selected'); });
    selectedBlank = null;
    selectedChip = null;
  }

  function updateSubmitBtn() {
    var filledCount = Object.keys(fills).length;
    btn.disabled = filledCount < ${content.blanks.length};
  }

  function fillBlank(blankNum, word, chipIdx) {
    fills[blankNum] = { word: word, chipIdx: chipIdx };
    var slot = document.querySelector('.blank-slot[data-blank="' + blankNum + '"]');
    if (slot) {
      slot.classList.add('filled');
      var wordEl = slot.querySelector('.blank-word');
      if (wordEl) wordEl.textContent = word;
    }
    var chip = document.querySelector('.word-chip[data-idx="' + chipIdx + '"]');
    if (chip) chip.classList.add('used');
    clearSelection();
    updateSubmitBtn();
  }

  function clearBlank(blankNum) {
    var fill = fills[blankNum];
    if (!fill) return;
    var slot = document.querySelector('.blank-slot[data-blank="' + blankNum + '"]');
    if (slot) {
      slot.classList.remove('filled');
      var wordEl = slot.querySelector('.blank-word');
      if (wordEl) wordEl.textContent = '';
    }
    var chip = document.querySelector('.word-chip[data-idx="' + fill.chipIdx + '"]');
    if (chip) chip.classList.remove('used');
    delete fills[blankNum];
    clearSelection();
    updateSubmitBtn();
  }

  blanks.forEach(function(b) {
    b.addEventListener('click', function() {
      var num = b.getAttribute('data-blank');

      // If blank is filled, clear it
      if (fills[num]) {
        clearBlank(num);
        return;
      }

      // If a chip was already selected, fill this blank
      if (selectedChip !== null) {
        var chipEl = document.querySelector('.word-chip[data-idx="' + selectedChip + '"]');
        if (chipEl) {
          fillBlank(num, chipEl.getAttribute('data-word'), selectedChip);
        }
        return;
      }

      // Select this blank
      clearSelection();
      selectedBlank = num;
      b.classList.add('selected');
    });
  });

  chips.forEach(function(c) {
    c.addEventListener('click', function() {
      if (c.classList.contains('used')) return;

      var idx = c.getAttribute('data-idx');
      var word = c.getAttribute('data-word');

      // If a blank was already selected, fill it
      if (selectedBlank !== null) {
        fillBlank(selectedBlank, word, idx);
        return;
      }

      // Select this chip
      clearSelection();
      selectedChip = idx;
      c.classList.add('chip-selected');
    });
  });

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    var answers = {};
    Object.keys(fills).forEach(function(blankNum) {
      answers[blankNum] = fills[blankNum].word;
    });
    fetch('/s/${esc(user.token)}/exercise/${exercise.id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) { if(d&&d.showEmailPrompt)sessionStorage.setItem('emailPromptPending','1'); window.location.reload(); })
    .catch(function() { btn.disabled = false; btn.textContent = 'Enviar respuestas'; });
  });
})();
</script>`}
</body>
</html>`;
}
