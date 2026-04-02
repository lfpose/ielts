import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getUserByToken } from "../db.js";

const app = new Hono();

// Student dashboard — will be fully implemented in P3-7
app.get("/:token", (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  // Set session cookie on first visit via token URL
  const existingCookie = getCookie(c, "session_token");
  if (existingCookie !== user.token) {
    const isProduction = process.env.NODE_ENV === "production" || process.env.FLY_APP_NAME;
    setCookie(c, "session_token", user.token, {
      httpOnly: true,
      sameSite: "Lax",
      secure: !!isProduction,
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });
  }

  return c.text(`Welcome, ${user.name}. Dashboard coming soon.`);
});

export default app;
