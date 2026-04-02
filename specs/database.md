# Database Schema

SQLite with better-sqlite3. WAL mode enabled.

## Tables

### users
Registered users. Each has a unique token for URL-based auth.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,       -- UUID, used in URLs and cookies
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_token ON users(token);
CREATE INDEX idx_users_email ON users(email);
```

### boards
A daily set of 5 exercises tied to a topic. One board per day.

```sql
CREATE TABLE boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT UNIQUE NOT NULL,         -- YYYY-MM-DD
  topic TEXT NOT NULL,               -- e.g. "Dinosaurs and prehistoric life"
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_boards_date ON boards(date);
```

### exercises
Individual exercises belonging to a board. Each board has exactly 5.

```sql
CREATE TABLE exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id),
  slot INTEGER NOT NULL,             -- 1-5 (order on the board)
  type TEXT NOT NULL,                -- 'long_reading' | 'short_reading' | 'vocabulary' | 'fill_gap' | 'writing_micro'
  content JSON NOT NULL,             -- exercise-type-specific JSON (see below)
  max_score INTEGER NOT NULL,        -- 5, 2, 6, 5, or 3
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(board_id, slot)
);
CREATE INDEX idx_exercises_board ON exercises(board_id);
```

#### Exercise content JSON shapes

**long_reading** (slot 1, max_score 5):
```json
{
  "title": "The Age of Dinosaurs",
  "passage": "Full article text, 500-700 words...",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "What caused the extinction?",
      "options": ["A) Volcanic activity", "B) An asteroid", "C) Disease", "D) Climate change"],
      "correct": "B",
      "explanation": "The passage states an asteroid impact..."
    },
    {
      "number": 2,
      "type": "true_false_ng",
      "statement": "Dinosaurs lived on every continent.",
      "correct": "TRUE",
      "explanation": "Paragraph 3 mentions fossils found on all continents..."
    }
  ]
}
```

**short_reading** (slot 2, max_score 2):
```json
{
  "title": "Brief: Fossil Discovery in Patagonia",
  "passage": "Short passage, 150-250 words...",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "C",
      "explanation": "..."
    },
    {
      "number": 2,
      "type": "true_false_ng",
      "statement": "...",
      "correct": "FALSE",
      "explanation": "..."
    }
  ]
}
```

**vocabulary** (slot 3, max_score 6):
```json
{
  "words": [
    {
      "word": "ubiquitous",
      "definition": "Found everywhere; very common",
      "context": "Dinosaur fossils are ubiquitous across the globe..."
    }
  ]
}
```
Always exactly 6 words. Definitions on the page are shuffled — the correct pairing is word index to definition index.

**fill_gap** (slot 4, max_score 5):
```json
{
  "paragraph": "The scientist __(1)__ the results and found that the data __(2)__ the hypothesis...",
  "blanks": [
    { "number": 1, "correct": "analyzed" },
    { "number": 2, "correct": "supported" },
    { "number": 3, "correct": "significant" },
    { "number": 4, "correct": "concluded" },
    { "number": 5, "correct": "evidence" }
  ],
  "word_bank": ["analyzed", "supported", "significant", "concluded", "evidence", "reluctant", "abundant"]
}
```
7 words in bank (5 correct + 2 distractors). Word bank is shuffled on display.

**writing_micro** (slot 5, max_score 3):
```json
{
  "prompt": "The article discusses how dinosaurs adapted to different climates. In 2-3 sentences, describe how you think animals today are adapting to climate change."
}
```
No answer key — evaluated by AI at submission time.

### submissions
One submission per user per exercise. Stores answers and AI feedback.

```sql
CREATE TABLE submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  answers JSON NOT NULL,             -- user's answers (shape varies by exercise type)
  score INTEGER,                     -- 0 to max_score (null until graded)
  feedback JSON,                     -- AI-generated feedback (null until graded)
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, exercise_id)
);
CREATE INDEX idx_submissions_user ON submissions(user_id);
CREATE INDEX idx_submissions_exercise ON submissions(exercise_id);
```

#### Submission answers JSON shapes

**long_reading / short_reading:**
```json
{
  "answers": [
    { "number": 1, "answer": "B" },
    { "number": 2, "answer": "TRUE" }
  ]
}
```

**vocabulary:**
```json
{
  "matches": [
    { "word": "ubiquitous", "matched_definition": "Found everywhere; very common" }
  ]
}
```

**fill_gap:**
```json
{
  "fills": [
    { "number": 1, "word": "analyzed" },
    { "number": 2, "word": "supported" }
  ]
}
```

**writing_micro:**
```json
{
  "text": "I think animals today are adapting..."
}
```

#### Submission feedback JSON shapes

**long_reading / short_reading:**
```json
{
  "results": [
    { "number": 1, "correct": true, "user_answer": "B", "correct_answer": "B", "explanation": "..." },
    { "number": 2, "correct": false, "user_answer": "TRUE", "correct_answer": "FALSE", "explanation": "..." }
  ]
}
```
Score is computed from results (count of correct). No AI call needed — deterministic grading.

**vocabulary:**
```json
{
  "results": [
    { "word": "ubiquitous", "correct": true, "correct_definition": "Found everywhere; very common" }
  ]
}
```
Deterministic grading — compare matched definition to correct one.

**fill_gap:**
```json
{
  "results": [
    { "number": 1, "correct": true, "user_word": "analyzed", "correct_word": "analyzed" }
  ]
}
```
Deterministic grading.

**writing_micro:**
```json
{
  "comment": "Good effort! Your point about polar bears is clear and relevant.",
  "clarity": { "score": 1, "note": "Your meaning is clear." },
  "grammar": { "score": 0, "corrections": [
    { "original": "Animals is adapting", "corrected": "Animals are adapting", "reason": "Subject-verb agreement: plural subject needs 'are'." }
  ]},
  "vocabulary": { "score": 1, "note": "Good use of 'habitat' — try 'diminishing' instead of 'getting smaller'." }
}
```
AI-graded. Score = sum of 3 dimensions (0 or 1 each).

### word_bank
Per-user vocabulary from Exercise 3. Grows over time. Used by Exercise 4.

```sql
CREATE TABLE word_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  context TEXT,                       -- sentence where it appeared
  source_exercise_id INTEGER REFERENCES exercises(id),
  learned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, word)
);
CREATE INDEX idx_word_bank_user ON word_bank(user_id);
```

### word_bank_seed
The initial 1000 common English words. Pre-populated at DB init. Used as fallback when a user's personal word bank is too small for Exercise 4.

```sql
CREATE TABLE word_bank_seed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL,
  difficulty TEXT NOT NULL            -- 'basic' | 'intermediate' | 'advanced'
);
```

This table is populated once at startup from a hardcoded list. Exercise 4 pulls from: user's word_bank first, then word_bank_seed as fallback. See content-pipeline spec for details.

### topic_queue
The editorial calendar. Admin controls the order; system picks from the top.

```sql
CREATE TABLE topic_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT UNIQUE NOT NULL,
  position INTEGER NOT NULL,          -- sort order (lower = picked sooner)
  last_used_on TEXT,                  -- YYYY-MM-DD, null if never used
  times_used INTEGER DEFAULT 0,
  forced_next INTEGER DEFAULT 0       -- 1 = force this topic for next generation
);
CREATE INDEX idx_topic_queue_position ON topic_queue(position);
```

Pre-populated with the 20 topics from the content-pipeline spec at positions 1-20. Admin can reorder, add, remove, and force-pick.

### topic_history
Log of which topics were used and when.

```sql
CREATE TABLE topic_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  used_on TEXT NOT NULL,              -- YYYY-MM-DD
  board_id INTEGER REFERENCES boards(id)
);
CREATE INDEX idx_topic_history_date ON topic_history(used_on);
```

### email_log
Track email delivery. Carried over from existing app.

```sql
CREATE TABLE email_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sent_at TEXT DEFAULT (datetime('now')),
  board_id INTEGER REFERENCES boards(id),
  recipients TEXT NOT NULL,
  status TEXT NOT NULL,               -- 'success' | 'error'
  error TEXT,
  duration_ms INTEGER
);
```

### settings
Key-value config store. Carried over from existing app.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Default settings:
- `recipients` — comma-separated emails
- `from_email` — Resend sender address
- `cron_schedule` — e.g. `0 7 * * *`
- `base_url` — e.g. `https://ielts-daily.fly.dev`
- `difficulty` — B1 / B2 / C1 (default: B2)
