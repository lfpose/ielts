import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "ielts.db");

// Ensure data directory exists
import { mkdirSync } from "fs";
mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

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
    duration_ms INTEGER
  )
`);

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
  const result = stmt.run(articleTitle, articleSource, articleUrl, recipients);
  return result.lastInsertRowid as number;
}

export function logEmailSuccess(id: number, durationMs: number): void {
  db.prepare(`UPDATE email_log SET status = 'success', duration_ms = ? WHERE id = ?`).run(
    durationMs,
    id
  );
}

export function logEmailError(id: number, error: string, durationMs: number): void {
  db.prepare(`UPDATE email_log SET status = 'error', error = ?, duration_ms = ? WHERE id = ?`).run(
    error,
    durationMs,
    id
  );
}

export function getRecentLogs(limit = 50): EmailLog[] {
  return db.prepare(`SELECT * FROM email_log ORDER BY id DESC LIMIT ?`).all(limit) as EmailLog[];
}

export function getStats(): { total: number; success: number; error: number; pending: number } {
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM email_log`
    )
    .get() as any;
  return row;
}

export default db;
