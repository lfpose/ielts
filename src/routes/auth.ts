import { Hono } from "hono";

const app = new Hono();

// Landing page and auth — will be fully implemented in P2-1
app.get("/", (c) => {
  return c.text("The IELTS Daily — Coming soon.");
});

export default app;
