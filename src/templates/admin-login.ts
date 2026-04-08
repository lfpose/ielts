function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderAdminLogin(error?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin · The IELTS Daily</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=block');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;width:100%;padding:32px;margin:16px}
    .branding{text-align:center;margin-bottom:24px;color:#64748b;font-size:13px;font-weight:500;letter-spacing:0.5px}
    h1{text-align:center;font-size:22px;font-weight:600;margin-bottom:24px}
    label{display:block;font-size:14px;font-weight:500;margin-bottom:6px}
    input[type="text"],input[type="password"]{width:100%;height:40px;border:1px solid #e2e8f0;border-radius:6px;padding:0 12px;font-size:14px;font-family:Inter,system-ui,sans-serif;outline:none;transition:border-color .15s,box-shadow .15s}
    input[type="text"]:focus,input[type="password"]:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.15)}
    .field{margin-bottom:16px}
    button{width:100%;height:40px;background:#18181b;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:500;font-family:Inter,system-ui,sans-serif;cursor:pointer;transition:background .15s}
    button:hover{background:#27272a}
    .error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:16px;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <div class="branding">The IELTS Daily · Admin</div>
    <h1>Iniciar sesión</h1>
    ${error ? `<div class="error">${esc(error)}</div>` : ""}
    <form method="POST" action="/admin/login">
      <div class="field">
        <label for="username">Usuario</label>
        <input type="text" id="username" name="username" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input type="password" id="password" name="password" autocomplete="current-password" required>
      </div>
      <button type="submit">Iniciar sesión</button>
    </form>
  </div>
</body>
</html>`;
}
