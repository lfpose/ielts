import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import { mkdirSync } from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "ielts.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// --- Migration ---
db.exec(`DROP TABLE IF EXISTS feedback_log`);
try { db.prepare("SELECT practice_id FROM email_log LIMIT 1").get(); } catch { db.exec("DROP TABLE IF EXISTS email_log"); }
// Add slot column to daily_practices if missing
try { db.prepare("SELECT slot FROM daily_practices LIMIT 1").get(); } catch {
  try { db.exec("ALTER TABLE daily_practices ADD COLUMN slot TEXT NOT NULL DEFAULT 'reading'"); } catch { /* table doesn't exist yet */ }
}
// Drop UNIQUE(date) by rebuilding table if needed (only on first run with new schema)
// We can't drop constraints in SQLite, so we allow INSERT OR IGNORE to handle dupes

// --- Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_practices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'reading',
    slot TEXT NOT NULL DEFAULT 'reading',
    article_title TEXT,
    article_source TEXT,
    article_url TEXT,
    passage TEXT,
    questions TEXT,
    answer_key TEXT,
    writing_prompt TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    practice_id INTEGER NOT NULL REFERENCES daily_practices(id),
    answers TEXT NOT NULL,
    score TEXT,
    feedback TEXT,
    submitted_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, practice_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    practice_id INTEGER REFERENCES daily_practices(id),
    recipients TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    duration_ms INTEGER
  );
`);

// --- Users ---

export interface User {
  id: number;
  email: string;
  name: string;
  token: string;
  created_at: string;
}

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

export function ensureUser(email: string, name: string): User {
  return getUserByEmail(email) || createUser(email, name);
}

// --- Daily Practices ---

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

export function getTodaysPractices(): DailyPractice[] {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare("SELECT * FROM daily_practices WHERE date = ? ORDER BY slot").all(today) as DailyPractice[];
}

export function getTodaysPracticeBySlot(slot: string): DailyPractice | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare("SELECT * FROM daily_practices WHERE date = ? AND slot = ?").get(today, slot) as DailyPractice | undefined;
}

export function getPracticeById(id: number): DailyPractice | undefined {
  return db.prepare("SELECT * FROM daily_practices WHERE id = ?").get(id) as DailyPractice | undefined;
}

export function getPracticeByDate(date: string): DailyPractice | undefined {
  return db.prepare("SELECT * FROM daily_practices WHERE date = ? AND slot = 'reading' LIMIT 1").get(date) as DailyPractice | undefined;
}

// Keep backwards compat
export function getTodaysPractice(): DailyPractice | undefined {
  return getTodaysPracticeBySlot("reading");
}

export function createDailyPractice(data: {
  date: string;
  type: string;
  slot: string;
  article_title?: string;
  article_source?: string;
  article_url?: string;
  passage?: string;
  questions?: string;
  answer_key?: string;
  writing_prompt?: string;
}): DailyPractice {
  const existing = db.prepare(
    "SELECT * FROM daily_practices WHERE date = ? AND slot = ?"
  ).get(data.date, data.slot) as DailyPractice | undefined;
  if (existing) return existing;

  const result = db.prepare(
    `INSERT INTO daily_practices (date, type, slot, article_title, article_source, article_url, passage, questions, answer_key, writing_prompt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.date, data.type, data.slot,
    data.article_title || null, data.article_source || null, data.article_url || null,
    data.passage || null, data.questions || null, data.answer_key || null,
    data.writing_prompt || null
  );
  return db.prepare("SELECT * FROM daily_practices WHERE id = ?").get(result.lastInsertRowid) as DailyPractice;
}

export function deleteTodaysPractices(): void {
  const today = new Date().toISOString().slice(0, 10);
  db.prepare("DELETE FROM submissions WHERE practice_id IN (SELECT id FROM daily_practices WHERE date = ?)").run(today);
  db.prepare("DELETE FROM daily_practices WHERE date = ?").run(today);
}

// Keep old name as alias
export function deleteTodaysPractice(): void {
  deleteTodaysPractices();
}

// --- Submissions ---

export interface Submission {
  id: number;
  user_id: number;
  practice_id: number;
  answers: string;
  score: string | null;
  feedback: string | null;
  submitted_at: string;
}

export function getSubmission(userId: number, practiceId: number): Submission | undefined {
  return db.prepare(
    "SELECT * FROM submissions WHERE user_id = ? AND practice_id = ?"
  ).get(userId, practiceId) as Submission | undefined;
}

export function createSubmission(userId: number, practiceId: number, answers: string): number {
  return db.prepare(
    "INSERT INTO submissions (user_id, practice_id, answers) VALUES (?, ?, ?)"
  ).run(userId, practiceId, answers).lastInsertRowid as number;
}

export function updateSubmissionFeedback(id: number, score: string, feedback: string): void {
  db.prepare("UPDATE submissions SET score = ?, feedback = ? WHERE id = ?").run(score, feedback, id);
}

// --- Stats ---

export interface ActivityDay {
  date: string;
  score: string | null;
  submitted: boolean;
}

export function getActivityData(userId: number, days = 182): ActivityDay[] {
  const rows = db.prepare(`
    SELECT dp.date, s.score, 1 as submitted
    FROM daily_practices dp
    LEFT JOIN submissions s ON s.practice_id = dp.id AND s.user_id = ?
    WHERE dp.date >= date('now', '-' || ? || ' days') AND dp.slot = 'reading'
    ORDER BY dp.date ASC
  `).all(userId, days) as Array<{ date: string; score: string | null; submitted: number }>;

  return rows.map((r) => ({
    date: r.date,
    score: r.score,
    submitted: r.submitted === 1 && r.score !== null,
  }));
}

export function getCurrentStreak(userId: number): number {
  const rows = db.prepare(`
    SELECT DISTINCT dp.date FROM daily_practices dp
    JOIN submissions s ON s.practice_id = dp.id AND s.user_id = ?
    WHERE s.score IS NOT NULL
    ORDER BY dp.date DESC
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
    SELECT DISTINCT dp.date FROM daily_practices dp
    JOIN submissions s ON s.practice_id = dp.id AND s.user_id = ?
    WHERE s.score IS NOT NULL
    ORDER BY dp.date ASC
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

export function getRecentSubmissions(userId: number, limit = 20): Array<Submission & { date: string; article_title: string }> {
  return db.prepare(`
    SELECT s.*, dp.date, dp.article_title
    FROM submissions s
    JOIN daily_practices dp ON dp.id = s.practice_id
    WHERE s.user_id = ? AND s.score IS NOT NULL
    ORDER BY s.submitted_at DESC LIMIT ?
  `).all(userId, limit) as any[];
}

// --- Newspaper queries ---

export interface PracticeWithStatus extends DailyPractice {
  completed: boolean;
  score: string | null;
}

export function getTodaysPracticesWithStatus(userId: number): PracticeWithStatus[] {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`
    SELECT dp.*,
      CASE WHEN s.score IS NOT NULL THEN 1 ELSE 0 END as completed,
      s.score
    FROM daily_practices dp
    LEFT JOIN submissions s ON s.practice_id = dp.id AND s.user_id = ?
    WHERE dp.date = ?
    ORDER BY dp.slot
  `).all(userId, today) as any[];
}

export function getRecentPracticesWithStatus(userId: number, limit = 10): PracticeWithStatus[] {
  return db.prepare(`
    SELECT dp.*,
      CASE WHEN s.score IS NOT NULL THEN 1 ELSE 0 END as completed,
      s.score
    FROM daily_practices dp
    LEFT JOIN submissions s ON s.practice_id = dp.id AND s.user_id = ?
    WHERE dp.slot = 'reading'
    ORDER BY dp.date DESC LIMIT ?
  `).all(userId, limit) as any[];
}

// --- Settings ---

const DEFAULT_SETTINGS: Record<string, string> = {
  recipients: process.env.RECIPIENTS || "posemerani@gmail.com,npizarrocatalan@gmail.com",
  from_email: process.env.FROM_EMAIL || "ielts@example.com",
  cron_schedule: "0 7 * * *",
  cron_timezone: "UTC",
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

// --- Email Log ---

export function logEmail(practiceId: number, recipients: string, status: string, error?: string, durationMs?: number): void {
  db.prepare(
    "INSERT INTO email_log (practice_id, recipients, status, error, duration_ms) VALUES (?, ?, ?, ?, ?)"
  ).run(practiceId, recipients, status, error || null, durationMs || null);
}

export function getRecentEmailLogs(limit = 30) {
  return db.prepare(`
    SELECT el.*, dp.article_title, dp.date as practice_date
    FROM email_log el
    LEFT JOIN daily_practices dp ON dp.id = el.practice_id
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

export default db;
