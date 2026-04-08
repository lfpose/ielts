import type { User, Exercise, Submission } from "../db.js";
import type { WordSearchContent } from "../services/content.js";
import type { WordSearchFeedback } from "../services/grading.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const PAIR_COLORS = [
  { bg: "#E8F4E8", border: "#2D6A4F" },
  { bg: "#E8F0F8", border: "#1a4a7a" },
  { bg: "#F8F0E8", border: "#7a4a1a" },
  { bg: "#F0E8F8", border: "#4a1a7a" },
];

export function renderWordSearch(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: WordSearchContent = JSON.parse(exercise.content);
  const feedback: WordSearchFeedback | null = submission?.feedback
    ? JSON.parse(submission.feedback)
    : null;

  // Pre-compute which cells are colored (for submitted/read-only view)
  const cellColors: Record<string, { bg: string; border: string }> = {};
  if (submission) {
    content.words.forEach((w, idx) => {
      const color = PAIR_COLORS[idx % PAIR_COLORS.length];
      const letters = w.word.toLowerCase().replace(/[^a-z]/g, "");
      for (let i = 0; i < letters.length; i++) {
        const r = w.direction === "horizontal" ? w.startRow : w.startRow + i;
        const c = w.direction === "horizontal" ? w.startCol + i : w.startCol;
        cellColors[`${r},${c}`] = color;
      }
    });
  }

  // Grid HTML
  const gridHtml = content.grid
    .map((row, ri) =>
      row
        .map((letter, ci) => {
          const key = `${ri},${ci}`;
          const color = cellColors[key];
          const styleAttr = color
            ? `style="background:${color.bg};border-color:${color.border};color:${color.border}"`
            : "";
          const cls = color ? "grid-cell found" : "grid-cell";
          return `<div class="${cls}" data-row="${ri}" data-col="${ci}" data-letter="${esc(letter)}" ${styleAttr}>${letter.toUpperCase()}</div>`;
        })
        .join("")
    )
    .join("");

  // Score display (post-submission)
  const scoreHtml = submission
    ? `<div class="score-display" style="animation:slideIn 300ms ease-out both">
        <span class="score-label">Tu puntuación</span>
        <span class="score-num" data-score="${submission.score}" data-max="${exercise.max_score}">0/${exercise.max_score}</span>
      </div>`
    : "";

  // Feedback word cards (post-submission)
  const feedbackCardsHtml = feedback
    ? feedback.results
        .map((r, idx) => {
          const color = PAIR_COLORS[idx % PAIR_COLORS.length];
          return `<div class="found-word-card" style="border-left:4px solid ${color.border};background:${color.bg};animation:slideIn ${300 + idx * 80}ms ease-out both">
            <div class="fw-word">${esc(r.word.toUpperCase())}</div>
            <div class="fw-def">${esc(r.definition)}</div>
            <div class="fw-ex">&ldquo;${esc(r.example)}&rdquo;</div>
          </div>`;
        })
        .join("")
    : "";

  // JS word data (only needed for interactive mode)
  const wordDataJson = JSON.stringify(
    content.words.map((w) => ({
      word: w.word,
      definition: w.definition,
      example: w.example,
      startRow: w.startRow,
      startCol: w.startCol,
      direction: w.direction,
    }))
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sopa de Letras — The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252;--correct:#2D6A4F;--accent-teal:#1a7a6a}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-teal:#2db8a0}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA;--correct:#40C463;--accent-teal:#2db8a0}}
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
    .ex-kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-teal);margin-bottom:16px}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:20px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-label{display:block;font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:8px}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:700;color:var(--correct)}

    /* COUNTER */
    .counter{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--n500);text-align:center;margin-bottom:12px;letter-spacing:1px;text-transform:uppercase}

    /* GRID */
    .grid-wrapper{display:flex;justify-content:center;margin-bottom:28px}
    .word-grid{display:grid;grid-template-columns:repeat(10,36px);grid-template-rows:repeat(10,36px)}
    .grid-cell{width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-weight:600;font-size:13px;border:1px solid var(--muted);cursor:pointer;user-select:none;transition:background .15s,border-color .15s,color .15s;background:var(--bg);color:var(--fg)}
    .grid-cell.selected{background:#FFF8CC;border-color:#856404;color:#856404}
    .grid-cell.found{cursor:default}
    @keyframes flashRed{
      0%{background:rgba(204,0,0,0.25);border-color:#CC0000}
      100%{background:var(--bg);border-color:var(--muted)}
    }
    .grid-cell.flash-red{animation:flashRed 350ms ease-out both}

    /* FOUND WORDS */
    .found-words-section{margin-bottom:24px}
    .found-words-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--muted)}
    .found-words{display:flex;flex-direction:column;gap:10px}
    .found-word-card{padding:12px 16px;border-radius:4px}
    .fw-word{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:15px;margin-bottom:4px}
    .fw-def{font-family:'Inter',sans-serif;font-size:13px;color:var(--n600);margin-bottom:4px}
    .fw-ex{font-family:'Lora',Georgia,serif;font-style:italic;font-size:13px;color:var(--n500)}

    /* COMPLETE / FEEDBACK */
    .complete-banner{text-align:center;padding:16px;margin-bottom:20px;background:color-mix(in srgb, var(--correct) 8%, var(--bg));border:1px solid color-mix(in srgb, var(--correct) 30%, var(--muted));border-radius:4px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;color:var(--correct)}
    .word-bank-note{text-align:center;font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:20px}

    /* SUBMIT / BACK */
    .submit-row{text-align:center;margin-top:32px}
    .btn-back{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:1px solid var(--fg);color:var(--fg);transition:all .15s;animation:slideIn 300ms ease-out both}
    .btn-back:hover{background:var(--fg);color:var(--bg)}

    /* ANIMATIONS */
    @keyframes slideIn{
      from{opacity:0;transform:translateY(12px)}
      to{opacity:1;transform:translateY(0)}
    }
    @keyframes celebrate{
      0%{transform:scale(1)}
      40%{transform:scale(1.06)}
      70%{transform:scale(0.97)}
      100%{transform:scale(1)}
    }
    .celebrate{animation:celebrate 400ms ease both}

    /* PALABRAS A BUSCAR */
    .word-list-section{margin-bottom:28px}
    .word-list-label{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--accent-teal);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--muted)}
    .word-list{display:flex;flex-direction:column;gap:8px}
    .word-list-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;border:1px solid var(--muted);border-radius:4px;background:var(--bg);transition:all .3s}
    .word-list-item.found-item{border-color:var(--correct);background:color-mix(in srgb, var(--correct) 6%, var(--bg))}
    .word-list-item.found-item .wl-word{text-decoration:line-through;color:var(--correct)}
    .wl-word{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:15px;min-width:80px}
    .wl-hint-btn{font-family:'Inter',sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--n500);background:none;border:1px solid var(--muted);border-radius:999px;padding:4px 12px;cursor:pointer;transition:all .15s;margin-left:auto;flex-shrink:0}
    .wl-hint-btn:hover{color:var(--fg);border-color:var(--fg)}
    .wl-hint-btn.used{color:var(--n500);border-color:transparent;cursor:default;opacity:.6}
    .wl-detail{font-family:'Inter',sans-serif;font-size:12px;color:var(--n600);margin-top:4px;display:none}
    .wl-detail.visible{display:block}
    .wl-detail-def{margin-bottom:2px}
    .wl-detail-ex{font-family:'Lora',Georgia,serif;font-style:italic;font-size:12px;color:var(--n500)}
    @keyframes hintPulse{
      0%{background:#FEF3C7;box-shadow:0 0 8px rgba(254,243,199,.8)}
      50%{background:#FDE68A;box-shadow:0 0 16px rgba(253,230,138,.9)}
      100%{background:#FEF3C7;box-shadow:0 0 8px rgba(254,243,199,.8)}
    }
    .grid-cell.hint-pulse{animation:hintPulse 1s ease-in-out 3;border-color:#856404;color:#856404}

    .footer{text-align:center;padding:32px 0 16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .header-bar{font-size:10px}
      .word-grid{grid-template-columns:repeat(10,28px);grid-template-rows:repeat(10,28px)}
      .grid-cell{width:28px;height:28px;font-size:10px}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <div class="header-bar">
      <a href="/s/${esc(user.token)}" class="header-back">&larr; Volver al tablero</a>
      <span class="header-center">Ejercicio 4 de 7 &middot; ~3 min</span>
      <span class="header-right">~3 min</span>
    </div>

    <div class="ex-kicker">Sopa de Letras</div>

    ${scoreHtml}

    ${submission
      ? `<div class="complete-banner">&#10003; ¡Todas las palabras encontradas!</div>`
      : `<div class="counter" id="counter">0 de ${content.words.length} encontradas</div>`
    }

    <div class="grid-wrapper">
      <div class="word-grid" id="word-grid">
        ${gridHtml}
      </div>
    </div>

    ${submission
      ? `<div class="word-bank-note">Palabras guardadas en tu banco</div>`
      : `<div class="word-list-section" id="word-list-section">
          <div class="word-list-label">Palabras a buscar</div>
          <div class="word-list" id="word-list">
            ${content.words
              .map(
                (w, idx) =>
                  `<div class="word-list-item" id="wl-item-${idx}" data-word-idx="${idx}">
                    <div>
                      <span class="wl-word">${esc(w.word.toUpperCase())}</span>
                      <div class="wl-detail" id="wl-detail-${idx}">
                        <div class="wl-detail-def">${esc(w.definition)}</div>
                        <div class="wl-detail-ex">&ldquo;${esc(w.example)}&rdquo;</div>
                      </div>
                    </div>
                    <button class="wl-hint-btn" id="wl-hint-${idx}" data-word-idx="${idx}" type="button">Pista</button>
                  </div>`
              )
              .join("")}
          </div>
        </div>
        <div class="found-words-section" id="found-words-section" style="display:none">
          <div class="found-words-label">Palabras encontradas</div>
          <div class="found-words" id="found-words"></div>
        </div>`
    }

    ${feedbackCardsHtml
      ? `<div class="found-words-section">
          <div class="found-words-label">Vocabulario de hoy</div>
          <div class="found-words">${feedbackCardsHtml}</div>
        </div>`
      : ``
    }

    <div class="submit-row">
      <a href="/s/${esc(user.token)}" class="btn-back">Volver al tablero</a>
    </div>

    <div class="footer">The IELTS Daily</div>
  </div>

  ${submission
    ? `<script>
(function() {
  var scoreEl = document.querySelector('.score-num');
  if (scoreEl) {
    var target = parseInt(scoreEl.getAttribute('data-score') || '0', 10);
    var max = parseInt(scoreEl.getAttribute('data-max') || '4', 10);
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
</script>`
    : `<script>
(function() {
  var WORDS = ${wordDataJson};
  var COLORS = [
    { bg: '#E8F4E8', border: '#2D6A4F' },
    { bg: '#E8F0F8', border: '#1a4a7a' },
    { bg: '#F8F0E8', border: '#7a4a1a' },
    { bg: '#F0E8F8', border: '#4a1a7a' }
  ];

  var cellMap = {};
  document.querySelectorAll('.grid-cell').forEach(function(el) {
    var r = el.getAttribute('data-row');
    var c = el.getAttribute('data-col');
    cellMap[r + ',' + c] = el;
  });
  function getCell(r, c) { return cellMap[r + ',' + c]; }

  var firstCell = null;
  var foundWords = [];
  var colorIndex = 0;

  function normalize(s) {
    return s.toLowerCase().replace(/[^a-z]/g, '');
  }

  function getCellsBetween(r1, c1, r2, c2) {
    var cells = [];
    if (r1 === r2) {
      var minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      for (var c = minC; c <= maxC; c++) cells.push({ row: r1, col: c });
    } else {
      var minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      for (var r = minR; r <= maxR; r++) cells.push({ row: r, col: c1 });
    }
    return cells;
  }

  function getLetters(cells) {
    return cells.map(function(c) {
      return getCell(c.row, c.col).getAttribute('data-letter') || '';
    }).join('');
  }

  function findWord(letters) {
    var norm = normalize(letters);
    for (var i = 0; i < WORDS.length; i++) {
      if (foundWords.indexOf(WORDS[i].word) !== -1) continue;
      if (norm === normalize(WORDS[i].word)) return WORDS[i];
    }
    return null;
  }

  function clearSelected() {
    document.querySelectorAll('.grid-cell.selected').forEach(function(el) {
      el.classList.remove('selected');
    });
  }

  function flashRed(cells) {
    cells.forEach(function(c) {
      var el = getCell(c.row, c.col);
      el.classList.remove('flash-red');
      void el.offsetWidth;
      el.classList.add('flash-red');
      setTimeout(function() { el.classList.remove('flash-red'); }, 400);
    });
  }

  function markFound(cells, colorIdx) {
    var color = COLORS[colorIdx];
    cells.forEach(function(c) {
      var el = getCell(c.row, c.col);
      el.classList.remove('selected');
      el.classList.add('found');
      el.style.background = color.bg;
      el.style.borderColor = color.border;
      el.style.color = color.border;
    });
  }

  function addFoundCard(wordObj, colorIdx) {
    var color = COLORS[colorIdx];
    // Update the word list item
    var wordIdx = -1;
    for (var wi = 0; wi < WORDS.length; wi++) {
      if (WORDS[wi].word === wordObj.word) { wordIdx = wi; break; }
    }
    if (wordIdx >= 0) {
      var item = document.getElementById('wl-item-' + wordIdx);
      if (item) {
        item.classList.add('found-item');
        item.style.borderColor = color.border;
        item.style.background = color.bg;
      }
      var detail = document.getElementById('wl-detail-' + wordIdx);
      if (detail) detail.classList.add('visible');
      var hintBtn = document.getElementById('wl-hint-' + wordIdx);
      if (hintBtn) hintBtn.style.display = 'none';
      // Clear any hint pulse on this word's cells
      var letters = wordObj.word.toLowerCase().replace(/[^a-z]/g, '');
      for (var li = 0; li < letters.length; li++) {
        var hr = wordObj.direction === 'horizontal' ? wordObj.startRow : wordObj.startRow + li;
        var hc = wordObj.direction === 'horizontal' ? wordObj.startCol + li : wordObj.startCol;
        var hCell = getCell(hr, hc);
        if (hCell) hCell.classList.remove('hint-pulse');
      }
    }
  }

  function updateCounter() {
    var el = document.getElementById('counter');
    if (el) el.textContent = foundWords.length + ' de ' + WORDS.length + ' encontradas';
  }

  function onAllFound() {
    // Auto-submit
    fetch('/s/${esc(user.token)}/exercise/${exercise.id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { found_words: foundWords } })
    })
    .then(function(r) { return r.json(); })
    .then(function() { window.location.reload(); })
    .catch(function(err) { console.error('Submit failed:', err); });
  }

  // Hint buttons
  document.querySelectorAll('.wl-hint-btn').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (this.classList.contains('used')) return;
      var idx = parseInt(this.getAttribute('data-word-idx'), 10);
      var w = WORDS[idx];
      if (foundWords.indexOf(w.word) !== -1) return;
      var letters = w.word.toLowerCase().replace(/[^a-z]/g, '');
      // Collect cells for this word that are not already found or hint-pulsed
      var candidates = [];
      for (var li = 0; li < letters.length; li++) {
        var hr = w.direction === 'horizontal' ? w.startRow : w.startRow + li;
        var hc = w.direction === 'horizontal' ? w.startCol + li : w.startCol;
        var hCell = getCell(hr, hc);
        if (hCell && !hCell.classList.contains('found') && !hCell.classList.contains('hint-pulse')) {
          candidates.push(hCell);
        }
      }
      if (candidates.length === 0) return;
      var pick = candidates[Math.floor(Math.random() * candidates.length)];
      pick.classList.add('hint-pulse');
      this.textContent = 'Usada';
      this.classList.add('used');
    });
  });

  document.querySelectorAll('.grid-cell').forEach(function(el) {
    el.addEventListener('click', function() {
      if (this.classList.contains('found')) return;

      var row = parseInt(this.getAttribute('data-row'), 10);
      var col = parseInt(this.getAttribute('data-col'), 10);

      if (firstCell === null) {
        // Start selection
        firstCell = { row: row, col: col };
        this.classList.add('selected');
      } else if (firstCell.row === row && firstCell.col === col) {
        // Same cell — deselect
        this.classList.remove('selected');
        firstCell = null;
      } else if (firstCell.row === row || firstCell.col === col) {
        // Same row or col — evaluate selection
        var cells = getCellsBetween(firstCell.row, firstCell.col, row, col);
        clearSelected();
        firstCell = null;

        var letters = getLetters(cells);
        var match = findWord(letters);

        if (match) {
          var colorIdx = colorIndex++;
          markFound(cells, colorIdx);
          foundWords.push(match.word);
          addFoundCard(match, colorIdx);
          updateCounter();
          if (foundWords.length === WORDS.length) {
            setTimeout(onAllFound, 600);
          }
        } else {
          flashRed(cells);
        }
      } else {
        // Different row AND col — restart with this cell
        clearSelected();
        firstCell = { row: row, col: col };
        this.classList.add('selected');
      }
    });
  });
})();
</script>`
  }
</body>
</html>`;
}
