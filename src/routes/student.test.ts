import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

describe("Student routes", () => {
  let db: typeof import("../db.js");
  let studentApp: typeof import("./student.js");
  let Hono: typeof import("hono").Hono;

  beforeAll(async () => {
    process.env.DB_PATH = join(tmpdir(), `ielts-student-test-${randomUUID()}.db`);
    db = await import("../db.js");
    studentApp = await import("./student.js");
    const hono = await import("hono");
    Hono = hono.Hono;
  });

  function createApp() {
    const app = new Hono();
    app.route("/s", studentApp.default);
    return app;
  }

  it("returns 404 for invalid token", async () => {
    const app = createApp();
    const res = await app.request("/s/invalid-token-123");
    expect(res.status).toBe(404);
  });

  it("renders dashboard for valid user", async () => {
    const user = db.ensureUser("test-student@example.com", "Test Student");
    const app = createApp();
    const res = await app.request(`/s/${user.token}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Test Student");
    // Dashboard should show the "exercises being prepared" state or exercise cards
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("sets session cookie on first visit", async () => {
    const user = db.ensureUser("cookie-test@example.com", "Cookie User");
    const app = createApp();
    const res = await app.request(`/s/${user.token}`);
    expect(res.status).toBe(200);
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).toContain("session_token=");
  });

  it("returns 404 for invalid exercise id", async () => {
    const user = db.ensureUser("exercise-test@example.com", "Exercise User");
    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/99999`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for non-numeric exercise id", async () => {
    const user = db.ensureUser("exercise-test2@example.com", "Exercise User2");
    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/abc`);
    expect(res.status).toBe(404);
  });

  it("renders exercise page for valid exercise", async () => {
    const user = db.ensureUser("ex-render@example.com", "Ex Render");
    // Create a board and exercise
    const board = db.createBoard("2099-01-01", "Test Topic");
    const exercise = db.createExercise({
      board_id: board.id,
      slot: 1,
      type: "short_reading",
      content: JSON.stringify({
        title: "Test Passage",
        passage: "This is a test passage for reading.",
        questions: [
          { id: 1, type: "multiple_choice", question: "What is this?", options: ["A test", "Not a test"], correct_answer: "A test", explanation: "It is a test." },
          { id: 2, type: "true_false_ng", question: "This is false.", correct_answer: "False", explanation: "It is true." },
        ],
      }),
      max_score: 2,
    });

    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/${exercise.id}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Test Passage");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("renders exercise in feedback mode when already submitted", async () => {
    const user = db.ensureUser("submitted@example.com", "Submitted User");
    const board = db.createBoard("2099-01-02", "Submit Topic");
    const exercise = db.createExercise({
      board_id: board.id,
      slot: 2,
      type: "short_reading",
      content: JSON.stringify({
        title: "Submitted Passage",
        passage: "Already submitted passage.",
        questions: [
          { id: 1, type: "multiple_choice", question: "Q1?", options: ["A", "B"], correct_answer: "A", explanation: "Correct." },
          { id: 2, type: "true_false_ng", question: "Q2?", correct_answer: "True", explanation: "Yes." },
        ],
      }),
      max_score: 2,
    });

    // Create a submission
    const subId = db.createSubmission(user.id, exercise.id, JSON.stringify([{ questionId: 1, answer: "A" }, { questionId: 2, answer: "True" }]));
    db.updateSubmissionFeedback(subId, 2, JSON.stringify([
      { questionId: 1, correct: true, correctAnswer: "A", explanation: "Correct." },
      { questionId: 2, correct: true, correctAnswer: "True", explanation: "Yes." },
    ]));

    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/${exercise.id}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Submitted Passage");
    // Should show score since it's already submitted
    expect(html).toContain("2/2");
  });
});
