import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import { mkdirSync } from "fs";
import { SEED_WORDS } from "./word-bank-seed.js";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "ielts.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// --- Migration: Drop old tables (per specs/migration.md: full drop-and-recreate) ---
const hasOldSchema = (() => {
  try {
    db.prepare("SELECT id FROM daily_practices LIMIT 1").get();
    return true;
  } catch {
    return false;
  }
})();

if (hasOldSchema) {
  db.exec(`
    DROP TABLE IF EXISTS submissions;
    DROP TABLE IF EXISTS email_log;
    DROP TABLE IF EXISTS daily_practices;
    DROP TABLE IF EXISTS feedback_log;
  `);
}

// --- Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE NOT NULL,
    topic TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_boards_date ON boards(date);

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL REFERENCES boards(id),
    slot INTEGER NOT NULL,
    type TEXT NOT NULL,
    content JSON NOT NULL,
    max_score INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(board_id, slot)
  );
  CREATE INDEX IF NOT EXISTS idx_exercises_board ON exercises(board_id);

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    answers JSON NOT NULL,
    score INTEGER,
    feedback JSON,
    submitted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, exercise_id)
  );
  CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_exercise ON submissions(exercise_id);

  CREATE TABLE IF NOT EXISTS word_bank (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    word TEXT NOT NULL,
    definition TEXT NOT NULL,
    context TEXT,
    source_exercise_id INTEGER REFERENCES exercises(id),
    learned_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, word)
  );
  CREATE INDEX IF NOT EXISTS idx_word_bank_user ON word_bank(user_id);

  CREATE TABLE IF NOT EXISTS word_bank_seed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    difficulty TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topic_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT UNIQUE NOT NULL,
    position INTEGER NOT NULL,
    last_used_on TEXT,
    times_used INTEGER DEFAULT 0,
    forced_next INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_topic_queue_position ON topic_queue(position);

  CREATE TABLE IF NOT EXISTS topic_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    used_on TEXT NOT NULL,
    board_id INTEGER REFERENCES boards(id)
  );
  CREATE INDEX IF NOT EXISTS idx_topic_history_date ON topic_history(used_on);

  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at TEXT DEFAULT (datetime('now')),
    board_id INTEGER REFERENCES boards(id),
    recipients TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    duration_ms INTEGER
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// --- Migration: Add illustration column to boards ---
try {
  db.prepare("SELECT illustration FROM boards LIMIT 0").run();
} catch {
  db.exec("ALTER TABLE boards ADD COLUMN illustration TEXT");
}

// --- Pre-populate topic_queue with 20 topics from specs/content-pipeline.md ---
const INITIAL_TOPICS = [
  "Dinosaurs and prehistoric life",
  "The Great Barrier Reef",
  "How volcanoes work",
  "The history of chocolate",
  "Antarctica and its wildlife",
  "How the human brain learns",
  "The Amazon rainforest",
  "Ancient Egypt and the pyramids",
  "The water cycle and weather patterns",
  "Octopuses and marine intelligence",
  "The solar system and planets",
  "How bridges are built",
  "Migration patterns of birds",
  "The invention of the printing press",
  "Coral reefs and ocean ecosystems",
  "Traditional foods around the world",
  "The science of sleep",
  "Mountains: how they form and erode",
  "Bees and pollination",
  "The history of maps and navigation",
];

const topicCount = (db.prepare("SELECT COUNT(*) as count FROM topic_queue").get() as { count: number }).count;
if (topicCount === 0) {
  const insertTopic = db.prepare("INSERT INTO topic_queue (topic, position) VALUES (?, ?)");
  const insertMany = db.transaction((topics: string[]) => {
    for (let i = 0; i < topics.length; i++) {
      insertTopic.run(topics[i], i + 1);
    }
  });
  insertMany(INITIAL_TOPICS);
}

// --- Pre-populate word_bank_seed from src/word-bank-seed.ts ---
const seedCount = (db.prepare("SELECT COUNT(*) as count FROM word_bank_seed").get() as { count: number }).count;
if (seedCount === 0) {
  const insertSeed = db.prepare("INSERT INTO word_bank_seed (word, difficulty) VALUES (?, ?)");
  const insertAllSeeds = db.transaction((words: Array<{ word: string; difficulty: string }>) => {
    for (const w of words) {
      insertSeed.run(w.word, w.difficulty);
    }
  });
  insertAllSeeds(SEED_WORDS);
}

// =============================================
// Types
// =============================================

export interface User {
  id: number;
  email: string;
  name: string;
  token: string;
  created_at: string;
}

export interface Board {
  id: number;
  date: string;
  topic: string;
  illustration: string | null;
  created_at: string;
}

export type ExerciseType = "long_reading" | "short_reading" | "vocabulary" | "fill_gap" | "writing_micro" | "mini_writing" | "word_search";

export interface Exercise {
  id: number;
  board_id: number;
  slot: number;
  type: ExerciseType;
  content: string; // JSON string
  max_score: number;
  created_at: string;
}

export interface Submission {
  id: number;
  user_id: number;
  exercise_id: number;
  answers: string; // JSON string
  score: number | null;
  feedback: string | null; // JSON string
  submitted_at: string;
}

export interface WordBankEntry {
  id: number;
  user_id: number;
  word: string;
  definition: string;
  context: string | null;
  source_exercise_id: number | null;
  learned_at: string;
}

export interface WordBankSeedEntry {
  id: number;
  word: string;
  difficulty: "basic" | "intermediate" | "advanced";
}

export interface TopicQueueEntry {
  id: number;
  topic: string;
  position: number;
  last_used_on: string | null;
  times_used: number;
  forced_next: number;
}

export interface TopicHistoryEntry {
  id: number;
  topic: string;
  used_on: string;
  board_id: number | null;
}

export interface ActivityDay {
  date: string;
  score: number | null;
  submitted: boolean;
}

export interface ExerciseWithStatus extends Exercise {
  completed: boolean;
  user_score: number | null;
}

export interface BoardWithStatus {
  board: Board;
  exercises: ExerciseWithStatus[];
  totalScore: number;
  maxScore: number;
  completedCount: number;
}

// =============================================
// Users
// =============================================

export function getUserByToken(token: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE token = ?").get(token) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as User | undefined;
}

export function getAllUsers(): User[] {
  return db.prepare("SELECT * FROM users ORDER BY id").all() as User[];
}

export function createUser(email: string, name: string): User {
  const token = crypto.randomUUID();
  db.prepare("INSERT INTO users (email, name, token) VALUES (?, ?, ?)").run(email, name, token);
  return getUserByEmail(email)!;
}

export function deleteUser(id: number): void {
  db.prepare("DELETE FROM word_bank WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM submissions WHERE user_id = ?").run(id);
  db.prepare("DELETE FROM users WHERE id = ?").run(id);
}

export function ensureUser(email: string, name: string): User {
  return getUserByEmail(email) || createUser(email, name);
}

// =============================================
// Boards
// =============================================

export function getBoardByDate(date: string): Board | undefined {
  return db.prepare("SELECT * FROM boards WHERE date = ?").get(date) as Board | undefined;
}

export function getBoardById(id: number): Board | undefined {
  return db.prepare("SELECT * FROM boards WHERE id = ?").get(id) as Board | undefined;
}

export function getTodaysBoard(): Board | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return getBoardByDate(today);
}

export function createBoard(date: string, topic: string, illustration?: string): Board {
  const existing = getBoardByDate(date);
  if (existing) return existing;
  const result = db.prepare("INSERT INTO boards (date, topic, illustration) VALUES (?, ?, ?)").run(date, topic, illustration || null);
  return db.prepare("SELECT * FROM boards WHERE id = ?").get(result.lastInsertRowid) as Board;
}

export function deleteBoardByDate(date: string): void {
  const board = getBoardByDate(date);
  if (!board) return;
  db.prepare("DELETE FROM submissions WHERE exercise_id IN (SELECT id FROM exercises WHERE board_id = ?)").run(board.id);
  db.prepare("DELETE FROM exercises WHERE board_id = ?").run(board.id);
  db.prepare("DELETE FROM topic_history WHERE board_id = ?").run(board.id);
  db.prepare("DELETE FROM boards WHERE id = ?").run(board.id);
}

export function getRecentBoards(limit = 10): Board[] {
  return db.prepare("SELECT * FROM boards ORDER BY date DESC LIMIT ?").all(limit) as Board[];
}

// =============================================
// Exercises
// =============================================

export function getExercisesByBoardId(boardId: number): Exercise[] {
  return db.prepare("SELECT * FROM exercises WHERE board_id = ? ORDER BY slot").all(boardId) as Exercise[];
}

export function getExerciseById(id: number): Exercise | undefined {
  return db.prepare("SELECT * FROM exercises WHERE id = ?").get(id) as Exercise | undefined;
}

export function createExercise(data: {
  board_id: number;
  slot: number;
  type: ExerciseType;
  content: string;
  max_score: number;
}): Exercise {
  const result = db.prepare(
    "INSERT INTO exercises (board_id, slot, type, content, max_score) VALUES (?, ?, ?, ?, ?)"
  ).run(data.board_id, data.slot, data.type, data.content, data.max_score);
  return db.prepare("SELECT * FROM exercises WHERE id = ?").get(result.lastInsertRowid) as Exercise;
}

export function deleteExercise(id: number): void {
  db.prepare("DELETE FROM submissions WHERE exercise_id = ?").run(id);
  db.prepare("DELETE FROM exercises WHERE id = ?").run(id);
}

export function deleteExercisesByBoardId(boardId: number): void {
  db.prepare("DELETE FROM submissions WHERE exercise_id IN (SELECT id FROM exercises WHERE board_id = ?)").run(boardId);
  db.prepare("DELETE FROM exercises WHERE board_id = ?").run(boardId);
}

// =============================================
// Submissions
// =============================================

export function getSubmission(userId: number, exerciseId: number): Submission | undefined {
  return db.prepare(
    "SELECT * FROM submissions WHERE user_id = ? AND exercise_id = ?"
  ).get(userId, exerciseId) as Submission | undefined;
}

export function createSubmission(userId: number, exerciseId: number, answers: string): number {
  return db.prepare(
    "INSERT INTO submissions (user_id, exercise_id, answers) VALUES (?, ?, ?)"
  ).run(userId, exerciseId, answers).lastInsertRowid as number;
}

export function updateSubmissionFeedback(id: number, score: number | string, feedback: string): void {
  const numScore = typeof score === "number" ? score : parseInt(score, 10) || 0;
  db.prepare("UPDATE submissions SET score = ?, feedback = ? WHERE id = ?").run(numScore, feedback, id);
}

export function getSubmissionsByUserAndBoard(userId: number, boardId: number): Submission[] {
  return db.prepare(`
    SELECT s.* FROM submissions s
    JOIN exercises e ON e.id = s.exercise_id
    WHERE s.user_id = ? AND e.board_id = ?
    ORDER BY e.slot
  `).all(userId, boardId) as Submission[];
}

// =============================================
// Word Bank
// =============================================

export function addToWordBank(
  userId: number,
  word: string,
  definition: string,
  context: string | null,
  sourceExerciseId: number | null
): void {
  db.prepare(
    "INSERT OR IGNORE INTO word_bank (user_id, word, definition, context, source_exercise_id) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, word, definition, context, sourceExerciseId);
}

export function getUserWordBank(userId: number): WordBankEntry[] {
  return db.prepare("SELECT * FROM word_bank WHERE user_id = ? ORDER BY learned_at DESC").all(userId) as WordBankEntry[];
}

export function getUserWordBankCount(userId: number): number {
  return (db.prepare("SELECT COUNT(*) as count FROM word_bank WHERE user_id = ?").get(userId) as { count: number }).count;
}

export function getRandomUserWords(userId: number, limit: number): WordBankEntry[] {
  return db.prepare("SELECT * FROM word_bank WHERE user_id = ? ORDER BY RANDOM() LIMIT ?").all(userId, limit) as WordBankEntry[];
}

export function getRandomSeedWords(limit: number, difficulty?: string): WordBankSeedEntry[] {
  if (difficulty) {
    return db.prepare("SELECT * FROM word_bank_seed WHERE difficulty = ? ORDER BY RANDOM() LIMIT ?").all(difficulty, limit) as WordBankSeedEntry[];
  }
  return db.prepare("SELECT * FROM word_bank_seed ORDER BY RANDOM() LIMIT ?").all(limit) as WordBankSeedEntry[];
}

export function getSeedWordCount(): number {
  return (db.prepare("SELECT COUNT(*) as count FROM word_bank_seed").get() as { count: number }).count;
}

export function insertSeedWord(word: string, difficulty: string): void {
  db.prepare("INSERT OR IGNORE INTO word_bank_seed (word, difficulty) VALUES (?, ?)").run(word, difficulty);
}

export function insertSeedWords(words: Array<{ word: string; difficulty: string }>): void {
  const insert = db.prepare("INSERT OR IGNORE INTO word_bank_seed (word, difficulty) VALUES (?, ?)");
  const insertMany = db.transaction((items: Array<{ word: string; difficulty: string }>) => {
    for (const item of items) {
      insert.run(item.word, item.difficulty);
    }
  });
  insertMany(words);
}

// =============================================
// Topic Queue
// =============================================

export function getNextTopic(): TopicQueueEntry | undefined {
  // Forced topics first
  const forced = db.prepare(
    "SELECT * FROM topic_queue WHERE forced_next = 1 ORDER BY position LIMIT 1"
  ).get() as TopicQueueEntry | undefined;
  if (forced) return forced;

  // Then top of queue, skipping topics used in the last 20 days
  return db.prepare(`
    SELECT * FROM topic_queue
    WHERE (last_used_on IS NULL OR last_used_on <= date('now', '-20 days'))
    ORDER BY position
    LIMIT 1
  `).get() as TopicQueueEntry | undefined;
}

export function getAllTopics(): TopicQueueEntry[] {
  return db.prepare("SELECT * FROM topic_queue ORDER BY position").all() as TopicQueueEntry[];
}

export function addTopic(topic: string): void {
  const maxPos = (db.prepare("SELECT MAX(position) as max FROM topic_queue").get() as { max: number | null }).max ?? 0;
  db.prepare("INSERT OR IGNORE INTO topic_queue (topic, position) VALUES (?, ?)").run(topic, maxPos + 1);
}

export function removeTopic(topicId: number): void {
  db.prepare("DELETE FROM topic_queue WHERE id = ?").run(topicId);
}

export function reorderTopic(topicId: number, newPosition: number): void {
  const topic = db.prepare("SELECT * FROM topic_queue WHERE id = ?").get(topicId) as TopicQueueEntry | undefined;
  if (!topic) return;

  const oldPosition = topic.position;
  if (oldPosition === newPosition) return;

  if (newPosition < oldPosition) {
    db.prepare("UPDATE topic_queue SET position = position + 1 WHERE position >= ? AND position < ?").run(newPosition, oldPosition);
  } else {
    db.prepare("UPDATE topic_queue SET position = position - 1 WHERE position > ? AND position <= ?").run(oldPosition, newPosition);
  }
  db.prepare("UPDATE topic_queue SET position = ? WHERE id = ?").run(newPosition, topicId);
}

export function forceTopic(topicId: number): void {
  db.prepare("UPDATE topic_queue SET forced_next = 0").run(); // clear any existing force
  db.prepare("UPDATE topic_queue SET forced_next = 1 WHERE id = ?").run(topicId);
}

export function clearForceFlags(): void {
  db.prepare("UPDATE topic_queue SET forced_next = 0").run();
}

export function markTopicUsed(topic: string, date: string): void {
  db.prepare(
    "UPDATE topic_queue SET last_used_on = ?, times_used = times_used + 1, forced_next = 0 WHERE topic = ?"
  ).run(date, topic);
}

// =============================================
// Topic History
// =============================================

export function logTopicUsage(topic: string, date: string, boardId: number): void {
  db.prepare("INSERT INTO topic_history (topic, used_on, board_id) VALUES (?, ?, ?)").run(topic, date, boardId);
}

export function getRecentTopicHistory(days = 20): TopicHistoryEntry[] {
  return db.prepare(
    "SELECT * FROM topic_history WHERE used_on >= date('now', '-' || ? || ' days') ORDER BY used_on DESC"
  ).all(days) as TopicHistoryEntry[];
}

// =============================================
// Stats (updated for new exercises+submissions model, 26-point max)
// =============================================

export function getActivityData(userId: number, days = 112): ActivityDay[] {
  const rows = db.prepare(`
    SELECT b.date,
      COALESCE(SUM(s.score), 0) as total_score,
      COUNT(s.id) as submitted_count
    FROM boards b
    LEFT JOIN exercises e ON e.board_id = b.id
    LEFT JOIN submissions s ON s.exercise_id = e.id AND s.user_id = ?
    WHERE b.date >= date('now', '-' || ? || ' days')
    GROUP BY b.date
    ORDER BY b.date ASC
  `).all(userId, days) as Array<{ date: string; total_score: number; submitted_count: number }>;

  return rows.map((r) => ({
    date: r.date,
    score: r.submitted_count > 0 ? r.total_score : null,
    submitted: r.submitted_count > 0,
  }));
}

export function getCurrentStreak(userId: number): number {
  const rows = db.prepare(`
    SELECT DISTINCT b.date FROM boards b
    JOIN exercises e ON e.board_id = b.id
    JOIN submissions s ON s.exercise_id = e.id AND s.user_id = ?
    WHERE s.score IS NOT NULL
    ORDER BY b.date DESC
  `).all(userId) as Array<{ date: string }>;

  if (rows.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (rows[i].date === expectedStr) streak++;
    else break;
  }
  return streak;
}

export function getLongestStreak(userId: number): number {
  const rows = db.prepare(`
    SELECT DISTINCT b.date FROM boards b
    JOIN exercises e ON e.board_id = b.id
    JOIN submissions s ON s.exercise_id = e.id AND s.user_id = ?
    WHERE s.score IS NOT NULL
    ORDER BY b.date ASC
  `).all(userId) as Array<{ date: string }>;

  if (rows.length === 0) return 0;
  let longest = 1, current = 1;
  for (let i = 1; i < rows.length; i++) {
    const diff = (new Date(rows[i].date).getTime() - new Date(rows[i - 1].date).getTime()) / 86400000;
    if (diff === 1) { current++; longest = Math.max(longest, current); }
    else current = 1;
  }
  return longest;
}

export function getTotalSubmissions(userId: number): number {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM submissions WHERE user_id = ? AND score IS NOT NULL"
  ).get(userId) as { count: number };
  return row.count;
}

export function getTotalBoardsCompleted(userId: number): number {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT b.id) as count FROM boards b
    JOIN exercises e ON e.board_id = b.id
    JOIN submissions s ON s.exercise_id = e.id AND s.user_id = ?
    WHERE s.score IS NOT NULL
  `).get(userId) as { count: number };
  return row.count;
}

export function getTodaysBoardWithStatus(userId: number): BoardWithStatus | null {
  const board = getTodaysBoard();
  if (!board) return null;
  return getBoardWithStatus(board, userId);
}

export function getBoardWithStatus(board: Board, userId: number): BoardWithStatus {
  const exercises = getExercisesByBoardId(board.id);
  const submissions = getSubmissionsByUserAndBoard(userId, board.id);
  const submissionMap = new Map(submissions.map((s) => [s.exercise_id, s]));

  const exercisesWithStatus: ExerciseWithStatus[] = exercises.map((e) => {
    const sub = submissionMap.get(e.id);
    return {
      ...e,
      completed: sub?.score != null,
      user_score: sub?.score ?? null,
    };
  });

  const totalScore = exercisesWithStatus.reduce((sum, e) => sum + (e.user_score ?? 0), 0);
  const maxScore = exercisesWithStatus.reduce((sum, e) => sum + e.max_score, 0);
  const completedCount = exercisesWithStatus.filter((e) => e.completed).length;

  return { board, exercises: exercisesWithStatus, totalScore, maxScore, completedCount };
}

export function getRecentBoardsWithStatus(userId: number, limit = 10): BoardWithStatus[] {
  const boards = getRecentBoards(limit);
  return boards.map((b) => getBoardWithStatus(b, userId));
}

// =============================================
// Settings
// =============================================

const DEFAULT_SETTINGS: Record<string, string> = {
  recipients: process.env.RECIPIENTS || "posemerani@gmail.com,npizarrocatalan@gmail.com",
  from_email: process.env.FROM_EMAIL || "ielts@example.com",
  cron_schedule: "0 7 * * *",
  cron_timezone: "UTC",
  base_url: process.env.BASE_URL || "https://ielts-daily.fly.dev",
  difficulty: "B2",
};

export function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

export function setSetting(key: string, value: string): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) result[row.key] = row.value;
  return result;
}

// =============================================
// Email Log
// =============================================

export function logEmail(boardId: number, recipients: string, status: string, error?: string, durationMs?: number): void {
  db.prepare(
    "INSERT INTO email_log (board_id, recipients, status, error, duration_ms) VALUES (?, ?, ?, ?, ?)"
  ).run(boardId, recipients, status, error || null, durationMs || null);
}

export function getRecentEmailLogs(limit = 30) {
  return db.prepare(`
    SELECT el.*, b.topic, b.date as board_date
    FROM email_log el
    LEFT JOIN boards b ON b.id = el.board_id
    ORDER BY el.id DESC LIMIT ?
  `).all(limit) as any[];
}

export function getEmailStats() {
  return db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error
    FROM email_log
  `).get() as { total: number; success: number; error: number };
}

// =============================================
// Admin Stats
// =============================================

export function getActiveUsersToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`
    SELECT COUNT(DISTINCT s.user_id) as count
    FROM submissions s
    JOIN exercises e ON e.id = s.exercise_id
    JOIN boards b ON b.id = e.board_id
    WHERE b.date = ? AND s.score IS NOT NULL
  `).get(today) as { count: number };
  return row.count;
}

export function getAvgCompletionToday(): { avg: number; total: number } {
  const today = new Date().toISOString().slice(0, 10);
  const board = getBoardByDate(today);
  if (!board) return { avg: 0, total: 0 };
  const users = getAllUsers();
  if (users.length === 0) return { avg: 0, total: 0 };

  const exerciseCount = (db.prepare(
    "SELECT COUNT(*) as count FROM exercises WHERE board_id = ?"
  ).get(board.id) as { count: number }).count;

  let totalCompleted = 0;
  for (const user of users) {
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM submissions s
      JOIN exercises e ON e.id = s.exercise_id
      WHERE s.user_id = ? AND e.board_id = ? AND s.score IS NOT NULL
    `).get(user.id, board.id) as { count: number };
    totalCompleted += row.count;
  }
  return { avg: totalCompleted / users.length, total: exerciseCount };
}

export function getAvgScoreToday(): number {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`
    SELECT AVG(user_total) as avg FROM (
      SELECT SUM(s.score) as user_total
      FROM submissions s
      JOIN exercises e ON e.id = s.exercise_id
      JOIN boards b ON b.id = e.board_id
      WHERE b.date = ? AND s.score IS NOT NULL
      GROUP BY s.user_id
    )
  `).get(today) as { avg: number | null };
  return row.avg ?? 0;
}

export function getActiveStreaksCount(): number {
  const users = getAllUsers();
  let count = 0;
  for (const user of users) {
    if (getCurrentStreak(user.id) >= 2) count++;
  }
  return count;
}

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  token: string;
  streak: number;
  lastActive: string | null;
  completedToday: number;
  totalToday: number;
  totalExercises: number;
}

export function getAdminUserRows(): AdminUserRow[] {
  const users = getAllUsers();
  const today = new Date().toISOString().slice(0, 10);
  const board = getBoardByDate(today);

  return users.map((u) => {
    const streak = getCurrentStreak(u.id);
    const totalExercises = getTotalSubmissions(u.id);

    const lastActiveRow = db.prepare(`
      SELECT MAX(b.date) as last_date FROM submissions s
      JOIN exercises e ON e.id = s.exercise_id
      JOIN boards b ON b.id = e.board_id
      WHERE s.user_id = ? AND s.score IS NOT NULL
    `).get(u.id) as { last_date: string | null };

    let completedToday = 0;
    let totalToday = 0;
    if (board) {
      const row = db.prepare(`
        SELECT COUNT(*) as count FROM submissions s
        JOIN exercises e ON e.id = s.exercise_id
        WHERE s.user_id = ? AND e.board_id = ? AND s.score IS NOT NULL
      `).get(u.id, board.id) as { count: number };
      completedToday = row.count;
      totalToday = (db.prepare(
        "SELECT COUNT(*) as count FROM exercises WHERE board_id = ?"
      ).get(board.id) as { count: number }).count;
    }

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      token: u.token,
      streak,
      lastActive: lastActiveRow.last_date,
      completedToday,
      totalToday,
      totalExercises,
    };
  });
}

export function getTopicHistoryEntries(limit = 30): TopicHistoryEntry[] {
  return db.prepare(
    "SELECT * FROM topic_history ORDER BY used_on DESC LIMIT ?"
  ).all(limit) as TopicHistoryEntry[];
}

export function hasEmailBeenSentForBoard(boardId: number): boolean {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM email_log WHERE board_id = ? AND (status = 'sent' OR status = 'success')"
  ).get(boardId) as { count: number };
  return row.count > 0;
}

// =============================================
// Deprecated — Transitional types and stubs.
// These keep dependent files compiling until they
// are rewritten in their respective tasks (P0-3, P1-3, P3-x).
// =============================================

export interface DailyPractice {
  id: number;
  date: string;
  type: string;
  slot: string;
  article_title: string | null;
  article_source: string | null;
  article_url: string | null;
  passage: string | null;
  questions: string | null;
  answer_key: string | null;
  writing_prompt: string | null;
  created_at: string;
}

export interface PracticeWithStatus extends DailyPractice {
  completed: boolean;
  score: string | null;
}

export function getTodaysPractices(): DailyPractice[] { return []; }
export function getTodaysPractice(): DailyPractice | undefined { return undefined; }
export function getTodaysPracticeBySlot(_slot: string): DailyPractice | undefined { return undefined; }
export function getPracticeById(_id: number): DailyPractice | undefined { return undefined; }
export function getPracticeByDate(_date: string): DailyPractice | undefined { return undefined; }
export function createDailyPractice(_data: Record<string, unknown>): DailyPractice {
  throw new Error("Deprecated: daily_practices table no longer exists");
}
export function deleteTodaysPractices(): void {}
export function deleteTodaysPractice(): void {}
export function getTodaysPracticesWithStatus(_userId: number): PracticeWithStatus[] { return []; }
export function getRecentPracticesWithStatus(_userId: number, _limit?: number): PracticeWithStatus[] { return []; }
export function getRecentSubmissions(_userId: number, _limit?: number): Array<Submission & { date: string; article_title: string }> { return []; }

export interface RecentSubmissionRow {
  date: string;
  exercise_type: ExerciseType;
  score: number | null;
  max_score: number;
}

export function getRecentSubmissionsWithType(userId: number, limit = 20): RecentSubmissionRow[] {
  return db.prepare(`
    SELECT b.date, e.type as exercise_type, s.score, e.max_score
    FROM submissions s
    JOIN exercises e ON e.id = s.exercise_id
    JOIN boards b ON b.id = e.board_id
    WHERE s.user_id = ? AND s.score IS NOT NULL
    ORDER BY s.submitted_at DESC
    LIMIT ?
  `).all(userId, limit) as RecentSubmissionRow[];
}

export default db;
