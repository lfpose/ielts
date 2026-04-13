import type { User, Exercise, Submission } from "../db.js";
import type { NumberWordsContent } from "../services/content.js";
import type { NumberWordsFeedback } from "../services/grading.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderNumberWords(
  user: User,
  exercise: Exercise,
  submission: Submission | null
): string {
  const content: NumberWordsContent = JSON.parse(exercise.content);
  const feedback: NumberWordsFeedback | null = submission?.feedback
    ? JSON.parse(submission.feedback)
    : null;

  const dashboardUrl = `/s/${esc(user.token)}`;

  // Read-only feedback mode
  if (submission && feedback) {
    const itemsHtml = content.items.map((item, i) => {
      const result = feedback.results[i];
      const correct = result?.correct ?? false;
      const icon = correct ? "✓" : "✗";
      const iconColor = correct ? "#2D6A4F" : "#c0392b";
      const note = result?.note ?? "";
      const userAns = esc(result?.userAnswer ?? "");
      const correctAns = esc(result?.correctAnswer ?? item.answer);
      return `<div class="num-card" style="border-left:4px solid ${iconColor}">
  <div class="num-display">${esc(item.display)}</div>
  <div class="result-row">
    <span class="result-icon" style="color:${iconColor}">${icon}</span>
    <span class="user-answer">${userAns || "<em>sin respuesta</em>"}</span>
  </div>
  ${!correct ? `<div class="correct-ans">Respuesta correcta: <strong>${correctAns}</strong></div>` : ""}
  ${note ? `<div class="result-note">${esc(note)}</div>` : ""}
</div>`;
    }).join("\n");

    const score = feedback.results.filter(r => r.correct).length;
    const total = content.items.length;

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Numbers in Words — Resultado</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 16px; color: #1a1a1a; }
  .container { max-width: 480px; margin: 0 auto; }
  .back-btn { display: inline-block; color: #555; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
  .back-btn:hover { color: #1a1a1a; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #888; margin: 0 0 8px; }
  .score-badge { font-size: 14px; font-weight: 600; color: #555; margin-bottom: 24px; }
  .num-card { background: #fafafa; border-radius: 8px; padding: 16px 16px 14px; margin-bottom: 14px; border-left: 4px solid #ccc; }
  .num-display { font-family: 'JetBrains Mono', monospace; font-size: 40px; font-weight: 700; letter-spacing: -1px; margin-bottom: 10px; color: #1a1a1a; }
  .result-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .result-icon { font-size: 18px; font-weight: 700; flex-shrink: 0; }
  .user-answer { font-size: 15px; }
  .correct-ans { font-size: 13px; color: #555; margin-top: 4px; }
  .result-note { font-size: 12px; color: #888; margin-top: 4px; font-style: italic; }
</style>
</head>
<body>
<div class="container">
  <a href="${dashboardUrl}" class="back-btn">← Volver</a>
  <div class="card">
    <h2>Numbers in Words</h2>
    <p class="subtitle">${esc("")}</p>
    <p class="score-badge">Resultado: ${score} / ${total}</p>
    ${itemsHtml}
  </div>
</div>
</body>
</html>`;
  }

  // Interactive mode
  const itemsHtml = content.items.map((item, i) => `<div class="num-card">
  <div class="num-display">${esc(item.display)}</div>
  <input
    class="num-input"
    id="inp-${i}"
    type="text"
    placeholder="Write in words..."
    autocorrect="off"
    autocapitalize="off"
    spellcheck="false"
    oninput="checkReady()"
  >
</div>`).join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Numbers in Words</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
  body { font-family: system-ui, sans-serif; background: #f5f5f5; margin: 0; padding: 16px; color: #1a1a1a; }
  .container { max-width: 480px; margin: 0 auto; }
  .back-btn { display: inline-block; color: #555; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
  .back-btn:hover { color: #1a1a1a; }
  .card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #888; margin: 0 0 20px; }
  .instruction { font-size: 14px; color: #555; margin-bottom: 20px; }
  .num-card { background: #fafafa; border-radius: 8px; padding: 16px; margin-bottom: 14px; border: 1px solid #e8e8e8; }
  .num-display { font-family: 'JetBrains Mono', monospace; font-size: 48px; font-weight: 700; letter-spacing: -1px; margin-bottom: 12px; color: #1a1a1a; }
  .num-input { width: 100%; box-sizing: border-box; border: 1.5px solid #ccc; border-radius: 6px; padding: 10px 12px; font-size: 15px; outline: none; transition: border-color .15s; }
  .num-input:focus { border-color: #1a1a1a; }
  .submit-btn { width: 100%; padding: 12px; background: #1a1a1a; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: opacity .15s; }
  .submit-btn:disabled { opacity: .4; cursor: default; }
  .submit-btn:hover:not(:disabled) { opacity: .85; }
  #thinkingAnim { display: none; text-align: center; font-size: 18px; margin-top: 10px; color: #555; }
</style>
</head>
<body>
<div class="container">
  <a href="${dashboardUrl}" class="back-btn">← Volver</a>
  <div class="card">
    <h2>Numbers in Words</h2>
    <p class="subtitle">${esc("")}</p>
    <p class="instruction">Write each number as words in English.</p>
    ${itemsHtml}
    <button class="submit-btn" id="submitBtn" disabled onclick="submitAnswers()">Enviar</button>
    <div id="thinkingAnim"></div>
  </div>
</div>
<script>
(function() {
  var TOTAL = ${content.items.length};
  var spinnerFrames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  var spinnerIdx = 0;
  var spinnerTimer = null;

  function startThinking() {
    var el = document.getElementById('thinkingAnim');
    el.style.display = 'block';
    spinnerTimer = setInterval(function() {
      spinnerIdx = (spinnerIdx + 1) % spinnerFrames.length;
      el.textContent = spinnerFrames[spinnerIdx] + ' Evaluando...';
    }, 80);
    el.textContent = spinnerFrames[0] + ' Evaluando...';
  }

  function stopThinking() {
    clearInterval(spinnerTimer);
    document.getElementById('thinkingAnim').style.display = 'none';
  }

  window.checkReady = function() {
    var allFilled = true;
    for (var i = 0; i < TOTAL; i++) {
      var inp = document.getElementById('inp-' + i);
      if (!inp || !inp.value.trim()) { allFilled = false; break; }
    }
    document.getElementById('submitBtn').disabled = !allFilled;
  };

  window.submitAnswers = function() {
    var answers = [];
    for (var i = 0; i < TOTAL; i++) {
      var inp = document.getElementById('inp-' + i);
      answers.push(inp ? inp.value.trim() : '');
    }
    var btn = document.getElementById('submitBtn');
    btn.disabled = true;
    startThinking();

    fetch(window.location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    }).then(function(r) { return r.json(); }).then(function(d) {
      stopThinking();
      if (d && d.showEmailPrompt) sessionStorage.setItem('emailPromptPending', '1');
      window.location.reload();
    }).catch(function() {
      stopThinking();
      btn.disabled = false;
    });
  };
})();
</script>
</body>
</html>`;
}
