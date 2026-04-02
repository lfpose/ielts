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

  it("renders stats page for valid user", async () => {
    const user = db.ensureUser("stats-test@example.com", "Stats User");
    const app = createApp();
    const res = await app.request(`/s/${user.token}/stats`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Estad");
    expect(html).toContain("Racha Actual");
    expect(html).toContain("Ejercicios");
    expect(html).toContain("Tableros");
    expect(html).toContain("Actividad");
    expect(html).toContain("Historial Reciente");
  });

  it("returns 404 for stats with invalid token", async () => {
    const app = createApp();
    const res = await app.request("/s/bad-token/stats");
    expect(res.status).toBe(404);
  });

  it("submits exercise and returns graded result", async () => {
    const user = db.ensureUser("submit-grade@example.com", "Submit Grader");
    const board = db.createBoard("2099-03-01", "Grading Topic");
    const exercise = db.createExercise({
      board_id: board.id,
      slot: 1,
      type: "short_reading",
      content: JSON.stringify({
        title: "Grading Passage",
        passage: "A short passage.",
        questions: [
          { number: 1, type: "multiple_choice", question: "Q1?", options: ["A", "B"], correct: "A", explanation: "A is correct." },
          { number: 2, type: "true_false_ng", statement: "Statement.", correct: "True", explanation: "It's true." },
        ],
      }),
      max_score: 2,
    });

    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/${exercise.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: [
          { number: 1, answer: "A" },
          { number: 2, answer: "True" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.score).toBe(2);
    expect(json.maxScore).toBe(2);
    expect(json.feedback.results).toHaveLength(2);
    expect(json.feedback.results[0].correct).toBe(true);
    expect(json.feedback.results[1].correct).toBe(true);
  });

  it("prevents duplicate submission and returns existing result", async () => {
    const user = db.ensureUser("dupe-submit@example.com", "Dupe User");
    const board = db.createBoard("2099-03-02", "Dupe Topic");
    const exercise = db.createExercise({
      board_id: board.id,
      slot: 1,
      type: "fill_gap",
      content: JSON.stringify({
        paragraph: "The __(1)__ is __(2)__.",
        blanks: [
          { number: 1, correct: "cat" },
          { number: 2, correct: "here" },
        ],
        word_bank: ["cat", "here", "dog"],
      }),
      max_score: 2,
    });

    // First submission
    const subId = db.createSubmission(user.id, exercise.id, JSON.stringify({ fills: [{ number: 1, word: "cat" }, { number: 2, word: "here" }] }));
    db.updateSubmissionFeedback(subId, 2, JSON.stringify({ results: [{ number: 1, correct: true, user_word: "cat", correct_word: "cat" }, { number: 2, correct: true, user_word: "here", correct_word: "here" }] }));

    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/${exercise.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fills: [{ number: 1, word: "dog" }, { number: 2, word: "dog" }] }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    // Should return existing result, not re-grade
    expect(json.score).toBe(2);
    expect(json.maxScore).toBe(2);
  });

  it("adds vocabulary words to word bank on submission", async () => {
    const user = db.ensureUser("vocab-bank@example.com", "Vocab User");
    const board = db.createBoard("2099-03-03", "Vocab Topic");
    const words = [
      { word: "abate", definition: "to reduce", context: "The storm began to abate." },
      { word: "candid", definition: "honest", context: "A candid response." },
      { word: "deft", definition: "skillful", context: "A deft move." },
      { word: "elicit", definition: "to draw out", context: "Elicit a response." },
      { word: "fervent", definition: "passionate", context: "A fervent supporter." },
      { word: "glib", definition: "fluent but shallow", context: "A glib remark." },
    ];
    const exercise = db.createExercise({
      board_id: board.id,
      slot: 3,
      type: "vocabulary",
      content: JSON.stringify({ words }),
      max_score: 6,
    });

    const app = createApp();
    const res = await app.request(`/s/${user.token}/exercise/${exercise.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matches: words.map((w) => ({ word: w.word, matched_definition: w.definition })),
      }),
    });
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.score).toBe(6);

    // Check word bank
    const wordBank = db.getUserWordBank(user.id);
    expect(wordBank.length).toBe(6);
    expect(wordBank.map((w: any) => w.word).sort()).toEqual(words.map((w) => w.word).sort());
  });

  it("returns 404 for POST with invalid token", async () => {
    const app = createApp();
    const res = await app.request("/s/bad-token/exercise/1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
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
