function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderLanding(error?: string): string {
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=block');
    :root{--bg:#F9F9F7;--fg:#111;--muted:#E5E5E0;--red:#CC0000;--n100:#F5F5F5;--n500:#737373;--n600:#525252}
    [data-theme="dark"]{--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111;--fg:#E8E8E4;--muted:#2A2A28;--red:#FF4444;--n100:#1A1A1A;--n500:#888;--n600:#AAA}}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Lora',Georgia,serif;background:var(--bg);color:var(--fg);min-height:100vh;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E");
      display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}

    .landing{max-width:420px;width:100%;margin:0 auto;padding:32px 24px;text-align:center;border:1px solid var(--muted)}

    .masthead{border-bottom:4px double var(--fg);padding-bottom:14px;margin-bottom:32px}
    .mast-date{font-family:'Inter',sans-serif;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:var(--n500);margin-bottom:14px}
    .masthead h1{font-family:'Playfair Display',serif;font-size:42px;font-weight:900;line-height:.92;letter-spacing:-1px}
    .masthead .tag{font-family:'Inter',sans-serif;font-size:10px;letter-spacing:3px;color:var(--n500);margin-top:8px;text-transform:uppercase}

    .ornament{font-family:'Inter',sans-serif;font-size:12px;color:var(--n500);letter-spacing:4px;margin-bottom:24px}

    .intro{font-size:15px;line-height:1.7;color:var(--n600);margin-bottom:32px}

    .login-form{text-align:left}
    .login-form label{font-family:'Inter',sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:var(--n500);display:block;margin-bottom:8px}
    .login-form input[type="email"]{width:100%;padding:14px 0;font-family:'Lora',Georgia,serif;font-size:16px;border:none;border-bottom:1px solid var(--muted);border-radius:0;background:transparent;color:var(--fg);outline:none;transition:border-color .2s}
    .login-form input[type="email"]:focus{border-bottom-color:var(--fg)}
    .login-form input[type="email"]::placeholder{color:var(--n500)}

    .submit-btn{display:block;width:100%;margin-top:16px;padding:14px;background:var(--fg);color:var(--bg);border:1px solid transparent;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:2px;cursor:pointer;transition:all .2s}
    .submit-btn:hover{background:var(--bg);color:var(--fg);border-color:var(--fg)}

    .error-msg{margin-top:16px;padding:12px 16px;border:1px solid var(--red);color:var(--red);font-family:'Inter',sans-serif;font-size:13px;text-align:center}

    .footer{margin-top:40px;font-family:'Inter',sans-serif;font-size:11px;font-variant:small-caps;letter-spacing:4px;color:var(--n500)}

    .theme-toggle{position:fixed;top:16px;right:16px;background:none;border:1px solid var(--muted);color:var(--n500);width:30px;height:30px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;transition:all .15s}
    .theme-toggle:hover{border-color:var(--fg);color:var(--fg)}

    @media(max-width:600px){
      .landing{padding:24px 16px}
      .masthead h1{font-size:32px}
    }
  </style>
</head>
<body>
  <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">◐</button>
  <div class="landing">
    <div class="masthead">
      <div class="mast-date">${esc(todayStr)}</div>
      <h1>The IELTS Daily</h1>
      <div class="tag">Práctica diaria de lectura</div>
    </div>

    <div class="ornament">───── § ─────</div>

    <p class="intro">Ingresa tu correo electrónico para acceder a tus ejercicios de hoy.</p>

    <form class="login-form" method="POST" action="/login">
      <label for="email">Correo electrónico</label>
      <input type="email" id="email" name="email" placeholder="tu@correo.com" required autocomplete="email" autofocus>
      <button type="submit" class="submit-btn">Entrar →</button>
    </form>

    ${error ? `<div class="error-msg">${esc(error)}</div>` : ""}

    <div class="footer">Cada día un paso más cerca</div>
  </div>

  <script>
    function toggleTheme(){
      const h=document.documentElement;
      const t=h.getAttribute('data-theme')==='dark'?'light':'dark';
      h.setAttribute('data-theme',t);
      localStorage.setItem('theme',t);
    }
    (function(){
      const s=localStorage.getItem('theme');
      if(s)document.documentElement.setAttribute('data-theme',s);
    })();
  </script>
</body>
</html>`;
}
