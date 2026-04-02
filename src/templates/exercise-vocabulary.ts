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

export function renderVocabulary(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: VocabularyContent = JSON.parse(exercise.content);
  const feedback: VocabFeedbackItem[] | null = submission?.feedback ? JSON.parse(submission.feedback) : null;

  // Shuffle definitions deterministically using exercise id as seed
  const shuffledIndices = content.words.map((_, i) => i);
  // Simple shuffle based on exercise ID
  const seed = exercise.id;
  for (let i = shuffledIndices.length - 1; i > 0; i--) {
    const j = ((seed * (i + 1) * 2654435761) >>> 0) % (i + 1);
    [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
  }

  const PAIR_COLORS = [
    { light: '#E8D5B7', dark: '#3D2E1A' },
    { light: '#B7D5E8', dark: '#1A2E3D' },
    { light: '#D5E8B7', dark: '#2E3D1A' },
    { light: '#E8B7D5', dark: '#3D1A2E' },
    { light: '#B7E8D5', dark: '#1A3D2E' },
    { light: '#D5B7E8', dark: '#2E1A3D' },
  ];

  const wordsHtml = content.words.map((w, i) => {
    if (feedback) {
      const fb = feedback[i];
      const cls = fb.correct ? 'vocab-card word-card fb-correct-card' : 'vocab-card word-card fb-incorrect-card';
      return `<div class="${cls}" data-index="${i}"><span class="word-text">${esc(w.word)}</span></div>`;
    }
    return `<div class="vocab-card word-card" data-index="${i}"><span class="word-text">${esc(w.word)}</span></div>`;
  }).join('');

  const defsHtml = shuffledIndices.map((origIdx) => {
    const w = content.words[origIdx];
    if (feedback) {
      const fb = feedback[origIdx];
      const cls = fb.correct ? 'vocab-card def-card fb-correct-card' : 'vocab-card def-card fb-incorrect-card';
      return `<div class="${cls}" data-orig="${origIdx}"><span class="def-text">${esc(w.definition)}</span></div>`;
    }
    return `<div class="vocab-card def-card" data-orig="${origIdx}"><span class="def-text">${esc(w.definition)}</span></div>`;
  }).join('');

  const feedbackHtml = feedback ? feedback.map((fb, i) => {
    if (fb.correct) return '';
    return `<div class="vocab-feedback fb-incorrect">
      <span class="fb-icon">✗</span>
      <strong>${esc(fb.word)}</strong>: ${esc(fb.correct_definition)}
      <div class="fb-context">"${esc(fb.context)}"</div>
    </div>`;
  }).filter(Boolean).join('') : '';

  const scoreHtml = submission
    ? `<div class="score-display">
        <span class="score-num">${submission.score}/${exercise.max_score}</span>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vocabulario — The IELTS Daily</title>
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
    .title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:8px}
    .subtitle{font-family:'Inter',sans-serif;font-size:14px;color:var(--n500);margin-bottom:24px}

    .score-display{text-align:center;margin-bottom:24px;padding:16px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:var(--correct)}

    /* MATCHING GRID */
    .match-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px}

    .column-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--fg)}

    .vocab-card{padding:12px 16px;border:2px solid var(--muted);cursor:pointer;transition:all .15s;user-select:none}
    .vocab-card:hover{border-color:var(--n500)}
    .vocab-card.selected{border-color:var(--fg);background:var(--n100)}
    .vocab-card.paired{cursor:pointer}

    .word-text{font-family:'Inter',sans-serif;font-size:15px;font-weight:600}
    .def-text{font-family:'Inter',sans-serif;font-size:13px;line-height:1.5}

    .fb-correct-card{border-color:var(--correct)!important;background:color-mix(in srgb, var(--correct) 10%, var(--bg))!important}
    .fb-incorrect-card{border-color:var(--red)!important;background:color-mix(in srgb, var(--red) 8%, var(--bg))!important}

    /* FEEDBACK */
    .feedback-section{margin-bottom:24px}
    .feedback-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .vocab-feedback{padding:10px 14px;margin-bottom:10px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;border-left:3px solid var(--red);background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .vocab-feedback .fb-icon{color:var(--red);font-weight:700;margin-right:4px}
    .fb-context{margin-top:6px;font-style:italic;color:var(--n600);font-size:12px}

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
      .match-grid{grid-template-columns:1fr;gap:12px}
      .column-label{margin-top:16px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <a href="/s/${esc(user.token)}" class="back">&larr; Volver al tablero</a>

    <div class="kicker">Vocabulario</div>
    <h1 class="title">Conecta cada palabra con su definición</h1>
    <p class="subtitle">Toca una palabra, luego toca su definición para conectarlas</p>

    ${scoreHtml}

    <div class="match-grid">
      <div class="words-col">
        <div class="column-label">Palabras</div>
        ${wordsHtml}
      </div>
      <div class="defs-col">
        <div class="column-label">Definiciones</div>
        ${defsHtml}
      </div>
    </div>

    ${feedback && feedbackHtml ? `<div class="feedback-section"><div class="feedback-label">Correcciones</div>${feedbackHtml}</div>` : ''}

    ${submission
      ? `<div class="submit-row"><a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a></div>`
      : `<div class="submit-row"><button type="button" class="btn-submit" id="submitBtn" disabled>Enviar respuestas</button></div>`}

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission ? '' : `<script>
(function() {
  var PAIR_COLORS_LIGHT = ${JSON.stringify(PAIR_COLORS.map(c => c.light))};
  var PAIR_COLORS_DARK = ${JSON.stringify(PAIR_COLORS.map(c => c.dark))};
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme:dark)').matches);

  var words = document.querySelectorAll('.word-card');
  var defs = document.querySelectorAll('.def-card');
  var btn = document.getElementById('submitBtn');
  var pairs = {}; // wordIndex -> defOrigIndex
  var colorIdx = 0;
  var pairColors = {}; // wordIndex -> colorIndex
  var selectedWord = null;
  var selectedDef = null;

  function getColor(ci) {
    return isDark ? PAIR_COLORS_DARK[ci] : PAIR_COLORS_LIGHT[ci];
  }

  function clearSelection() {
    words.forEach(function(w) { w.classList.remove('selected'); });
    defs.forEach(function(d) { d.classList.remove('selected'); });
    selectedWord = null;
    selectedDef = null;
  }

  function updatePairVisuals() {
    // Reset all
    words.forEach(function(w) {
      w.classList.remove('paired');
      w.style.borderColor = '';
      w.style.backgroundColor = '';
    });
    defs.forEach(function(d) {
      d.classList.remove('paired');
      d.style.borderColor = '';
      d.style.backgroundColor = '';
    });

    // Apply pair colors
    Object.keys(pairs).forEach(function(wi) {
      var di = pairs[wi];
      var ci = pairColors[wi];
      var color = getColor(ci);
      var wordEl = document.querySelector('.word-card[data-index="' + wi + '"]');
      var defEl = document.querySelector('.def-card[data-orig="' + di + '"]');
      if (wordEl && defEl) {
        wordEl.classList.add('paired');
        wordEl.style.borderColor = color;
        wordEl.style.backgroundColor = color + '33';
        defEl.classList.add('paired');
        defEl.style.borderColor = color;
        defEl.style.backgroundColor = color + '33';
      }
    });

    btn.disabled = Object.keys(pairs).length < 6;
  }

  function connect(wordIdx, defOrig) {
    pairs[wordIdx] = defOrig;
    pairColors[wordIdx] = colorIdx;
    colorIdx = (colorIdx + 1) % 6;
    clearSelection();
    updatePairVisuals();
  }

  function disconnect(wordIdx) {
    delete pairs[wordIdx];
    delete pairColors[wordIdx];
    clearSelection();
    updatePairVisuals();
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

      // If this word is already paired, disconnect it
      if (pairs.hasOwnProperty(idx)) {
        disconnect(idx);
        return;
      }

      // If a definition was already selected, pair them
      if (selectedDef !== null) {
        connect(idx, selectedDef);
        return;
      }

      // Select this word
      clearSelection();
      selectedWord = idx;
      w.classList.add('selected');
    });
  });

  defs.forEach(function(d) {
    d.addEventListener('click', function() {
      var orig = d.getAttribute('data-orig');

      // If this def is already paired, disconnect it
      var pairedWord = getWordForDef(orig);
      if (pairedWord !== null) {
        disconnect(pairedWord);
        return;
      }

      // If a word was already selected, pair them
      if (selectedWord !== null) {
        connect(selectedWord, orig);
        return;
      }

      // Select this def
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
