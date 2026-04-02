import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

describe("Database initialization", () => {
  beforeAll(() => {
    // Use a temp database so tests don't touch real data
    process.env.DB_PATH = join(tmpdir(), `ielts-test-${randomUUID()}.db`);
  });

  it("creates tables and populates topic_queue", async () => {
    // Dynamic import so DB_PATH env is set first
    const db = await import("./db.js");

    // Verify core tables exist by querying them
    const users = db.getAllUsers();
    expect(Array.isArray(users)).toBe(true);

    const topics = db.getAllTopics();
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0]).toHaveProperty("topic");
    expect(topics[0]).toHaveProperty("position");

    // Verify seed words were populated
    const seedCount = db.getSeedWordCount();
    expect(seedCount).toBeGreaterThan(0);
  });
});
