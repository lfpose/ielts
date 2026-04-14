# Implementation Plan — IELTS Daily

Generated: 2026-04-13 (v6) · Updated: 2026-04-14 (v7)
Status: v6 complete · v7: 0 of 8 tasks started

## Summary

v6 shipped all 10 tasks (writing animation, word search UX, reading highlighter, optional login, admin detail page, admin word search preview, hangman, number-to-words). v7 fixes critical bugs found after v6 shipped and adds two features (OpenRouter, Pretext animations). Spec: `specs/improvements-v7.md`.

---

## V7 Task Queue

### [V7-1] Toast Notification System (all exercises)
- **Status**: NOT STARTED
- **Description**: Implement a lightweight Sonner-inspired toast system used by every exercise template. Single `showToast(msg, type)` function (~30 lines vanilla JS + CSS), injected as an inline `<script>` block shared across all exercise template HTML strings. Types: `success` (green), `error` (red), `info` (neutral). Auto-dismiss after 4s, closeable. Replace all silent `.catch` handlers with `showToast('Error al enviar — intenta de nuevo', 'error')`. Show success toast briefly before reload.
- **Acceptance Criteria**:
  - [ ] `showToast(message, type)` renders a fixed-position toast (bottom-right or top-center)
  - [ ] success: green, error: red, info: slate
  - [ ] Auto-dismisses after 4s; click to dismiss early
  - [ ] All exercise templates: catch handler shows error toast instead of silent reset
  - [ ] All exercise templates: show brief success toast before `window.location.reload()`
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-short-reading.ts`, `src/templates/exercise-long-reading.ts`, `src/templates/exercise-vocabulary.ts`, `src/templates/exercise-fill-gap.ts`, `src/templates/exercise-word-search.ts`, `src/templates/exercise-hangman.ts`, `src/templates/exercise-number-words.ts`, `src/templates/exercise-writing.ts`, `src/templates/exercise-mini-writing.ts`
- **Dependencies**: None
- **Validation**: Submit an exercise → see green toast. Simulate error (disconnect network) → see red toast.

---

### [V7-2] Word Search — "Terminar" Button for Partial Completion
- **Status**: NOT STARTED
- **Description**: Add a "Terminar ejercicio" button to `exercise-word-search.ts` that lets users submit even if not all words are found. Button is visible once the exercise loads (or after first word found). Score is prorated: `floor((foundCount / totalCount) × maxScore)`. The existing auto-submit on all-found stays. Button shows word count progress: "Terminar (2/4 encontradas)".
- **Acceptance Criteria**:
  - [ ] "Terminar ejercicio (N/4 encontradas)" button visible on interactive word search
  - [ ] Clicking it submits `{ found_words: [...currently found...] }` to the server
  - [ ] Shows confirmation dialog: "¿Terminar con N/4 palabras encontradas?"
  - [ ] Score prorated: `floor((found/total) * max_score)` — handled in `gradeWordSearch` or in student route
  - [ ] Button updates count as words are found
  - [ ] After all words found, auto-submit still fires (existing behavior preserved)
  - [ ] Success toast shown, then reload to feedback view
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-word-search.ts`
- **Dependencies**: V7-1 (toasts)
- **Validation**: Load word search, find 2/4 words, click Terminar → submit succeeds → feedback shows 2/4 found.

---

### [V7-3] Hangman — Fix Completion on Loss + Clear Feedback View
- **Status**: NOT STARTED
- **Description**: Fix two related hangman issues. (1) `endGame()` reloads unconditionally — if the fetch fails, the user is silently reset to interactive mode. Fix: only reload on successful server response; on error show toast + retry button. (2) The feedback (read-only) view looks too similar to interactive mode. Make the result banner clearly dominant: large "¡Ganaste!" (green) or "Perdiste" (red) heading, the full word shown prominently, definition, and a back button.
- **Acceptance Criteria**:
  - [ ] `endGame()` only calls `window.location.reload()` after confirmed server success (`d.ok !== false`)
  - [ ] On fetch error: show error toast, show "Reintentar" button, do NOT reload
  - [ ] Feedback view has a large result banner (win green / lose red) dominating the page
  - [ ] Word shown in 48px+, colored by result
  - [ ] Definition shown below
  - [ ] Score badge: "1/1" or "0/1"
  - [ ] Back to dashboard link prominent
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-hangman.ts`
- **Dependencies**: V7-1 (toasts)
- **Validation**: Play hangman, lose → page shows clear "Perdiste" result (not interactive mode).

---

### [V7-4] OpenRouter Integration for AI Grading
- **Status**: NOT STARTED
- **Description**: Add OpenRouter as an alternative AI backend for grading calls (writing, number-to-words). Content generation stays on Anthropic. Create `src/services/openrouter.ts` with a `callOpenRouter(messages, model?)` function using fetch against `https://openrouter.ai/api/v1/chat/completions`. Grading services (`gradeWritingMicro`, `gradeMiniWriting`, `gradeNumberWords`) switch to OpenRouter when `OPENROUTER_API_KEY` env is set. Falls back to Anthropic if unset.
- **Acceptance Criteria**:
  - [ ] `src/services/openrouter.ts` created with `callOpenRouter(messages, model?, systemPrompt?)` function
  - [ ] `OPENROUTER_API_KEY` env var controls whether OpenRouter is used
  - [ ] `OPENROUTER_GRADING_MODEL` env var sets model (default: `google/gemini-flash-1.5`)
  - [ ] `gradeWritingMicro`, `gradeMiniWriting`, `gradeNumberWords` use OpenRouter when available
  - [ ] Content generation (`generateBoard` and helpers) always uses Anthropic
  - [ ] When `OPENROUTER_API_KEY` unset, behavior is identical to before (no regression)
  - [ ] Add `OPENROUTER_API_KEY` and `OPENROUTER_GRADING_MODEL` to Fly.io secrets documentation in README or CLAUDE.md
  - [ ] `npm run build` passes
- **Files**: `src/services/openrouter.ts` (new), `src/services/grading.ts`
- **Dependencies**: None
- **Validation**: Set `OPENROUTER_API_KEY`, submit a writing exercise → graded by OpenRouter model. Unset key → falls back to Claude.

---

### [V7-5] Pretext Text Animations
- **Status**: NOT STARTED
- **Description**: Inline the pretext library (https://github.com/chenglou/pretext) into key student-facing templates. Use it for: (1) dashboard topic title scramble-reveal on page load, (2) exercise page main heading on load, (3) feedback score reveal after submission. Inline the minified source (~2KB) into a `<script>` block. Apply to no more than 2 elements per page.
- **Acceptance Criteria**:
  - [ ] Pretext library inlined (not fetched from CDN) in dashboard.ts and exercise templates
  - [ ] Dashboard: topic title does a scramble-reveal animation on load (duration ~600ms)
  - [ ] Exercise pages: main `<h1>` heading animates on load
  - [ ] Feedback: score/result line animates when feedback section appears
  - [ ] No layout shift or FOUC
  - [ ] Graceful degradation if JS fails (text still readable)
  - [ ] `npm run build` passes
- **Files**: `src/templates/dashboard.ts`, `src/templates/exercise-long-reading.ts`, `src/templates/exercise-short-reading.ts`, `src/templates/exercise-hangman.ts`
- **Dependencies**: None
- **Validation**: Load dashboard → topic title scrambles in. Load exercise → heading animates. Submit → score animates.

---

### [V7-6] Improved Image Dithering
- **Status**: NOT STARTED
- **Description**: Replace the current CSS dot-grid dithering overlay on the board illustration with a stronger retro-newspaper halftone effect. Approach: (1) add a repeating SVG Bayer 4×4 dither pattern overlay, (2) apply SVG `feTurbulence` noise filter to the image element for ordered noise, (3) increase contrast and reduce the image to a near-2-bit look. The illustration should read as a deliberate design choice, not a filter accident. Keep responsive, keep lazy load.
- **Acceptance Criteria**:
  - [ ] Image has a clear halftone/dither visual — looks intentional, not accidental
  - [ ] Bayer 4×4 ordered dither pattern overlay (SVG data URI, repeating)
  - [ ] Image uses `filter: grayscale(1) contrast(2.5) brightness(0.85)` (or tuned values)
  - [ ] The overlay blends with `mix-blend-mode: multiply` in light mode, `screen` in dark mode
  - [ ] Image still loads correctly if illustration is null/missing (no broken layout)
  - [ ] `npm run build` passes
- **Files**: `src/templates/dashboard.ts`
- **Dependencies**: None
- **Validation**: Load dashboard with a board → illustration has strong visible halftone pattern.

---

### [V7-7] Clickable Exercise Card Sections
- **Status**: NOT STARTED
- **Description**: In the student dashboard, clicking anywhere on an exercise card (long reading, short reading, vocabulary, etc.) should navigate to that exercise. Currently only the small "Comenzar →" text link is clickable. Implementation: add `onclick="window.location.href='{url}'"` and `cursor:pointer` to the outer card container, using `event.stopPropagation()` on the inner CTA link to avoid double-navigation.
- **Acceptance Criteria**:
  - [ ] Clicking anywhere on a long reading card navigates to the exercise
  - [ ] Same for short reading, vocabulary, fill-gap, word-search, mini-writing, writing, hangman, number-words
  - [ ] CTA link still works independently (click on link = navigate, same destination)
  - [ ] Cards with `completed` state are also fully clickable (go to feedback view)
  - [ ] `cursor: pointer` on the card container
  - [ ] No nested `<a>` inside `<a>` (use JS onclick on the container div, not wrapping with `<a>`)
  - [ ] `npm run build` passes
- **Files**: `src/templates/dashboard.ts`
- **Dependencies**: None
- **Validation**: Load dashboard → click anywhere on a card → navigate to exercise.

---

## V7 Dependency Graph

```
V7-1 (Toasts)             — independent, builds first
├── V7-2 (Word search end) — needs V7-1
└── V7-3 (Hangman fix)    — needs V7-1
V7-4 (OpenRouter)         — independent
V7-5 (Pretext)            — independent
V7-6 (Dithering)          — independent
V7-7 (Clickable cards)    — independent
```

## V7 Build Order

**Batch 1** (V7-1 first, then V7-2 + V7-3 in parallel after):
- V7-1 alone → then V7-2 + V7-3 together

**Batch 2** (all independent):
- V7-4, V7-5, V7-6, V7-7 in parallel

---

## V6 Task Queue (archived — all complete)



## Task Queue

### [V6-1] Writing Exercise — AI Thinking Animation
- **Status**: NOT STARTED
- **Description**: Add a braille spinner + cycling Spanish messages while AI grades writing exercises. When submit is clicked: button → "Evaluando..." (disabled), show animation div below with spinner frame cycling every 80ms and message cycling every 1500ms. Hide animation and show feedback when response arrives. Apply to exercise-writing.ts (Exercise 5), exercise-mini-writing.ts (Exercise 6), and exercise-number-words.ts (Exercise 8, built later).
- **Acceptance Criteria**:
  - [ ] Submit button shows "Evaluando..." and disables on click
  - [ ] Spinner animation appears with cycling braille chars (⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏) every 80ms
  - [ ] Message cycles every 1500ms: "Leyendo tu respuesta..." → "Analizando gramática..." → "Evaluando vocabulario..." → "Preparando feedback..."
  - [ ] Animation hidden when feedback section is shown
  - [ ] Works in both exercise-writing.ts and exercise-mini-writing.ts
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-writing.ts`, `src/templates/exercise-mini-writing.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Submit a writing response → see spinner while waiting.

---

### [V6-2] Word Search — Fix Hint UX (Hide Target Words)
- **Status**: NOT STARTED
- **Description**: Currently the word search shows the target words explicitly (e.g. "DREAM"), letting users skip reading definitions. Fix: hide the word, show only definition + example with the word blanked out + letter count. User must deduce the word from context before searching. Also update `generateWordSearch()` in content.ts to blank the target word in the example sentence. After finding a word in the grid, its card reveals the word in green.
- **Acceptance Criteria**:
  - [ ] "PALABRAS A BUSCAR" section no longer shows the actual words
  - [ ] Each word card shows: definition, example with word replaced by `_____`, letter count hint `(_ _ _ _ _)`
  - [ ] After finding a word: card reveals the word in green, turns green background
  - [ ] Pista button still works (highlights one letter in grid)
  - [ ] `generateWordSearch()` produces example sentences with the target word blanked as `_____`
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-word-search.ts`, `src/services/content.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Play word search → only see definitions, not words. Find a word → card reveals it.

---

### [V6-3] Reading Highlighter
- **Status**: NOT STARTED
- **Description**: Add a text highlighting toolbar to reading exercise passages. When user selects text in the passage, a small floating toolbar appears with 3 color buttons (yellow #FEF3C7, green #D1FAE5, pink #FCE7F3). Clicking a color wraps the selection in a `<span>` with that background. Clicking an existing highlight removes it. In-memory only — no persistence. Only works on passage text, not on questions.
- **Acceptance Criteria**:
  - [ ] Selecting text in the passage shows a floating toolbar (3 color circles)
  - [ ] Clicking a color applies a `<span style="background:COLOR">` highlight
  - [ ] Clicking an already-highlighted span removes the highlight
  - [ ] Toolbar disappears on click outside
  - [ ] Toolbar positioned 8px above the selection
  - [ ] Does NOT appear when selecting text in the questions section
  - [ ] Works in both long reading and short reading templates
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-long-reading.ts`, `src/templates/exercise-short-reading.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Select passage text → toolbar appears → highlight applied.

---

### [V6-4] Optional Login — Guest Access & Email Prompt Modal
- **Status**: NOT STARTED
- **Description**: Make the app usable without an account. Landing page: replace email-required flow with a "Comenzar →" primary button that creates a guest user (is_guest=1, email=null) and redirects to their dashboard. Keep the email input as secondary for returning users. After a guest completes their FIRST exercise, show a dismissible modal encouraging them to save their email. If they do, update the same user record (preserving all progress). Add email unsubscribe flow. Add soft nudge on dashboard for guests with ≥3 exercises who haven't dismissed permanently.
- **Acceptance Criteria**:
  - [ ] `users` table has `is_guest INTEGER DEFAULT 0` and `email_unsubscribed INTEGER DEFAULT 0` columns (migration handled at DB init)
  - [ ] `GET /` with no cookie → "Comenzar →" button → creates guest user, sets session cookie, redirects to `/s/:token`
  - [ ] `GET /` with existing cookie → redirect to `/s/:token` (unchanged)
  - [ ] Email input on landing still works for returning users (looks up by email, sets cookie)
  - [ ] After first exercise submission: response JSON includes `showEmailPrompt: true` if `is_guest && total_submissions === 1`
  - [ ] Modal appears after first exercise with: explanation text, email input, "Guardar progreso" + "Ahora no" buttons
  - [ ] "Ahora no" closes modal, sets `localStorage.setItem('email_prompt_dismissed', '1')`
  - [ ] "Guardar progreso" → `POST /s/:token/register` with email → updates user in-place, `is_guest=0`
  - [ ] Guest with ≥3 submissions and no permanent dismissal sees soft nudge on dashboard
  - [ ] `GET /unsubscribe?token=:token` sets `email_unsubscribed=1`, shows confirmation page
  - [ ] All outgoing emails include unsubscribe link: `baseUrl/unsubscribe?token=userToken`
  - [ ] Unsubscribed users skipped in `runDailyJob()` email loop
  - [ ] `npm run build` passes
- **Files**: `src/db.ts`, `src/routes/auth.ts`, `src/routes/student.ts`, `src/templates/landing.ts`, `src/templates/dashboard.ts`, `src/templates/email.ts`, `src/services/email.ts`, `src/index.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Visit `/` → click Comenzar → reach dashboard as guest. Complete exercise → see email modal. Submit email → progress preserved, `is_guest=0`.

---

### [V6-5] Admin — User Detail Page
- **Status**: NOT STARTED
- **Description**: Add `GET /admin/users/:id/detail` route returning a full HTML admin page with user detail. Show: header (name, email, streak, totals), recent 20 submissions table (date, type, score, collapsible feedback), 16-week activity heatmap, word bank preview (first 20 words). Make user rows in the admin table clickable. Add "Ver detalle →" to user actions dropdown.
- **Acceptance Criteria**:
  - [ ] `GET /admin/users/:id/detail` returns HTML (auth-protected)
  - [ ] Shows name, email, current streak, longest streak, last active, total exercises, total boards, word bank size
  - [ ] Recent submissions table: date, exercise type label, score/max, collapsible raw feedback
  - [ ] 16-week activity heatmap (reuse same heatmap logic from stats template)
  - [ ] Word bank: first 20 words with difficulty badge
  - [ ] User rows in admin table are clickable (navigate to detail page)
  - [ ] "Ver detalle →" link in user actions dropdown
  - [ ] Back link to `/admin` on detail page
  - [ ] `npm run build` passes
- **Files**: `src/routes/admin.ts`, `src/templates/admin.ts` (new `renderUserDetail()` function)
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Click user in admin table → see detail page with all sections.

---

### [V6-6] Admin — Word Search Grid Preview
- **Status**: NOT STARTED
- **Description**: In `renderExercisePreview()` in `src/templates/admin.ts`, add a case for `word_search` that renders a compact 10×10 grid HTML table with highlighted word cells and lists the 4 target words below.
- **Acceptance Criteria**:
  - [ ] Word search exercise preview renders the actual grid (not generic text)
  - [ ] Target word cells highlighted with soft accent colors
  - [ ] 4 words listed below the grid
  - [ ] Grid is compact (cells ~18px, monospace 10px font)
  - [ ] `npm run build` passes
- **Files**: `src/templates/admin.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Today's edition in admin shows word search grid preview.

---

### [V6-7] Content Pipeline — Hangman Generation & Grading
- **Status**: NOT STARTED
- **Description**: Add hangman content generation and grading. In `src/services/content.ts`, add `generateHangman(topic, difficulty)` returning `{ word, definition, example }` — word must be 5-10 letters, related to topic. In `src/services/grading.ts`, add `gradeHangman(content, answers)` — answers is `{ won: boolean }` (client sends whether they won). Score: 1 if won, 0 if lost. Add hangman to `generateBoard()` as slot 8. Max score: 1.
- **Acceptance Criteria**:
  - [ ] `generateHangman(topic, difficulty)` returns `{ word, definition, example }` with word 5-10 chars, no spaces
  - [ ] Word is added to slot 8 in `generateBoard()`
  - [ ] `gradeHangman(content, answers)` returns `{ score: 0|1, feedback: { won, word, definition } }`
  - [ ] `npm run build` passes
- **Files**: `src/services/content.ts`, `src/services/grading.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds.

---

### [V6-8] Exercise Template — Hangman
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-hangman.ts`. Display: word as underscores, definition below, ASCII hangman (6 stages in `<pre>`), 26 letter buttons A-Z. Vanilla JS: track guessed letters, wrong count, whether won. On win/lose: submit form automatically with `{ won: true/false }`. After submission: show feedback (word revealed, definition, score). Wire up in student routes for type `hangman`. Add hangman card to dashboard.
- **Acceptance Criteria**:
  - [ ] Word shown as `_ _ _ _ _` (one underscore per letter)
  - [ ] Definition shown below word display
  - [ ] ASCII hangman updates with each wrong guess (6 stages)
  - [ ] 26 letter buttons; correct → fill letter(s); wrong → button turns red
  - [ ] Win: auto-submit with `won: true`; Lose (6 wrong): auto-submit with `won: false`
  - [ ] Feedback: word revealed in green (win) or red (lose), score shown
  - [ ] Student routes handle `hangman` exercise type
  - [ ] Dashboard shows hangman card in "EN BREVE" section
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-hangman.ts`, `src/routes/student.ts`, `src/templates/dashboard.ts`
- **Dependencies**: V6-7 (Hangman generation & grading)
- **Validation**: `npm run build` succeeds. Play hangman exercise end-to-end.

---

### [V6-9] Content Pipeline — Number to Words Generation & Grading
- **Status**: NOT STARTED
- **Description**: Add number-to-words generation and grading. In `src/services/content.ts`, add `generateNumberWords(topic, difficulty)` returning `{ items: [{ display, answer, alternatives, type }] }` with 3 items. In `src/services/grading.ts`, add `gradeNumberWords(content, answers)` — AI-based grading (call Claude with all 3 answers, get back per-item `{ correct, correctAnswer, note }`). Add to `generateBoard()` as slot 9. Max score: 3.
- **Acceptance Criteria**:
  - [ ] `generateNumberWords()` returns 3 items with mixed types (integer, decimal, ordinal, percentage, year)
  - [ ] Numbers are contextually related to the day's topic where possible
  - [ ] `gradeNumberWords(content, answers)` calls Claude API, returns per-item results
  - [ ] AI accepts valid English variants (e.g. "eighty five" = "eighty-five")
  - [ ] Added to slot 9 in `generateBoard()`
  - [ ] `npm run build` passes
- **Files**: `src/services/content.ts`, `src/services/grading.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds.

---

### [V6-10] Exercise Template — Number to Words
- **Status**: NOT STARTED
- **Description**: Create `src/templates/exercise-number-words.ts`. Display 3 number cards stacked: big number (JetBrains Mono 48px, centered), label "Escríbelo en inglés:", text input (no autocorrect). Submit when all 3 filled. AI thinking animation while grading. Feedback: per-card ✓/✗ with correct answer and AI note. Wire up in student routes for type `number_words`. Add to dashboard "EN BREVE" section.
- **Acceptance Criteria**:
  - [ ] 3 number cards with big display, label, and text input
  - [ ] Inputs: `autocorrect="off" autocapitalize="off" spellcheck="false"`
  - [ ] Submit disabled until all 3 filled
  - [ ] AI thinking animation shown while grading (same spinner as exercise-writing.ts)
  - [ ] Feedback shows per-item ✓/✗, correct answer, optional note
  - [ ] Score displayed as "X/3"
  - [ ] Student routes handle `number_words` type
  - [ ] Dashboard shows number words card in "EN BREVE" section
  - [ ] `npm run build` passes
- **Files**: `src/templates/exercise-number-words.ts`, `src/routes/student.ts`, `src/templates/dashboard.ts`
- **Dependencies**: V6-9 (Number to words generation & grading)
- **Validation**: `npm run build` succeeds. Complete number-to-words exercise end-to-end.

---

## Dependency Graph

```
V6-1 (Writing animation)     — independent
V6-2 (Word search UX fix)    — independent
V6-3 (Reading highlighter)   — independent
V6-4 (Optional login)        — independent
V6-5 (Admin user detail)     — independent
V6-6 (Admin word search preview) — independent
V6-7 (Hangman generation)    — independent
└── V6-8 (Hangman template)  — needs V6-7
V6-9 (Number words generation) — independent
└── V6-10 (Number words template) — needs V6-9
```

## Recommended Build Order

**Batch 1** (quick wins, all independent):
- V6-1, V6-2, V6-3 in parallel

**Batch 2** (medium tasks, all independent):
- V6-4, V6-5, V6-6 in parallel

**Batch 3** (new exercises, sequential within each):
- V6-7 → V6-8 (hangman)
- V6-9 → V6-10 (number words)
