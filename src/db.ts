import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "fs";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "ielts.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sent_at TEXT NOT NULL DEFAULT (datetime('now')),
    article_title TEXT NOT NULL,
    article_source TEXT NOT NULL,
    article_url TEXT NOT NULL,
    recipients TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    duration_ms INTEGER,
    questions TEXT,
    answer_key TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS feedback_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_log_id INTEGER REFERENCES email_log(id),
    user_email TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    user_answers TEXT NOT NULL,
    score TEXT,
    feedback TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  );
`);

// --- Email Log ---

export interface EmailLog {
  id: number;
  sent_at: string;
  article_title: string;
  article_source: string;
  article_url: string;
  recipients: string;
  status: "pending" | "success" | "error";
  error: string | null;
  duration_ms: number | null;
  questions: string | null;
  answer_key: string | null;
}

export function logEmailStart(
  articleTitle: string,
  articleSource: string,
  articleUrl: string,
  recipients: string
): number {
  const stmt = db.prepare(
    `INSERT INTO email_log (article_title, article_source, article_url, recipients, status)
     VALUES (?, ?, ?, ?, 'pending')`
  );
  return stmt.run(articleTitle, articleSource, articleUrl, recipients).lastInsertRowid as number;
}

export function logEmailSuccess(
  id: number,
  durationMs: number,
  questions: string,
  answerKey: string
): void {
  db.prepare(
    `UPDATE email_log SET status = 'success', duration_ms = ?, questions = ?, answer_key = ? WHERE id = ?`
  ).run(durationMs, questions, answerKey, id);
}

export function logEmailError(id: number, error: string, durationMs: number): void {
  db.prepare(
    `UPDATE email_log SET status = 'error', error = ?, duration_ms = ? WHERE id = ?`
  ).run(error, durationMs, id);
}

export function getRecentLogs(limit = 50): EmailLog[] {
  return db.prepare(`SELECT * FROM email_log ORDER BY id DESC LIMIT ?`).all(limit) as EmailLog[];
}

export function getLatestEmailForRecipient(recipientEmail: string): EmailLog | undefined {
  return db.prepare(
    `SELECT * FROM email_log WHERE status = 'success' AND recipients LIKE ? ORDER BY id DESC LIMIT 1`
  ).get(`%${recipientEmail}%`) as EmailLog | undefined;
}

export function getStats() {
  const row = db.prepare(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM email_log`
  ).get() as any;
  return row;
}

// --- Settings ---

const DEFAULT_SETTINGS: Record<string, string> = {
  recipients: process.env.RECIPIENTS || "posemerani@gmail.com,npizarrocatalan@gmail.com",
  from_email: process.env.FROM_EMAIL || "ielts@example.com",
  cron_schedule: "0 7 * * *",
  cron_timezone: "UTC",
};

export function getSetting(key: string): string {
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? DEFAULT_SETTINGS[key] ?? "";
}

export function setSetting(key: string, value: string): void {
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM settings`).all() as {
    key: string;
    value: string;
  }[];
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// --- Feedback Log ---

export interface FeedbackLog {
  id: number;
  email_log_id: number;
  user_email: string;
  received_at: string;
  user_answers: string;
  score: string | null;
  feedback: string | null;
  status: string;
}

export function logFeedbackStart(
  emailLogId: number,
  userEmail: string,
  userAnswers: string
): number {
  return db.prepare(
    `INSERT INTO feedback_log (email_log_id, user_email, user_answers, status) VALUES (?, ?, ?, 'pending')`
  ).run(emailLogId, userEmail, userAnswers).lastInsertRowid as number;
}

export function logFeedbackComplete(
  id: number,
  score: string,
  feedback: string
): void {
  db.prepare(
    `UPDATE feedback_log SET score = ?, feedback = ?, status = 'sent' WHERE id = ?`
  ).run(score, feedback, id);
}

export function getRecentFeedback(limit = 30): FeedbackLog[] {
  return db.prepare(
    `SELECT * FROM feedback_log ORDER BY id DESC LIMIT ?`
  ).all(limit) as FeedbackLog[];
}

export default db;
