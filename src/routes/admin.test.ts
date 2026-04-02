import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

describe("Admin routes", () => {
  let db: typeof import("../db.js");
  let adminApp: typeof import("./admin.js");
  let Hono: typeof import("hono").Hono;

  const authHeader = "Basic " + Buffer.from("admin:ielts2024").toString("base64");

  beforeAll(async () => {
    process.env.DB_PATH = join(tmpdir(), `ielts-admin-test-${randomUUID()}.db`);
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || "re_test_fake_key";
    db = await import("../db.js");
    adminApp = await import("./admin.js");
    const hono = await import("hono");
    Hono = hono.Hono;
  });

  function createApp() {
    const app = new Hono();
    app.route("/admin", adminApp.default);
    return app;
  }

  it("returns 401 without auth", async () => {
    const app = createApp();
    const res = await app.request("/admin/");
    expect(res.status).toBe(401);
  });

  it("renders admin dashboard with auth", async () => {
    const app = createApp();
    const res = await app.request("/admin", {
      headers: { Authorization: authHeader },
    });
    // Hono may redirect /admin to /admin/ or serve directly
    expect([200, 301, 302]).toContain(res.status);
    if (res.status === 200) {
      const html = await res.text();
      expect(html).toContain("Admin");
    }
  });

  it("POST /admin/settings saves settings", async () => {
    const app = createApp();
    const formData = new URLSearchParams();
    formData.set("recipients", "test@example.com");
    formData.set("difficulty", "C1");

    const res = await app.request("/admin/settings", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    expect(res.status).toBe(302);

    // Verify settings were saved
    expect(db.getSetting("recipients")).toBe("test@example.com");
    expect(db.getSetting("difficulty")).toBe("C1");
  });

  it("POST /admin/users/add creates a user", async () => {
    const app = createApp();
    const res = await app.request("/admin/users/add", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Test User", email: "testuser@example.com" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.name).toBe("Test User");
    expect(data.user.email).toBe("testuser@example.com");
    expect(data.user.token).toBeDefined();
  });

  it("POST /admin/users/add rejects duplicate email", async () => {
    const app = createApp();
    const res = await app.request("/admin/users/add", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Dup User", email: "testuser@example.com" }),
    });
    expect(res.status).toBe(409);
  });

  it("GET /admin/users/:id returns user detail", async () => {
    const app = createApp();
    const users = db.getAllUsers();
    const user = users[0];

    const res = await app.request(`/admin/users/${user.id}`, {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe(user.name);
    expect(data.currentStreak).toBeDefined();
    expect(data.wordBankSize).toBeDefined();
  });

  it("POST /admin/users/:id/remove deletes user", async () => {
    const app = createApp();
    const user = db.createUser("remove-me@test.com", "Remove Me");

    const res = await app.request(`/admin/users/${user.id}/remove`, {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);

    const found = db.getUserByEmail("remove-me@test.com");
    expect(found).toBeUndefined();
  });

  it("POST /admin/topics/add adds a topic", async () => {
    const app = createApp();
    const res = await app.request("/admin/topics/add", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic: "Quantum Computing Basics" }),
    });
    expect(res.status).toBe(200);
    const topics = db.getAllTopics();
    expect(topics.some((t) => t.topic === "Quantum Computing Basics")).toBe(true);
  });

  it("POST /admin/topics/remove removes a topic", async () => {
    const app = createApp();
    const topicsBefore = db.getAllTopics();
    const topicToRemove = topicsBefore[topicsBefore.length - 1].topic;

    const res = await app.request("/admin/topics/remove", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic: topicToRemove }),
    });
    expect(res.status).toBe(200);
    const topicsAfter = db.getAllTopics();
    expect(topicsAfter.some((t) => t.topic === topicToRemove)).toBe(false);
  });

  it("POST /admin/topics/force forces a topic", async () => {
    const app = createApp();
    const topics = db.getAllTopics();
    const topicToForce = topics[0].topic;

    const res = await app.request("/admin/topics/force", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topic: topicToForce }),
    });
    expect(res.status).toBe(200);

    const updated = db.getAllTopics();
    const forced = updated.find((t) => t.topic === topicToForce);
    expect(forced?.forced_next).toBe(1);
  });

  it("POST /admin/topics/reorder reorders topics", async () => {
    const app = createApp();
    const topics = db.getAllTopics();
    const reversed = [...topics].reverse().map((t) => t.topic);

    const res = await app.request("/admin/topics/reorder", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topics: reversed }),
    });
    expect(res.status).toBe(200);

    const reordered = db.getAllTopics();
    expect(reordered[0].topic).toBe(reversed[0]);
  });

  it("GET /admin/api/board/today returns board data", async () => {
    const app = createApp();
    const res = await app.request("/admin/api/board/today", {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("board");
    expect(data).toHaveProperty("exercises");
  });

  it("GET /admin/api/stats returns stats", async () => {
    const app = createApp();
    const res = await app.request("/admin/api/stats", {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("activeUsersToday");
    expect(data).toHaveProperty("avgCompletion");
    expect(data).toHaveProperty("avgScore");
    expect(data).toHaveProperty("activeStreaks");
  });

  it("GET /admin/api/logs returns email logs", async () => {
    const app = createApp();
    const res = await app.request("/admin/api/logs", {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("stats");
    expect(data).toHaveProperty("logs");
  });

  it("GET /admin/api/topics returns topics", async () => {
    const app = createApp();
    const res = await app.request("/admin/api/topics", {
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("topics");
    expect(Array.isArray(data.topics)).toBe(true);
  });

  it("POST /admin/generate returns 409 if board already exists", async () => {
    const app = createApp();
    // Create a board for today
    const today = new Date().toISOString().slice(0, 10);
    db.createBoard(today, "Test Topic");

    const res = await app.request("/admin/generate", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(409);
  });

  it("POST /admin/email returns 400 when no board exists", async () => {
    // Delete board first
    const today = new Date().toISOString().slice(0, 10);
    db.deleteBoardByDate(today);

    const app = createApp();
    const res = await app.request("/admin/email", {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    expect(res.status).toBe(400);
  });
});
