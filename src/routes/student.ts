import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  getUserByToken,
  getExerciseById,
  getSubmission,
  createSubmission,
  updateSubmissionFeedback,
  addToWordBank,
  getTodaysBoardWithStatus,
  getActivityData,
  getCurrentStreak,
  getLongestStreak,
  getRecentBoardsWithStatus,
  getTotalSubmissions,
  getTotalBoardsCompleted,
  getRecentSubmissionsWithType,
  registerGuestUser,
  type User,
  type ExerciseType,
} from "../db.js";
import {
  gradeLongReading,
  gradeShortReading,
  gradeVocabulary,
  gradeFillGap,
  gradeWritingMicro,
  gradeMiniWriting,
  gradeWordSearch,
} from "../services/grading.js";
import type {
  LongReadingContent,
  ShortReadingContent,
  VocabularyContent,
  FillGapContent,
  WritingMicroContent,
  MiniWritingContent,
  WordSearchContent,
} from "../services/content.js";
import { renderDashboard } from "../templates/dashboard.js";
import { renderStatsPage } from "../templates/stats.js";
import { renderLongReading } from "../templates/exercise-long-reading.js";
import { renderShortReading } from "../templates/exercise-short-reading.js";
import { renderVocabulary } from "../templates/exercise-vocabulary.js";
import { renderFillGap } from "../templates/exercise-fill-gap.js";
import { renderWritingMicro } from "../templates/exercise-writing.js";
import { renderMiniWriting } from "../templates/exercise-mini-writing.js";
import { renderWordSearch } from "../templates/exercise-word-search.js";

const app = new Hono();

// Validate token and set user on context
function resolveUser(token: string): User | undefined {
  return getUserByToken(token);
}

const EXERCISE_RENDERERS: Record<ExerciseType, (user: User, exercise: any, submission: any) => string> = {
  long_reading: renderLongReading,
  short_reading: renderShortReading,
  vocabulary: renderVocabulary,
  fill_gap: renderFillGap,
  writing_micro: renderWritingMicro,
  mini_writing: renderMiniWriting,
  word_search: renderWordSearch,
};

// Student dashboard
app.get("/:token", (c) => {
  const user = resolveUser(c.req.param("token"));
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

  const todaysBoard = getTodaysBoardWithStatus(user.id);
  const activityData = getActivityData(user.id);
  const currentStreak = getCurrentStreak(user.id);
  const longestStreak = getLongestStreak(user.id);
  const recentBoards = getRecentBoardsWithStatus(user.id);

  const html = renderDashboard(user, todaysBoard, activityData, currentStreak, longestStreak, recentBoards);
  return c.html(html);
});

// Stats page
app.get("/:token/stats", (c) => {
  const user = resolveUser(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const activityData = getActivityData(user.id);
  const currentStreak = getCurrentStreak(user.id);
  const longestStreak = getLongestStreak(user.id);
  const totalExercises = getTotalSubmissions(user.id);
  const totalBoards = getTotalBoardsCompleted(user.id);
  const recentSubmissions = getRecentSubmissionsWithType(user.id, 20);

  const html = renderStatsPage(user, activityData, currentStreak, longestStreak, totalExercises, totalBoards, recentSubmissions);
  return c.html(html);
});

// Exercise page
app.get("/:token/exercise/:exerciseId", (c) => {
  const user = resolveUser(c.req.param("token"));
  if (!user) return c.text("Invalid link.", 404);

  const exerciseId = parseInt(c.req.param("exerciseId"), 10);
  if (isNaN(exerciseId)) return c.text("Not found.", 404);

  const exercise = getExerciseById(exerciseId);
  if (!exercise) return c.text("Not found.", 404);

  const renderer = EXERCISE_RENDERERS[exercise.type as ExerciseType];
  if (!renderer) return c.text("Not found.", 404);

  // Get existing submission for read-only feedback mode
  const submission = getSubmission(user.id, exercise.id) ?? null;

  const html = renderer(user, exercise, submission);
  return c.html(html);
});

// =============================================
// Client → Grader data transformations
// The client-side JS sends { answers: { key: value } } objects,
// but graders expect typed arrays/objects.
// =============================================

function transformReadingAnswers(body: any): { answers: Array<{ number: number; answer: string }> } {
  // Already in grader format: { answers: [{ number, answer }] }
  if (Array.isArray(body.answers)) return body;
  // Client format: { answers: { "1": "A", "2": "B" } }
  const raw = body.answers || {};
  return {
    answers: Object.entries(raw).map(([key, val]) => ({
      number: parseInt(key, 10),
      answer: String(val),
    })),
  };
}

function transformVocabularyAnswers(
  body: any,
  content: VocabularyContent
): { matches: Array<{ word: string; matched_definition: string }> } {
  // Already in grader format: { matches: [{ word, matched_definition }] }
  if (Array.isArray(body.matches)) return body;
  // Client format: { answers: { wordIndex: defOrigIndex } }
  const raw = body.answers || {};
  return {
    matches: Object.entries(raw).map(([wordIdx, defIdx]) => ({
      word: content.words[parseInt(wordIdx, 10)]?.word ?? "",
      matched_definition: content.words[parseInt(String(defIdx), 10)]?.definition ?? "",
    })),
  };
}

function transformFillGapAnswers(body: any): { fills: Array<{ number: number; word: string }> } {
  // Already in grader format: { fills: [{ number, word }] }
  if (Array.isArray(body.fills)) return body;
  // Client format: { answers: { "1": "word" } }
  const raw = body.answers || {};
  return {
    fills: Object.entries(raw).map(([key, val]) => ({
      number: parseInt(key, 10),
      word: String(val),
    })),
  };
}

function transformWritingAnswers(body: any): { text: string } {
  // Already in grader format: { text: "..." }
  if (typeof body.text === "string") return body;
  // Client format: { answers: { text: "..." } }
  return { text: body.answers?.text ?? "" };
}

// =============================================
// Grader → Template feedback transformations
// Graders return { results: [...] } but templates expect flat arrays.
// Also map field names to match template interfaces.
// =============================================

function transformReadingFeedback(feedback: any): any[] {
  return (feedback.results || []).map((r: any) => ({
    correct: r.correct,
    user_answer: r.user_answer,
    correct_answer: r.correct_answer,
    explanation: r.explanation,
  }));
}

function transformVocabularyFeedback(feedback: any, content: VocabularyContent): any[] {
  return (feedback.results || []).map((r: any) => {
    const wordEntry = content.words.find(w => w.word === r.word);
    return {
      word: r.word,
      correct: r.correct,
      correct_definition: r.correct_definition,
      user_definition: "",
      context: wordEntry?.context ?? "",
    };
  });
}

function transformFillGapFeedback(feedback: any): any[] {
  return (feedback.results || []).map((r: any) => ({
    blank_number: r.number,
    user_word: r.user_word,
    correct_word: r.correct_word,
    correct: r.correct,
    explanation: "",
  }));
}

// Submit exercise answers
app.post("/:token/exercise/:exerciseId", async (c) => {
  const user = resolveUser(c.req.param("token"));
  if (!user) return c.json({ error: "Invalid link." }, 404);

  const exerciseId = parseInt(c.req.param("exerciseId"), 10);
  if (isNaN(exerciseId)) return c.json({ error: "Not found." }, 404);

  const exercise = getExerciseById(exerciseId);
  if (!exercise) return c.json({ error: "Not found." }, 404);

  // Prevent duplicate submissions — return existing feedback
  const existing = getSubmission(user.id, exercise.id);
  if (existing) {
    return c.json({
      score: existing.score,
      maxScore: exercise.max_score,
      feedback: existing.feedback ? JSON.parse(existing.feedback) : null,
    });
  }

  try {
    const body = await c.req.json();
    const content = JSON.parse(exercise.content);

    let gradeResult;
    let storedAnswers: any;
    let storedFeedback: any;

    switch (exercise.type as ExerciseType) {
      case "long_reading": {
        const transformed = transformReadingAnswers(body);
        gradeResult = gradeLongReading(content as LongReadingContent, transformed);
        storedAnswers = transformed;
        storedFeedback = transformReadingFeedback(gradeResult.feedback);
        break;
      }
      case "short_reading": {
        const transformed = transformReadingAnswers(body);
        gradeResult = gradeShortReading(content as ShortReadingContent, transformed);
        storedAnswers = transformed;
        storedFeedback = transformReadingFeedback(gradeResult.feedback);
        break;
      }
      case "vocabulary": {
        const vocabContent = content as VocabularyContent;
        const transformed = transformVocabularyAnswers(body, vocabContent);
        gradeResult = gradeVocabulary(vocabContent, transformed);
        storedAnswers = transformed;
        storedFeedback = transformVocabularyFeedback(gradeResult.feedback, vocabContent);
        break;
      }
      case "fill_gap": {
        const transformed = transformFillGapAnswers(body);
        gradeResult = gradeFillGap(content as FillGapContent, transformed);
        storedAnswers = transformed;
        storedFeedback = transformFillGapFeedback(gradeResult.feedback);
        break;
      }
      case "writing_micro": {
        const transformed = transformWritingAnswers(body);
        gradeResult = await gradeWritingMicro(content as WritingMicroContent, transformed, user.name);
        storedAnswers = transformed;
        storedFeedback = gradeResult.feedback; // Writing feedback shape matches template
        break;
      }
      case "mini_writing": {
        const transformed = transformWritingAnswers(body);
        gradeResult = await gradeMiniWriting(content as MiniWritingContent, { text: transformed.text });
        storedAnswers = transformed;
        storedFeedback = gradeResult.feedback;
        break;
      }
      case "word_search": {
        const wsContent = content as WordSearchContent;
        const foundWords = (body.answers?.found_words ?? []) as string[];
        gradeResult = gradeWordSearch(wsContent, { found_words: foundWords });
        storedAnswers = body.answers;
        storedFeedback = gradeResult.feedback;
        break;
      }
      default:
        return c.json({ error: "Unknown exercise type." }, 400);
    }

    // Save submission with transformed data for template compatibility
    const submissionId = createSubmission(user.id, exercise.id, JSON.stringify(storedAnswers));
    updateSubmissionFeedback(submissionId, gradeResult.score, JSON.stringify(storedFeedback));

    // Add vocabulary words to word bank
    if (exercise.type === "vocabulary") {
      const vocabContent = content as VocabularyContent;
      for (const w of vocabContent.words) {
        addToWordBank(user.id, w.word, w.definition, w.context, exercise.id);
      }
    }

    // Add word search words to word bank
    if (exercise.type === "word_search") {
      const wsContent = content as WordSearchContent;
      for (const w of wsContent.words) {
        addToWordBank(user.id, w.word, w.definition, w.example, exercise.id);
      }
    }

    // Check if guest just completed their first exercise
    const showEmailPrompt = user.is_guest === 1 && getTotalSubmissions(user.id) === 1;

    return c.json({
      score: gradeResult.score,
      maxScore: exercise.max_score,
      feedback: gradeResult.feedback,
      ...(showEmailPrompt ? { showEmailPrompt: true } : {}),
    });
  } catch (err: any) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: "POST",
      path: c.req.path,
      error: err.message,
      stack: err.stack,
    }));
    return c.json({ error: "Submission failed. Please try again." }, 500);
  }
});

// POST /:token/register — register a guest user with email
app.post("/:token/register", async (c) => {
  const user = resolveUser(c.req.param("token"));
  if (!user) return c.json({ error: "Invalid link." }, 404);
  if (!user.is_guest) return c.json({ ok: true }); // already registered

  try {
    const body = await c.req.json();
    const email = (typeof body.email === "string" ? body.email : "").trim().toLowerCase();
    if (!email || !email.includes("@")) return c.json({ error: "Correo inválido." }, 400);

    const name = (typeof body.name === "string" ? body.name : "").trim() || email.split("@")[0];
    const updated = registerGuestUser(user.token, email, name);
    if (!updated) return c.json({ error: "Este correo ya está en uso." }, 409);
    return c.json({ ok: true });
  } catch {
    return c.json({ error: "Error al registrar." }, 500);
  }
});

export default app;
