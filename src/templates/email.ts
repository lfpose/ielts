import type { Article } from "../services/article.js";
import type { IELTSQuestions } from "../services/questions.js";

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return esc(text)
    .split("\n\n")
    .map((block) => {
      const lines = block.split("\n");
      return `<p style="margin:0 0 16px;line-height:1.8;color:#2C2C2C;">${lines.join("<br>")}</p>`;
    })
    .join("");
}

export function buildEmailHtml(
  article: Article,
  ielts: IELTSQuestions,
  date: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EB;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="padding:0 0 32px;">
          <div style="font-size:28px;font-weight:bold;color:#2C2C2C;letter-spacing:0.5px;">
            IELTS Daily
          </div>
          <div style="margin-top:4px;font-size:13px;color:#8A8278;font-style:italic;">
            ${esc(date)}
          </div>
          <div style="margin-top:16px;height:1px;background:linear-gradient(to right, #C47A5A, transparent);"></div>
        </td></tr>

        <!-- SPANISH INSTRUCTION -->
        <tr><td style="padding:0 0 28px;">
          <div style="background:#FAF7F2;border-left:3px solid #C47A5A;padding:16px 20px;border-radius:0 8px 8px 0;">
            <div style="font-size:13px;color:#8A8278;font-style:italic;line-height:1.7;">
              Hola! Tu pr&aacute;ctica de hoy est&aacute; lista. Lee el art&iacute;culo en el enlace
              de abajo y luego responde las preguntas. Cuando termines,
              <strong style="color:#4A5899;">responde este email con tus respuestas</strong>
              y recibir&aacute;s tu puntaje y retroalimentaci&oacute;n personalizada.
            </div>
          </div>
        </td></tr>

        <!-- ARTICLE CARD -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:10px;overflow:hidden;">
            <tr><td style="padding:28px 28px 20px;">
              <div style="font-size:11px;color:#B0A898;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">
                Lectura de hoy
              </div>
              <div style="font-size:22px;font-weight:bold;color:#2C2C2C;line-height:1.35;margin-bottom:12px;">
                ${esc(article.title)}
              </div>
              <div style="font-size:13px;color:#8A8278;margin-bottom:20px;">
                ${esc(article.source)}
              </div>
              <a href="${esc(article.url)}" target="_blank" style="
                display:inline-block;
                background:#4A5899;
                color:#FFFFFF;
                text-decoration:none;
                padding:12px 28px;
                border-radius:8px;
                font-size:14px;
                font-family:Georgia,serif;
              ">Leer el art&iacute;culo &rarr;</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- QUESTIONS -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:10px;overflow:hidden;">
            <tr><td style="padding:28px;">
              <div style="font-size:11px;color:#B0A898;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                Preguntas
              </div>
              <div style="font-size:13px;color:#8A8278;font-style:italic;margin-bottom:20px;">
                Responde basándote en lo que le&iacute;ste en el art&iacute;culo.
              </div>
              <div style="height:1px;background:#EDE8E0;margin-bottom:20px;"></div>
              <div style="font-size:15px;color:#2C2C2C;line-height:1.85;">
                ${textToHtml(ielts.questions)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- REPLY CTA -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDE6;border-radius:10px;border:1px dashed #D5CFC5;">
            <tr><td style="padding:24px 28px;text-align:center;">
              <div style="font-size:16px;color:#4A5899;font-weight:bold;margin-bottom:6px;">
                &iquest;Terminaste?
              </div>
              <div style="font-size:14px;color:#6B6560;line-height:1.6;">
                Responde este email con tus respuestas.<br>
                Un tutor de IA analizar&aacute; tus respuestas y te enviar&aacute;<br>
                tu puntaje con comentarios personalizados.
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:16px 0;">
          <div style="height:1px;background:linear-gradient(to right, transparent, #D5CFC5, transparent);margin-bottom:16px;"></div>
          <div style="font-size:12px;color:#B0A898;text-align:center;font-style:italic;">
            IELTS Daily &mdash; Cada d&iacute;a un paso m&aacute;s cerca
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildFeedbackHtml(
  feedback: string,
  score: string,
  articleTitle: string,
  date: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F5F1EB;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1EB;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr><td style="padding:0 0 32px;">
          <div style="font-size:28px;font-weight:bold;color:#2C2C2C;">
            IELTS Daily
          </div>
          <div style="margin-top:4px;font-size:13px;color:#8A8278;font-style:italic;">
            Resultados &mdash; ${esc(date)}
          </div>
          <div style="margin-top:16px;height:1px;background:linear-gradient(to right, #4A5899, transparent);"></div>
        </td></tr>

        <!-- SCORE CARD -->
        <tr><td style="padding:0 0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:10px;overflow:hidden;text-align:center;">
            <tr><td style="padding:32px 28px;">
              <div style="font-size:11px;color:#B0A898;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">
                Tu puntaje
              </div>
              <div style="font-size:52px;font-weight:bold;color:#4A5899;line-height:1;">
                ${esc(score)}
              </div>
              <div style="margin-top:12px;font-size:14px;color:#8A8278;font-style:italic;">
                ${esc(articleTitle)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- SPANISH NOTE -->
        <tr><td style="padding:0 0 24px;">
          <div style="background:#FAF7F2;border-left:3px solid #4A5899;padding:14px 20px;border-radius:0 8px 8px 0;">
            <div style="font-size:13px;color:#8A8278;font-style:italic;line-height:1.6;">
              Aqu&iacute; est&aacute; tu retroalimentaci&oacute;n detallada. Lee con atenci&oacute;n los
              comentarios de cada pregunta para mejorar tu t&eacute;cnica.
            </div>
          </div>
        </td></tr>

        <!-- FEEDBACK -->
        <tr><td style="padding:0 0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:10px;overflow:hidden;">
            <tr><td style="padding:28px;">
              <div style="font-size:11px;color:#B0A898;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;">
                Retroalimentaci&oacute;n detallada
              </div>
              <div style="height:1px;background:#EDE8E0;margin-bottom:20px;"></div>
              <div style="font-size:15px;color:#2C2C2C;line-height:1.85;">
                ${textToHtml(feedback)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="padding:16px 0;">
          <div style="height:1px;background:linear-gradient(to right, transparent, #D5CFC5, transparent);margin-bottom:16px;"></div>
          <div style="font-size:12px;color:#B0A898;text-align:center;font-style:italic;">
            IELTS Daily &mdash; Cada pr&aacute;ctica te hace m&aacute;s fuerte
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
