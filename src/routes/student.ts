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
  type User,
  type ExerciseType,
} from "../db.js";
import {
  gradeLongReading,
  gradeShortReading,
  gradeVocabulary,
  gradeFillGap,
  gradeWritingMicro,
} from "../services/grading.js";
import type {
  LongReadingContent,
  ShortReadingContent,
  VocabularyContent,
  FillGapContent,
  WritingMicroContent,
} from "../services/content.js";
import { renderDashboard } from "../templates/dashboard.js";
import { renderStatsPage } from "../templates/stats.js";
import { renderLongReading } from "../templates/exercise-long-reading.js";
import { renderShortReading } from "../templates/exercise-short-reading.js";
import { renderVocabulary } from "../templates/exercise-vocabulary.js";
import { renderFillGap } from "../templates/exercise-fill-gap.js";
import { renderWritingMicro } from "../templates/exercise-writing.js";

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

  const body = await c.req.json();
  const content = JSON.parse(exercise.content);

  let gradeResult;
  switch (exercise.type as ExerciseType) {
    case "long_reading":
      gradeResult = gradeLongReading(content as LongReadingContent, body);
      break;
    case "short_reading":
      gradeResult = gradeShortReading(content as ShortReadingContent, body);
      break;
    case "vocabulary":
      gradeResult = gradeVocabulary(content as VocabularyContent, body);
      break;
    case "fill_gap":
      gradeResult = gradeFillGap(content as FillGapContent, body);
      break;
    case "writing_micro":
      gradeResult = await gradeWritingMicro(content as WritingMicroContent, body, user.name);
      break;
    default:
      return c.json({ error: "Unknown exercise type." }, 400);
  }

  // Save submission
  const submissionId = createSubmission(user.id, exercise.id, JSON.stringify(body));
  updateSubmissionFeedback(submissionId, gradeResult.score, JSON.stringify(gradeResult.feedback));

  // Add vocabulary words to word bank
  if (exercise.type === "vocabulary") {
    const vocabContent = content as VocabularyContent;
    for (const w of vocabContent.words) {
      addToWordBank(user.id, w.word, w.definition, w.context, exercise.id);
    }
  }

  return c.json({
    score: gradeResult.score,
    maxScore: exercise.max_score,
    feedback: gradeResult.feedback,
  });
});

export default app;
