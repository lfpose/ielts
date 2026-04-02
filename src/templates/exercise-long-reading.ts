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

      let inputHtml = "";
      if (q.type === "multiple_choice" && q.options) {
        const letters = ["A", "B", "C", "D"];
        inputHtml = `<div class="options vertical">${q.options
          .map((opt, oi) => {
            const val = letters[oi];
            const selected = fb?.user_answer === val;
            const isCorrect = fb?.correct_answer === val;
            let cls = "pill";
            if (answered && fb) {
              if (selected && fb.correct) cls = "pill correct";
              else if (selected && !fb.correct) cls = "pill incorrect";
              else if (isCorrect) cls = "pill correct-answer";
            }
            return `<label class="${cls}">
              <input type="radio" name="q${q.number}" value="${val}" ${answered ? "disabled" : ""} ${selected ? "checked" : ""}>
              <span class="pill-label">${val}</span>
              <span class="pill-text">${esc(stripOptionPrefix(opt))}</span>
            </label>`;
          })
          .join("")}</div>`;
      } else if (q.type === "true_false_ng") {
        const tfnOptions = ["True", "False", "Not Given"];
        inputHtml = `<div class="options horizontal">${tfnOptions
          .map((opt) => {
            const val = opt;
            const selected = fb?.user_answer === val;
            const isCorrect = fb?.correct_answer === val;
            let cls = "pill";
            if (answered && fb) {
              if (selected && fb.correct) cls = "pill correct";
              else if (selected && !fb.correct) cls = "pill incorrect";
              else if (isCorrect) cls = "pill correct-answer";
            }
            return `<label class="${cls}">
              <input type="radio" name="q${q.number}" value="${val}" ${answered ? "disabled" : ""} ${selected ? "checked" : ""}>
              <span class="pill-text">${esc(opt)}</span>
            </label>`;
          })
          .join("")}</div>`;
      }

      const questionText = q.type === "true_false_ng" ? q.statement : q.question;

      let feedbackHtml = "";
      if (answered && fb) {
        feedbackHtml = `<div class="q-feedback ${fb.correct ? "fb-correct" : "fb-incorrect"}">
          <span class="fb-icon">${fb.correct ? "\u2713" : "\u2717"}</span>
          ${!fb.correct ? `<div class="fb-answer">Respuesta correcta: <strong>${esc(fb.correct_answer)}</strong></div>` : ""}
          <div class="fb-explanation">${esc(fb.explanation)}</div>
        </div>`;
      }

      return `<div class="question">
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
        <span class="score-num">${submission.score}/${exercise.max_score}</span>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lectura Larga — The IELTS Daily</title>
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

    /* BACK LINK */
    .back{display:inline-flex;align-items:center;gap:6px;font-family:'Inter',sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:var(--n500);margin-bottom:24px;transition:color .15s}
    .back:hover{color:var(--fg)}

    /* KICKER + TITLE */
    .kicker{font-family:'Inter',sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:var(--red);margin-bottom:8px}
    .article-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;line-height:1.2;margin-bottom:24px}

    /* PASSAGE */
    .passage{margin-bottom:32px}
    .passage p{font-family:'Lora',Georgia,serif;font-size:16px;line-height:1.7;text-align:justify;margin-bottom:16px}
    .passage p:last-child{margin-bottom:0}

    /* DIVIDER */
    .divider{border:none;border-top:2px solid var(--fg);margin:32px 0}

    /* SCORE */
    .score-display{text-align:center;margin-bottom:24px;padding:16px;border:2px solid var(--correct);background:color-mix(in srgb, var(--correct) 8%, var(--bg))}
    .score-num{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:var(--correct)}

    /* QUESTIONS */
    .questions-label{font-family:'Inter',sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:20px;padding-bottom:8px;border-bottom:2px solid var(--fg)}
    .question{display:flex;gap:14px;margin-bottom:24px}
    .q-number{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid var(--muted);border-radius:50%;color:var(--n500);flex-shrink:0;margin-top:2px}
    .q-body{flex:1;min-width:0}
    .q-text{font-family:'Inter',sans-serif;font-size:15px;font-weight:500;line-height:1.5;margin-bottom:12px}

    /* PILL OPTIONS */
    .options{display:flex;gap:8px}
    .options.vertical{flex-direction:column}
    .options.horizontal{flex-direction:row;flex-wrap:wrap}
    .pill{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--muted);cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;font-size:14px}
    .pill:hover{border-color:var(--fg)}
    .pill input{position:absolute;opacity:0;width:0;height:0}
    .pill.selected{border-color:var(--fg);background:var(--n100)}
    .pill-label{font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:500;color:var(--n500);flex-shrink:0;width:20px}
    .pill-text{line-height:1.4}

    /* FEEDBACK STATES */
    .pill.correct{border-color:var(--correct);background:color-mix(in srgb, var(--correct) 10%, var(--bg))}
    .pill.incorrect{border-color:var(--red);background:color-mix(in srgb, var(--red) 8%, var(--bg))}
    .pill.correct-answer{border-color:var(--correct);border-style:dashed}
    .q-feedback{margin-top:10px;padding:10px 14px;font-family:'Inter',sans-serif;font-size:13px;line-height:1.5;border-left:3px solid}
    .fb-correct{border-color:var(--correct);background:color-mix(in srgb, var(--correct) 6%, var(--bg))}
    .fb-incorrect{border-color:var(--red);background:color-mix(in srgb, var(--red) 5%, var(--bg))}
    .fb-icon{font-weight:700;margin-right:4px}
    .fb-correct .fb-icon{color:var(--correct)}
    .fb-incorrect .fb-icon{color:var(--red)}
    .fb-answer{margin-top:4px;font-size:12px;color:var(--n600)}
    .fb-explanation{margin-top:4px;color:var(--n600)}

    /* SUBMIT */
    .submit-row{text-align:center;margin-top:32px}
    .btn-submit{font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;background:var(--fg);color:var(--bg);border:none;cursor:pointer;transition:opacity .15s}
    .btn-submit:disabled{opacity:.3;cursor:not-allowed}
    .btn-submit:not(:disabled):hover{opacity:.85}
    .btn-back{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:14px 40px;border:1px solid var(--fg);color:var(--fg);transition:all .15s}
    .btn-back:hover{background:var(--fg);color:var(--bg)}

    /* FOOTER */
    .footer{text-align:center;padding:32px 0 16px;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--n500);text-transform:uppercase;letter-spacing:2px}

    @media(max-width:600px){
      .shell{padding:16px 12px}
      .article-title{font-size:22px}
      .passage p{font-size:15px}
      .options.horizontal{flex-direction:column}
    }
  </style>
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t);})()</script>
</head>
<body>
  <div class="shell">

    <a href="/s/${esc(user.token)}" class="back">&larr; Volver al tablero</a>

    <div class="kicker">Lectura Larga</div>
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

  ${submission ? "" : `<script>
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

  // Style selected pills
  form.addEventListener('change', function(e) {
    if (e.target.type === 'radio') {
      var group = form.querySelectorAll('input[name="' + e.target.name + '"]');
      for (var k = 0; k < group.length; k++) {
        group[k].closest('.pill').classList.remove('selected');
      }
      e.target.closest('.pill').classList.add('selected');
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
