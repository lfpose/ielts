import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getUserByToken, getUserByEmail } from "../db.js";
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

  const user = getUserByEmail(email);
  if (!user) {
    return c.html(renderLanding("No encontramos tu cuenta."));
  }

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

export default app;
