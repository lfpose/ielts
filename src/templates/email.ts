function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildInviteEmailHtml(
  userName: string,
  practiceUrl: string,
  articleTitle: string,
  date: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#F9F9F7;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F9F7;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <tr><td style="text-align:center;padding:0 0 16px;">
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:32px;font-weight:900;color:#111;letter-spacing:-0.5px;">
            The IELTS Daily
          </div>
          <div style="margin-top:4px;height:3px;background:#111;"></div>
          <div style="margin-top:2px;height:1px;background:#111;"></div>
        </td></tr>

        <tr><td style="padding:24px 0 20px;">
          <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10px;color:#737373;text-transform:uppercase;letter-spacing:3px;">
            ${esc(date)}
          </div>
        </td></tr>

        <tr><td style="padding:0 0 24px;">
          <div style="font-size:16px;color:#111;line-height:1.7;">
            Hola ${esc(userName)},
          </div>
          <div style="margin-top:12px;font-size:16px;color:#111;line-height:1.7;">
            Tu pr&aacute;ctica de lectura de hoy est&aacute; lista:
          </div>
        </td></tr>

        <tr><td style="padding:0 0 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #111;">
            <tr><td style="padding:20px 24px;">
              <div style="font-size:20px;font-weight:bold;color:#111;line-height:1.35;">
                ${esc(articleTitle)}
              </div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 0 32px;text-align:center;">
          <a href="${esc(practiceUrl)}" target="_blank" style="
            display:inline-block;
            background:#111;
            color:#F9F9F7;
            text-decoration:none;
            padding:14px 40px;
            font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
            font-size:13px;
            font-weight:600;
            text-transform:uppercase;
            letter-spacing:2px;
          ">Comenzar Pr&aacute;ctica</a>
        </td></tr>

        <tr><td style="padding:16px 0;border-top:1px solid #111;">
          <div style="margin-top:1px;border-top:3px double #111;padding-top:12px;">
            <div style="font-size:11px;color:#737373;text-align:center;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:2px;">
              Cada d&iacute;a un paso m&aacute;s cerca
            </div>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
