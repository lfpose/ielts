import type { User, Exercise, Submission } from "../db.js";
import type { VocabularyContent } from "../services/content.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

interface VocabFeedbackItem {
  word: string;
  user_definition: string;
  correct_definition: string;
  context: string;
  correct: boolean;
}

const PAIR_COLORS = [
  { bg: "#E8F4E8", border: "#2D6A4F" },
  { bg: "#E8F0F8", border: "#1a4a7a" },
  { bg: "#F8F0E8", border: "#7a4a1a" },
  { bg: "#F0E8F8", border: "#4a1a7a" },
  { bg: "#F8E8F0", border: "#7a1a4a" },
  { bg: "#E8F8F8", border: "#1a7a6a" },
];

export function renderVocabulary(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: VocabularyContent = JSON.parse(exercise.content);
  const feedback: VocabFeedbackItem[] | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  // Fisher-Yates shuffle seeded by exercise ID
  const shuffledIndices = content.words.map((_, i) => i);
  const seed = exercise.id;
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  const wordsHtml = content.words.map((w, i) => {
    if (feedback) {
      const fb = feedback[i];
      const cls = fb.correct ? "vocab-card word-card fb-correct" : "vocab-card word-card fb-incorrect";
      return `<div class="${cls}" data-index="${i}"><span class="word-text">${esc(w.word)}</span></div>`;
    }
    return `<div class="vocab-card word-card" data-index="${i}"><span class="word-text">${esc(w.word)}</span></div>`;
  }).join("");

  const defsHtml = shuffledIndices.map((origIdx) => {
    const w = content.words[origIdx];
    if (feedback) {
      const fb = feedback[origIdx];
      const cls = fb.correct ? "vocab-card def-card fb-correct" : "vocab-card def-card fb-incorrect";
      return `<div class="${cls}" data-orig="${origIdx}"><span class="def-text">${esc(w.definition)}</span></div>`;
    }
    return `<div class="vocab-card def-card" data-orig="${origIdx}"><span class="def-text">${esc(w.definition)}</span></div>`;
  }).join("");

  const feedbackHtml = feedback ? feedback.map((fb) => {
    if (fb.correct) return "";
    return `<div class="vocab-fb-item fb-incorrect-item" style="animation:slideIn 300ms ease-out both">
      <span class="fb-icon">\u2717</span>
      <div class="fb-body">
        <strong>${esc(fb.word)}</strong>: ${esc(fb.correct_definition)}
        <div class="fb-context">"${esc(fb.context)}"</div>
      </div>
    </div>`;
  }).filter(Boolean).join("") : "";

  const scoreHtml = submission
    ? `<div class="score-display" style="animation:slideIn 300ms ease-out both">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vocabulario — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F;--accent-purple:#4a1942}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-purple:#b47aaa}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-purple:#b47aaa}}
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
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-purple);margin-bottom:8px}
    .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:8px}
    .subtitle{font-family:'Inter',sans-serif;font-size:14px;color:var(--n500);margin-bottom:28px}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* MATCHING LAYOUT */
    .match-area{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
    .column-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--fg)}
    .words-col,.defs-col{display:flex;flex-direction:column;gap:10px}

    /* VOCAB CARDS */
    .vocab-card{padding:14px 16px;border:2px solid var(--muted);border-radius:6px;cursor:pointer;transition:all .2s;user-select:none;background:var(--n100)}
    .vocab-card:hover{border-color:var(--n500)}
    .vocab-card.selected{border-color:var(--fg);transform:scale(1.02);box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .vocab-card.selected::after{content:'Seleccionado';display:block;font-family:'Inter',sans-serif;font-size:9px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-top:6px}

    /* WORD CARDS */
    .word-text{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;display:block;text-align:center}

    /* DEFINITION CARDS */
    .def-text{font-family:'Inter',sans-serif;font-size:13px;font-weight:400;line-height:1.5;display:block}

    /* PAIRED STATE — base, overridden by inline styles */
    .vocab-card.paired{cursor:pointer}

    /* BOUNCE ANIMATION */
    @keyframes pairBounce{
      0%{transform:scale(1)}
      40%{transform:scale(1.04)}
      100%{transform:scale(1)}
    }
    .vocab-card.just-paired{animation:pairBounce .3s ease-out}

    /* FEEDBACK STATES */
    .vocab-card.fb-correct{border-color:var(--correct)!important;background:color-mix(in srgb, var(--correct) 10%, var(--bg))!important;cursor:default}
    .vocab-card.fb-incorrect{border-color:var(--red)!important;background:color-mix(in srgb, var(--red) 8%, var(--bg))!important;cursor:default}

    /* FEEDBACK ITEMS */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .vocab-fb-item{display:flex;gap:10px;padding:12px 14px;margin-bottom:10px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;border-left:3px solid var(--red);border-radius:0 4px 4px 0;background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .vocab-fb-item .fb-icon{color:var(--red);font-weight:700;flex-shrink:0;font-size:16px}
    .fb-body{flex:1;min-width:0}
    .fb-context{margin-top:6px;font-style:italic;color:var(--n600);font-size:12px}

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

      /* Mobile: words as horizontal scroll row, defs stacked below */
      .match-area{grid-template-columns:1fr;gap:16px}
      .words-col{flex-direction:row;overflow-x:auto;gap:8px;padding-bottom:8px;-webkit-overflow-scrolling:touch}
      .words-col .vocab-card{min-width:110px;flex-shrink:0;padding:10px 14px}
      .words-col .column-label{min-width:100%;flex-shrink:0}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 3 de 5 &middot; ~3 min</span>
      <span class="header-right">~3 min</span>
    </div>

    <div class="ex-kicker">Vocabulario</div>
    <h1 class="title">Conecta cada palabra con su definición</h1>
    <p class="subtitle">Toca una palabra, luego toca su definición para conectarlas</p>

    ${scoreHtml}

    <div class="match-area">
      <div class="words-col">
        <div class="column-label">Palabras</div>
        ${wordsHtml}
      </div>
      <div class="defs-col">
        <div class="column-label">Definiciones</div>
        ${defsHtml}
      </div>
    </div>

    ${feedback && feedbackHtml ? `<div class="feedback-section"><div class="feedback-label">Correcciones</div>${feedbackHtml}</div>` : ""}

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
    var max = parseInt(scoreEl.getAttribute('data-max') || '6', 10);
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
  var PAIR_COLORS = ${JSON.stringify(PAIR_COLORS)};
  var words = document.querySelectorAll('.word-card');
  var defs = document.querySelectorAll('.def-card');
  var btn = document.getElementById('submitBtn');
  var pairs = {};       // wordIndex -> defOrigIndex
  var pairColorMap = {}; // wordIndex -> colorIndex
  var nextColor = 0;
  var selectedWord = null;
  var selectedDef = null;

  function clearSelection() {
    words.forEach(function(w) { w.classList.remove('selected'); });
    defs.forEach(function(d) { d.classList.remove('selected'); });
    selectedWord = null;
    selectedDef = null;
  }

  function updateVisuals() {
    words.forEach(function(w) {
      var idx = w.getAttribute('data-index');
      if (pairs.hasOwnProperty(idx)) {
        var ci = pairColorMap[idx];
        w.classList.add('paired');
        w.style.borderColor = PAIR_COLORS[ci].border;
        w.style.backgroundColor = PAIR_COLORS[ci].bg;
      } else {
        w.classList.remove('paired');
        w.style.borderColor = '';
        w.style.backgroundColor = '';
      }
    });
    defs.forEach(function(d) {
      var orig = d.getAttribute('data-orig');
      var wi = getWordForDef(orig);
      if (wi !== null) {
        var ci = pairColorMap[wi];
        d.classList.add('paired');
        d.style.borderColor = PAIR_COLORS[ci].border;
        d.style.backgroundColor = PAIR_COLORS[ci].bg;
      } else {
        d.classList.remove('paired');
        d.style.borderColor = '';
        d.style.backgroundColor = '';
      }
    });
    btn.disabled = Object.keys(pairs).length < 6;
  }

  function triggerBounce(el) {
    el.classList.remove('just-paired');
    void el.offsetWidth;
    el.classList.add('just-paired');
  }

  function connect(wordIdx, defOrig) {
    pairs[wordIdx] = defOrig;
    pairColorMap[wordIdx] = nextColor;
    nextColor = (nextColor + 1) % 6;
    clearSelection();
    updateVisuals();
    var wEl = document.querySelector('.word-card[data-index="' + wordIdx + '"]');
    var dEl = document.querySelector('.def-card[data-orig="' + defOrig + '"]');
    if (wEl) triggerBounce(wEl);
    if (dEl) triggerBounce(dEl);
  }

  function disconnect(wordIdx) {
    delete pairs[wordIdx];
    delete pairColorMap[wordIdx];
    clearSelection();
    updateVisuals();
  }

  function isDefPaired(defOrig) {
    var vals = Object.values(pairs);
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] == defOrig) return true;
    }
    return false;
  }

  function getWordForDef(defOrig) {
    var keys = Object.keys(pairs);
    for (var i = 0; i < keys.length; i++) {
      if (pairs[keys[i]] == defOrig) return keys[i];
    }
    return null;
  }

  words.forEach(function(w) {
    w.addEventListener('click', function() {
      var idx = w.getAttribute('data-index');
      if (pairs.hasOwnProperty(idx)) { disconnect(idx); return; }
      if (selectedDef !== null) {
        if (!isDefPaired(selectedDef)) connect(idx, selectedDef);
        return;
      }
      clearSelection();
      selectedWord = idx;
      w.classList.add('selected');
    });
  });

  defs.forEach(function(d) {
    d.addEventListener('click', function() {
      var orig = d.getAttribute('data-orig');
      var pairedWord = getWordForDef(orig);
      if (pairedWord !== null) { disconnect(pairedWord); return; }
      if (selectedWord !== null) {
        if (!pairs.hasOwnProperty(selectedWord)) connect(selectedWord, orig);
        return;
      }
      clearSelection();
      selectedDef = orig;
      d.classList.add('selected');
    });
  });

  btn.addEventListener('click', function() {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    var answers = {};
    Object.keys(pairs).forEach(function(wi) {
      answers[wi] = parseInt(pairs[wi]);
    });
    fetch('/s/${esc(user.token)}/exercise/${exercise.id}', {
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
