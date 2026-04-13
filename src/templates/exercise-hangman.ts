import type { User, Exercise, Submission } from "../db.js";
import type { HangmanContent } from "../services/content.js";
import type { HangmanFeedback } from "../services/grading.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const HANGMAN_STAGES = [
  // 0 wrong
  `
  +---+
  |   |
      |
      |
      |
      |
=========`,
  // 1 wrong
  `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  // 2 wrong
  `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  // 3 wrong
  `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  // 4 wrong
  `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
  // 5 wrong
  `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
  // 6 wrong — dead
  `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
];

export function renderHangman(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: HangmanContent = JSON.parse(exercise.content);
  const feedback: HangmanFeedback | null = submission?.feedback
    ? JSON.parse(submission.feedback)
    : null;

  const dashboardUrl = `/s/${esc(user.token)}`;

  // Read-only feedback mode
  if (submission && feedback) {
    const wordDisplay = feedback.word.toUpperCase().split("").join(" ");
    const resultColor = feedback.won ? "#2D6A4F" : "#c0392b";
    const resultMsg = feedback.won ? "¡Lo lograste! 🎉" : "Sin suerte esta vez";
    const stageHtml = esc(HANGMAN_STAGES[6]);

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hangman — Resultado</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 16px; color: #1a1a1a; }
  .container { max-width: 480px; margin: 0 auto; }
  .back-btn { display: inline-block; color: #555; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
  .back-btn:hover { color: #1a1a1a; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #888; margin: 0 0 24px; }
  .result-badge { font-size: 18px; font-weight: 700; color: ${resultColor}; margin-bottom: 20px; }
  pre.gallows { font-family: monospace; font-size: 15px; line-height: 1.4; background: #f8f8f8; border-radius: 8px; padding: 16px; display: inline-block; }
  .word-display { font-size: 32px; font-weight: 700; letter-spacing: 8px; font-family: monospace; color: ${resultColor}; margin: 20px 0 12px; }
  .definition { font-size: 14px; color: #555; font-style: italic; margin-bottom: 4px; }
</style>
</head>
<body>
<div class="container">
  <a href="${dashboardUrl}" class="back-btn">← Volver</a>
  <div class="card">
    <h2>Hangman</h2>
    <p class="subtitle">${esc("")}</p>
    <div class="result-badge">${esc(resultMsg)}</div>
    <pre class="gallows">${stageHtml}</pre>
    <div class="word-display">${esc(wordDisplay)}</div>
    <p class="definition">${esc(feedback.definition)}</p>
  </div>
</div>
</body>
</html>`;
  }

  // Interactive mode
  const wordLen = content.word.length;
  const wordUpper = content.word.toUpperCase();

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Hangman</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 16px; color: #1a1a1a; }
  .container { max-width: 480px; margin: 0 auto; }
  .back-btn { display: inline-block; color: #555; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
  .back-btn:hover { color: #1a1a1a; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #888; margin: 0 0 20px; }
  pre.gallows { font-family: monospace; font-size: 15px; line-height: 1.4; background: #f8f8f8; border-radius: 8px; padding: 16px; display: inline-block; margin: 0 0 20px; }
  .definition { font-size: 14px; color: #555; font-style: italic; margin-bottom: 20px; }
  .word-display { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .letter-slot { width: 28px; text-align: center; font-size: 22px; font-weight: 700; font-family: monospace; border-bottom: 2px solid #333; padding-bottom: 2px; min-height: 32px; line-height: 32px; }
  .keyboard { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
  .key-btn { width: 36px; height: 36px; border: 1.5px solid #ccc; border-radius: 6px; font-size: 14px; font-weight: 600; background: #fff; cursor: pointer; transition: background .12s, color .12s; }
  .key-btn:hover:not(:disabled) { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
  .key-btn:disabled { opacity: .35; cursor: default; }
  .key-btn.wrong { background: #fce8e8; border-color: #c0392b; color: #c0392b; }
  .key-btn.correct { background: #e8f4e8; border-color: #2D6A4F; color: #2D6A4F; }
  .status { font-size: 14px; font-weight: 600; min-height: 20px; margin-bottom: 8px; }
  .status.win { color: #2D6A4F; }
  .status.lose { color: #c0392b; }
</style>
</head>
<body>
<div class="container">
  <a href="${dashboardUrl}" class="back-btn">← Volver</a>
  <div class="card">
    <h2>Hangman</h2>
    <p class="subtitle">${esc("")}</p>
    <pre class="gallows" id="gallows">${esc(HANGMAN_STAGES[0])}</pre>
    <p class="definition">${esc(content.definition)}</p>
    <div class="word-display" id="wordDisplay"></div>
    <div class="status" id="status"></div>
    <div class="keyboard" id="keyboard"></div>
  </div>
</div>
<script>
(function() {
  var WORD = ${JSON.stringify(wordUpper)};
  var WORD_LEN = ${wordLen};
  var STAGES = ${JSON.stringify(HANGMAN_STAGES)};
  var guessed = new Set();
  var wrong = 0;
  var gameOver = false;

  function buildWordDisplay() {
    var el = document.getElementById('wordDisplay');
    el.innerHTML = '';
    for (var i = 0; i < WORD_LEN; i++) {
      var slot = document.createElement('div');
      slot.className = 'letter-slot';
      slot.id = 'slot-' + i;
      el.appendChild(slot);
    }
  }

  function updateWordDisplay() {
    for (var i = 0; i < WORD_LEN; i++) {
      var slot = document.getElementById('slot-' + i);
      var ch = WORD[i];
      if (ch === ' ') { slot.textContent = ' '; slot.style.borderBottom = 'none'; }
      else if (guessed.has(ch)) { slot.textContent = ch; }
      else { slot.textContent = ''; }
    }
  }

  function buildKeyboard() {
    var kb = document.getElementById('keyboard');
    for (var code = 65; code <= 90; code++) {
      var ch = String.fromCharCode(code);
      var btn = document.createElement('button');
      btn.className = 'key-btn';
      btn.textContent = ch;
      btn.dataset.letter = ch;
      btn.addEventListener('click', onKey);
      kb.appendChild(btn);
    }
  }

  function onKey(e) {
    if (gameOver) return;
    var ch = e.target.dataset.letter;
    if (guessed.has(ch)) return;
    guessed.add(ch);
    e.target.disabled = true;

    if (WORD.includes(ch)) {
      e.target.classList.add('correct');
      updateWordDisplay();
      if (checkWin()) { endGame(true); }
    } else {
      e.target.classList.add('wrong');
      wrong++;
      document.getElementById('gallows').textContent = STAGES[Math.min(wrong, 6)];
      if (wrong >= 6) { endGame(false); }
    }
  }

  function checkWin() {
    for (var i = 0; i < WORD_LEN; i++) {
      var ch = WORD[i];
      if (ch !== ' ' && !guessed.has(ch)) return false;
    }
    return true;
  }

  function endGame(won) {
    gameOver = true;
    // Disable all keys
    var keys = document.querySelectorAll('.key-btn');
    keys.forEach(function(k) { k.disabled = true; });

    var statusEl = document.getElementById('status');
    if (won) {
      statusEl.textContent = '¡Ganaste! 🎉';
      statusEl.className = 'status win';
    } else {
      // Reveal word
      for (var i = 0; i < WORD_LEN; i++) {
        var slot = document.getElementById('slot-' + i);
        slot.textContent = WORD[i];
        slot.style.color = '#c0392b';
      }
      statusEl.textContent = 'La palabra era: ' + WORD;
      statusEl.className = 'status lose';
    }

    // Submit result
    fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { won: won } })
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d && d.showEmailPrompt) sessionStorage.setItem('emailPromptPending', '1');
      setTimeout(function() { window.location.reload(); }, 1800);
    }).catch(function() {
      setTimeout(function() { window.location.reload(); }, 1800);
    });
  }

  buildWordDisplay();
  updateWordDisplay();
  buildKeyboard();
})();
</script>
</body>
</html>`;
}
