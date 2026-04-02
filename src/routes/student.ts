import { Hono } from "hono";
import { getUserByToken } from "../db.js";

const app = new Hono();

// Student dashboard — will be fully implemented in P3-7
app.get("/:token", (c) => {
  const user = getUserByToken(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);
  return c.text(`Welcome, ${user.name}. Dashboard coming soon.`);
});

export default app;
