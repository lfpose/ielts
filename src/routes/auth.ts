import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getUserByToken, getUserByEmail, createUser, createGuestUser, setEmailUnsubscribed } from "../db.js";
import { renderLanding } from "../templates/landing.js";

const app = new Hono();

// GET / — if session cookie valid, redirect to dashboard; otherwise show landing page
app.get("/", (c) => {
  const sessionToken = getCookie(c, "session_token");
  if (sessionToken) {
    const user = getUserByToken(sessionToken);
    if (user) {
      return c.redirect(`/s/${user.token}`);
    }
  }
  return c.html(renderLanding());
});

// POST /login — look up user by email, set cookie, redirect to dashboard
app.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();

  if (!email) {
    return c.html(renderLanding("Por favor ingresa tu correo electrónico."));
  }

  const user = getUserByEmail(email) ?? createUser(email, email.split("@")[0]);

  const isProduction = process.env.NODE_ENV === "production" || process.env.FLY_APP_NAME;
  setCookie(c, "session_token", user.token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: !!isProduction,
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: "/",
  });

  return c.redirect(`/s/${user.token}`);
});

// POST /guest-login — create guest user, set cookie, redirect to dashboard
app.post("/guest-login", (c) => {
  // If already logged in, redirect
  const existing = getCookie(c, "session_token");
  if (existing) {
    const user = getUserByToken(existing);
    if (user) return c.redirect(`/s/${user.token}`);
  }

  const guest = createGuestUser();
  const isProduction = process.env.NODE_ENV === "production" || process.env.FLY_APP_NAME;
  setCookie(c, "session_token", guest.token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: !!isProduction,
    maxAge: 365 * 24 * 60 * 60,
    path: "/",
  });
  return c.redirect(`/s/${guest.token}`);
});

// GET /unsubscribe?token=:token — unsubscribe from daily emails
app.get("/unsubscribe", (c) => {
  const token = c.req.query("token");
  if (token) {
    const user = getUserByToken(token);
    if (user) setEmailUnsubscribed(token);
  }
  return c.html(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cancelar suscripción</title>
<style>body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F9F9F7;color:#111}
.box{max-width:400px;text-align:center;padding:40px 24px;border:1px solid #E5E5E0}
h1{font-size:24px;margin-bottom:16px}p{font-size:15px;color:#737373;line-height:1.7;margin-bottom:24px}
a{color:#111;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px}</style></head>
<body><div class="box"><h1>Te dimos de baja</h1>
<p>Ya no recibirás el ejercicio diario en tu correo. Puedes volver a suscribirte desde tu tablero.</p>
${token ? `<a href="/s/${token}">Volver al tablero →</a>` : ""}</div></body></html>`);
});

export default app;
