function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildInviteEmailHtml(
  userName: string,
  practiceUrl: string,
  topic: string,
  unsubscribeUrl?: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">

        <tr><td style="padding:0 0 24px;">
          <div style="font-family:'Playfair Display',Georgia,'Times New Roman',serif;font-size:18px;color:#111;line-height:1.7;">
            Hola ${esc(userName)},
          </div>
        </td></tr>

        <tr><td style="padding:0 0 8px;">
          <div style="font-size:16px;color:#111;line-height:1.7;">
            Tus 7 ejercicios de hoy est&aacute;n listos.
          </div>
        </td></tr>

        <tr><td style="padding:0 0 28px;">
          <div style="font-size:16px;color:#111;line-height:1.7;">
            Tema: <strong>${esc(topic)}</strong>
          </div>
        </td></tr>

        <tr><td style="padding:0 0 32px;text-align:center;">
          <a href="${esc(practiceUrl)}" target="_blank" style="
            display:inline-block;
            background:#CC0000;
            color:#ffffff;
            text-decoration:none;
            padding:14px 40px;
            font-family:Georgia,'Times New Roman',serif;
            font-size:16px;
            font-weight:600;
            border-radius:6px;
          ">Comenzar &rarr;</a>
        </td></tr>

        <tr><td style="padding:16px 0 0;border-top:1px solid #e0e0e0;">
          <div style="font-size:12px;color:#999;text-align:center;">
            &mdash; IELTS Daily
            ${unsubscribeUrl ? `<br><a href="${esc(unsubscribeUrl)}" style="color:#bbb;font-size:11px;">Cancelar suscripci&oacute;n</a>` : ""}
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
