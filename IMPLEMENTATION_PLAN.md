# Implementation Plan — IELTS Daily

Generated: 2026-04-02
Status: 4 of 18 tasks complete

## Summary

The current app has working infrastructure (Hono, SQLite, cron, email, Fly.io deploy) but uses an old exercise model: 3 slots (reading, writing, news) fed by RSS articles. The specs define a new model: daily boards with 5 AI-generated exercises sharing a common topic. This plan migrates from the old model to the new one. Per `specs/migration.md`, this is a drop-and-recreate migration — no data to preserve.

---

## Task Queue

### [P0-1] Database Schema Migration
- **Status**: DONE (2026-04-02)
- **Description**: Rewrite `src/db.ts` to drop the old `daily_practices` table and create the new schema: `boards`, `exercises`, `submissions` (with exercise_id FK), `word_bank`, `word_bank_seed`, `topic_queue`, `topic_history`. Keep `users`, `settings`, `email_log` tables (refactor email_log to use `board_id` instead of `practice_id`). Rewrite all query functions to match the new schema. Pre-populate `topic_queue` with the 20 topics from `specs/content-pipeline.md` at DB init.
- **Acceptance Criteria**:
  - [ ] Old `daily_practices` table is removed
  - [ ] All 9 tables from `specs/database.md` exist with correct schemas and indexes
  - [ ] `topic_queue` auto-populated with 20 topics at positions 1-20 on first run
  - [ ] Query functions exist for: boards (CRUD by date), exercises (CRUD by board_id), submissions (CRUD by user+exercise, with UNIQUE constraint), word_bank (add/get per user), topic_queue (pick next, reorder, force), topic_history (log usage)
  - [ ] `getActivityData`, `getCurrentStreak`, `getLongestStreak` updated to use new `exercises`+`submissions` tables with 21-point max scoring
  - [ ] `getTodaysBoardWithStatus(userId)` returns board + 5 exercises with completion status per exercise
  - [ ] `npm run build` passes with no type errors
- **Files**: `src/db.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Manually inspect that all table CREATE statements and query functions match `specs/database.md`.

---

### [P0-2] Word Bank Seed Data
- **Status**: DONE (2026-04-02)
- **Description**: Create `src/word-bank-seed.ts` exporting an array of ~1000 `{ word, difficulty }` objects. Difficulty categories: `basic` (~400 common everyday words), `intermediate` (~400 academic/formal words), `advanced` (~200 sophisticated words). Source from Oxford 3000 / Academic Word List frequency patterns. In `db.ts`, populate `word_bank_seed` table from this file on first run (if table is empty).
- **Acceptance Criteria**:
  - [ ] File exports array of 900-1100 `{ word: string, difficulty: 'basic' | 'intermediate' | 'advanced' }` objects
  - [ ] Reasonable word distribution: ~400 basic, ~400 intermediate, ~200 advanced
  - [ ] Words are real, useful English vocabulary (no duplicates, no nonsense)
  - [ ] `db.ts` inserts seed words into `word_bank_seed` table on init when table is empty
  - [ ] `npm run build` passes
- **Files**: `src/word-bank-seed.ts`, `src/db.ts` (add seed population)
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds. Check that the exported array has the correct shape and size.

---

### [P0-3] File Restructuring — Routes Directory
- **Status**: DONE (2026-04-02)
- **Description**: Create `src/routes/` directory. Move admin routes from `src/dashboard.ts` into `src/routes/admin.ts` (as a Hono sub-app). Create stub files `src/routes/student.ts` and `src/routes/auth.ts` with empty Hono apps that will be filled in later tasks. Update `src/index.ts` to import and mount route sub-apps: auth at `/`, student at `/s`, admin at `/admin`. Delete `src/dashboard.ts` after migration. Keep existing admin functionality working.
- **Acceptance Criteria**:
  - [ ] `src/routes/admin.ts` exists with admin routes (basic auth, dashboard, settings, trigger, refresh)
  - [ ] `src/routes/student.ts` exists as a Hono app (can be minimal placeholder routes initially)
  - [ ] `src/routes/auth.ts` exists as a Hono app (placeholder)
  - [ ] `src/index.ts` mounts all three route apps
  - [ ] `src/dashboard.ts` deleted
  - [ ] `npm run build` passes
- **Files**: `src/routes/admin.ts`, `src/routes/student.ts`, `src/routes/auth.ts`, `src/index.ts`, delete `src/dashboard.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P1-1] Content Generation Service
- **Status**: DONE (2026-04-02)
- **Description**: Create `src/services/content.ts` that generates all 5 exercises for a daily board using the Anthropic Claude API. Functions: `pickTopic()` (selects from topic_queue per rules in `specs/content-pipeline.md`), `generateBoard(topic, difficulty)` (orchestrates generation of all 5 exercises), and individual generators: `generateLongReading(topic, difficulty)`, `generateShortReading(topic, difficulty)`, `generateVocabulary(longReadingContent)`, `generateFillGap(topic, difficulty, userWordBank)`, `generateWritingMicro(topic)`. Each returns the exercise content JSON matching `specs/database.md` shapes. Delete `src/services/article.ts` (RSS pipeline). Rewrite `src/services/questions.ts` → replace with content.ts (or delete questions.ts entirely if all logic moves to content.ts).
- **Acceptance Criteria**:
  - [ ] `pickTopic()` respects: forced topics first, then top of queue, skip topics used in last 20 days
  - [ ] `generateLongReading` returns `{ title, passage, questions }` with 5 questions (mix of MC + T/F/NG), passage 500-700 words
  - [ ] `generateShortReading` returns `{ title, passage, questions }` with 2 questions, passage 150-250 words
  - [ ] `generateVocabulary` returns `{ words }` with 6 words extracted from long reading, each with definition + context
  - [ ] `generateFillGap` returns `{ paragraph, blanks, word_bank }` with 5 blanks + 7 words (5 correct, 2 distractors)
  - [ ] `generateWritingMicro` returns `{ prompt }` with a 2-3 sentence response prompt
  - [ ] All content JSON matches the shapes defined in `specs/database.md`
  - [ ] `src/services/article.ts` deleted
  - [ ] `src/services/questions.ts` deleted (or gutted and replaced)
  - [ ] `npm run build` passes
- **Files**: `src/services/content.ts`, delete `src/services/article.ts`, delete or replace `src/services/questions.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds. Review prompts for correctness against exercise specs.

---

### [P1-2] Grading Service
- **Status**: NOT STARTED
- **Description**: Create `src/services/grading.ts` with deterministic grading for exercises 1-4 and AI grading for exercise 5. Functions: `gradeLongReading(content, answers)` → compare user answers to correct answers in content JSON, return `{ score, feedback }` with per-question results. `gradeShortReading(content, answers)` → same pattern, 2 questions. `gradeVocabulary(content, answers)` → compare word-definition matches. `gradeFillGap(content, answers)` → compare blank fills to correct words. `gradeWritingMicro(content, answers)` → call Claude API to evaluate on clarity/grammar/vocabulary (3 dimensions, 0-1 each). All feedback JSON shapes must match `specs/database.md` submission feedback shapes.
- **Acceptance Criteria**:
  - [ ] `gradeLongReading` returns integer score (0-5) and feedback JSON with per-question `{ correct, user_answer, correct_answer, explanation }`
  - [ ] `gradeShortReading` returns integer score (0-2) and feedback JSON
  - [ ] `gradeVocabulary` returns integer score (0-6) and feedback JSON with per-word results
  - [ ] `gradeFillGap` returns integer score (0-5) and feedback JSON with per-blank results
  - [ ] `gradeWritingMicro` returns integer score (0-3) and feedback JSON with comment, clarity/grammar/vocabulary breakdowns, corrections
  - [ ] Deterministic graders (1-4) do NOT call any AI API
  - [ ] Writing grader calls Claude with Spanish-friendly, encouraging tone, respects student name
  - [ ] `npm run build` passes
- **Files**: `src/services/grading.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P1-3] Daily Job Refactor
- **Status**: NOT STARTED
- **Description**: Rewrite `runDailyJob()` in `src/index.ts` to use the new content pipeline. New flow: 1) Check if today's board exists → skip if yes. 2) Pick topic via `pickTopic()`. 3) Generate all 5 exercises via `generateBoard()`. 4) Save board + exercises to DB. 5) Log topic in `topic_history`. 6) Send daily email to all recipients with board topic and link. Retry generation up to 3 times on failure. Remove all references to old `daily_practices`, `fetchRandomArticle`, old question generation.
- **Acceptance Criteria**:
  - [ ] `runDailyJob()` creates a board with 5 exercises for today's date
  - [ ] Skips if board already exists for today
  - [ ] Uses `pickTopic()` for topic selection
  - [ ] Saves board, 5 exercises, and topic_history record to DB
  - [ ] Sends email with topic info and student links
  - [ ] Retries up to 3 times on generation failure
  - [ ] No references to old `daily_practices`, `article.ts`, or `questions.ts`
  - [ ] Cron schedule still works (7 AM UTC)
  - [ ] `RUN_NOW=true` dev mode still works
  - [ ] `npm run build` passes
- **Files**: `src/index.ts`
- **Dependencies**: P0-1 (Database Schema Migration), P1-1 (Content Generation Service), P1-2 (Grading Service)
- **Validation**: `npm run build` succeeds. Read index.ts and verify no old imports remain.

---

### [P2-1] Landing Page & Auth Routes
- **Status**: NOT STARTED
- **Description**: Create `src/templates/landing.ts` with a minimal landing page: logo ("The IELTS Daily"), an "Enter your email" form, and a submit button. Spanish UI text. Implement `src/routes/auth.ts` with: `GET /` (if `session_token` cookie valid → redirect to `/s/:token`, else render landing page), `POST /login` (look up user by email → set HTTP-only cookie `session_token` with 1-year expiry, SameSite=Lax → redirect to `/s/:token`; if not found → re-render with error "No encontramos tu cuenta"). Update student routes to set the `session_token` cookie on first visit via token URL.
- **Acceptance Criteria**:
  - [ ] `GET /` renders landing page when no cookie
  - [ ] `GET /` redirects to `/s/:token` when valid cookie present
  - [ ] `POST /login` with valid email sets cookie and redirects to dashboard
  - [ ] `POST /login` with unknown email shows error message in Spanish
  - [ ] Cookie: HTTP-only, SameSite=Lax, 1-year expiry
  - [ ] Landing page follows design spec: Playfair Display masthead, minimal, warm off-white
  - [ ] `npm run build` passes
- **Files**: `src/templates/landing.ts`, `src/routes/auth.ts`
- **Dependencies**: P0-1 (Database Schema Migration), P0-3 (File Restructuring)
- **Validation**: `npm run build` succeeds.

---

### [P3-1] Dashboard Template
- **Status**: NOT STARTED
- **Description**: Create `src/templates/dashboard.ts` rendering the daily board as a newspaper-style page. Shows: masthead ("The IELTS Daily"), date, streak display, daily progress bar (X/5 completados), 5 exercise cards in order (each showing type label, title/excerpt, status: "Disponible" or score badge), activity heatmap (16 weeks), archive section (last 10 boards with completion status like "3/5"). Each exercise card links to `/s/:token/exercise/:exerciseId`. Delete old `src/templates/newspaper.ts`. Follow design spec: Playfair Display headings, Lora body, Inter UI, warm off-white palette, dark mode support.
- **Acceptance Criteria**:
  - [ ] Shows 5 exercise cards with correct type labels: Lectura Larga, Lectura Corta, Vocabulario, Completar Espacios, Escritura
  - [ ] Each card shows status (available/completed with score) and links to exercise page
  - [ ] Progress bar shows X/5 completed exercises for today
  - [ ] Streak display with current and longest streak
  - [ ] 16-week activity heatmap with 21-point max scale
  - [ ] Archive section showing past boards with per-board completion (e.g., "3/5")
  - [ ] "No board yet" message when today's board doesn't exist
  - [ ] Responsive: single column on mobile
  - [ ] Dark mode toggle
  - [ ] `src/templates/newspaper.ts` deleted
  - [ ] `npm run build` passes
- **Files**: `src/templates/dashboard.ts`, delete `src/templates/newspaper.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-2] Exercise Template: Long Reading
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-long-reading.ts` rendering the Exercise 1 page. Layout: back link ("← Volver al tablero"), exercise type kicker, article title (Playfair Display), full passage (Lora, justified), divider, 5 numbered questions. Each question rendered by type: multiple choice → vertical radio pill buttons (A-D), T/F/NG → 3 horizontal pill buttons. Submit button (disabled until all answered). After submission: each question shows ✓/✗ with correct answer and explanation, score as "X/5". All interaction via vanilla JS (no framework). Follow `specs/exercise-1-long-reading.md` and `specs/design.md`.
- **Acceptance Criteria**:
  - [ ] Renders article with title and full passage
  - [ ] 5 questions with correct input types (radio pills for MC, horizontal buttons for T/F/NG)
  - [ ] Submit button disabled until all 5 questions answered
  - [ ] Form submits to `POST /s/:token/exercise/:id`
  - [ ] Feedback view: per-question correct/incorrect with explanation, green/red highlighting
  - [ ] Score displayed as "X/5"
  - [ ] Back link to dashboard
  - [ ] Responsive, follows design spec typography and colors
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-long-reading.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-3] Exercise Template: Short Reading
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-short-reading.ts` for Exercise 2. Same layout pattern as long reading but with a shorter passage (150-250 words) and 2 questions. Question types can include short answer (text input, 1-3 words) in addition to MC and T/F/NG. Follow `specs/exercise-2-short-reading.md`.
- **Acceptance Criteria**:
  - [ ] Renders passage and 2 questions
  - [ ] Supports MC (radio pills), T/F/NG (horizontal buttons), and short answer (text input)
  - [ ] Submit disabled until both questions answered
  - [ ] Feedback view with per-question results and score "X/2"
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-short-reading.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-4] Exercise Template: Vocabulary Match
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-vocabulary.ts` for Exercise 3. Two-column layout: 6 word cards (left) and 6 definition cards (right), shuffled. Tap-to-pair interaction: tap a word → highlight it → tap a definition → they connect with a shared color. 6 soft accent colors for pairs. Tap a connected pair to disconnect. Submit when all 6 pairs connected. After submit: correct matches green, incorrect red with correct definition + context sentence. Score "X/6". All vanilla JS. Follow `specs/exercise-3-vocabulary.md` and `specs/design.md`.
- **Acceptance Criteria**:
  - [ ] Renders 6 words and 6 shuffled definitions in two columns
  - [ ] Tap-to-pair JS interaction works (highlight → connect → undo)
  - [ ] 6 distinct colors for connected pairs
  - [ ] Submit disabled until all 6 pairs connected
  - [ ] Feedback: correct/incorrect per pair, context sentences shown for wrong matches
  - [ ] Score "X/6"
  - [ ] Responsive: stacked on mobile, side-by-side on desktop
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-vocabulary.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-5] Exercise Template: Fill the Gap
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-fill-gap.ts` for Exercise 4. Paragraph with 5 numbered blanks displayed as underlined empty slots. Below: 7 word chips in a flex-wrap row. Interaction: tap a blank → highlight → tap a word chip → word fills the blank, chip dims. Tap filled blank to return word to bank. Submit when all 5 blanks filled. After submit: correct fills green in paragraph, incorrect red with correct word + explanation. Score "X/5". Vanilla JS. Follow `specs/exercise-4-fill-gap.md` and `specs/design.md`.
- **Acceptance Criteria**:
  - [ ] Paragraph with 5 numbered blanks rendered as interactive slots
  - [ ] 7 word chips (5 correct + 2 distractors) displayed below
  - [ ] Tap-to-fill interaction works (select blank → select word → fill)
  - [ ] Tap filled blank to return word to bank
  - [ ] Submit disabled until all 5 blanks filled
  - [ ] Feedback: inline correct/incorrect with explanations
  - [ ] Score "X/5"
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-fill-gap.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-6] Exercise Template: Writing Micro
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-writing.ts` for Exercise 5. Prompt displayed in a highlighted box. Textarea below with live word counter ("X palabras"). Counter color: gray when under 15, green 15-100, orange >90. Submit enabled only when 15-100 words. After submit: feedback card with overall comment, grammar corrections as before→after pairs, vocabulary suggestion. Score "X/3". Follow `specs/exercise-5-writing-micro.md` and `specs/design.md`. Delete old `src/templates/practice.ts`.
- **Acceptance Criteria**:
  - [ ] Prompt displayed in styled box
  - [ ] Textarea with live word counter (vanilla JS)
  - [ ] Counter color changes based on word count thresholds
  - [ ] Submit disabled outside 15-100 word range
  - [ ] Feedback: comment, grammar corrections (original → corrected with reason), vocabulary note
  - [ ] Score "X/3"
  - [ ] Spanish feedback if user writes in Spanish: "Intenta responder en inglés :)"
  - [ ] `src/templates/practice.ts` deleted
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-writing.ts`, delete `src/templates/practice.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P3-7] Student Routes — Full Wiring
- **Status**: NOT STARTED
- **Description**: Implement `src/routes/student.ts` with all student-facing routes. `GET /s/:token` → validate token, set session cookie if not set, get today's board + exercises + user submissions, render dashboard. `GET /s/:token/exercise/:exerciseId` → validate token + exercise, render correct exercise template based on type, show existing submission if already completed. `POST /s/:token/exercise/:exerciseId` → validate, parse answers JSON, grade using grading service, save submission, add words to word_bank if vocabulary exercise, return JSON `{ score, maxScore, feedback }`. `GET /s/:token/stats` → render stats page. Handle edge cases: no board yet, invalid exercise ID, already submitted.
- **Acceptance Criteria**:
  - [ ] `GET /s/:token` renders dashboard with today's board status
  - [ ] `GET /s/:token/exercise/:id` renders correct template for each exercise type
  - [ ] `POST /s/:token/exercise/:id` grades and saves submission, returns JSON
  - [ ] Vocabulary submission adds all 6 words to user's word_bank
  - [ ] Already-submitted exercises show feedback (read-only)
  - [ ] Cookie set on first token URL visit
  - [ ] `GET /s/:token/stats` renders stats page
  - [ ] Returns 404 for invalid token or exercise ID
  - [ ] `npm run build` passes
- **Files**: `src/routes/student.ts`
- **Dependencies**: P0-1 (Database Schema Migration), P0-3 (File Restructuring), P1-2 (Grading Service), P3-1 (Dashboard Template), P3-2 through P3-6 (all exercise templates)
- **Validation**: `npm run build` succeeds.

---

### [P4-1] Email Template Update
- **Status**: NOT STARTED
- **Description**: Rewrite `src/templates/email.ts` to match `specs/email.md`. Simplified template: subject "Tu práctica de hoy está lista" (no article title variation). Body: greeting, "Tus 5 ejercicios de hoy están listos", topic, one CTA button "Comenzar →" linking to `/s/:token`. White background, max 480px, Playfair/Georgia greeting, red button (#CC0000). Update `src/services/email.ts` to use the new template (pass topic instead of article title). Update `sendInviteEmail` signature.
- **Acceptance Criteria**:
  - [ ] Subject line: "Tu práctica de hoy está lista" (fixed, no variation)
  - [ ] Body includes: greeting with name, topic, single CTA button
  - [ ] Template: white background, max 480px, red button
  - [ ] `sendInviteEmail` accepts topic instead of article title
  - [ ] `npm run build` passes
- **Files**: `src/templates/email.ts`, `src/services/email.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P4-2] Stats Page Rebuild
- **Status**: NOT STARTED
- **Description**: Rewrite `src/templates/stats.ts` for the new 5-exercise model. Stats to display: current streak, longest streak, total exercises completed, total boards completed. 16-week activity heatmap with daily score out of 21 (5+2+6+5+3). Recent score history showing last 20 exercises with date, type, and score. Add any missing DB query functions needed. Follow design spec typography and colors.
- **Acceptance Criteria**:
  - [ ] Streak display (current + longest)
  - [ ] Total exercises and total boards completed
  - [ ] 16-week heatmap with 21-point scale, 4 intensity levels
  - [ ] Recent history: last 20 exercises with date, exercise type label, and score
  - [ ] Responsive layout
  - [ ] Dark mode support
  - [ ] `npm run build` passes
- **Files**: `src/templates/stats.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P5-1] Admin Dashboard — Template & Today's Edition
- **Status**: NOT STARTED
- **Description**: Create `src/templates/admin.ts` with the full admin dashboard layout from `specs/admin.md`. Priority sections: (1) Today's Edition hero — shows topic, 5 exercise cards with expandable preview, status badge (Live/Draft), action buttons (Generate, Regenerate All, Regenerate with New Topic, Send Email). (2) Readership metrics (active users today, avg completion, avg score, active streaks). (3) Users table. (4) Email log. (5) Settings form. Clean Inter font, white background, no newspaper aesthetic. Desktop-first.
- **Acceptance Criteria**:
  - [ ] Today's Edition section with topic, 5 exercise previews (expandable), status badge
  - [ ] Action buttons: Generate (if no board), Regenerate All, Regenerate with New Topic, Send Email
  - [ ] Readership metrics row (4 cards)
  - [ ] Users table with name, email, streak, last active, completed today, actions
  - [ ] Email log table (last 30 entries)
  - [ ] Settings form (recipients, from_email, cron_schedule, base_url, difficulty)
  - [ ] Clean functional design (Inter font, white bg, subtle borders)
  - [ ] `npm run build` passes
- **Files**: `src/templates/admin.ts`
- **Dependencies**: P0-1 (Database Schema Migration)
- **Validation**: `npm run build` succeeds.

---

### [P5-2] Admin Routes — Full Implementation
- **Status**: NOT STARTED
- **Description**: Rewrite `src/routes/admin.ts` with all admin routes from `specs/routes.md` and `specs/admin.md`. Routes: `GET /admin` (render dashboard), `POST /admin/generate` (generate today's board with optional topic), `POST /admin/regenerate` (delete + regenerate, optional new topic), `POST /admin/exercise/:id/regenerate` (regenerate single exercise), `POST /admin/email` (send daily email), `POST /admin/settings`, `POST /admin/users/add`, `POST /admin/users/:id/remove`, `GET /admin/users/:id` (JSON detail), `POST /admin/topics/reorder`, `POST /admin/topics/add`, `POST /admin/topics/remove`, `POST /admin/topics/force`. API routes: `GET /api/board/today`, `GET /api/stats`, `GET /api/logs`, `GET /api/topics`.
- **Acceptance Criteria**:
  - [ ] All admin routes from specs implemented
  - [ ] Board generation with topic selection (forced, specified, or queue)
  - [ ] Per-exercise regeneration works
  - [ ] User add/remove works
  - [ ] Topic CRUD and force-next works
  - [ ] Settings save works
  - [ ] All API routes return correct JSON
  - [ ] HTTP Basic Auth on all admin routes
  - [ ] `npm run build` passes
- **Files**: `src/routes/admin.ts`
- **Dependencies**: P0-1 (Database Schema Migration), P0-3 (File Restructuring), P1-1 (Content Generation Service), P5-1 (Admin Dashboard Template)
- **Validation**: `npm run build` succeeds.

---

## Dependency Graph

```
P0-1 (DB Schema)
├── P0-2 (Word Bank Seed)
├── P0-3 (File Restructuring)
│   ├── P2-1 (Landing + Auth)
│   ├── P3-7 (Student Routes) ← also depends on P1-2, P3-1 through P3-6
│   └── P5-2 (Admin Routes) ← also depends on P1-1, P5-1
├── P1-1 (Content Generation)
│   └── P1-3 (Daily Job) ← also depends on P1-2
├── P1-2 (Grading Service)
├── P3-1 (Dashboard Template)
├── P3-2 (Long Reading Template)
├── P3-3 (Short Reading Template)
├── P3-4 (Vocabulary Template)
├── P3-5 (Fill Gap Template)
├── P3-6 (Writing Micro Template)
├── P4-1 (Email Template)
├── P4-2 (Stats Page)
└── P5-1 (Admin Template)
```

## Recommended Build Order

1. P0-1 → P0-2 → P0-3 (foundation)
2. P1-1, P1-2 in parallel (services)
3. P1-3 (daily job, needs P1-1 + P1-2)
4. P3-1, P3-2, P3-3, P3-4, P3-5, P3-6, P2-1, P4-1, P4-2, P5-1 (templates — all parallelizable)
5. P3-7 (student routes — needs all templates)
6. P5-2 (admin routes — needs admin template + content service)
