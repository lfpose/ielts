# IELTS Daily — Product Requirements Document

## Overview
Web app for daily IELTS reading practice. Students receive 5 AI-generated exercises daily sharing a common topic. Built for a Spanish-speaking student learning English.

## Tech Stack
- **Backend**: Hono + TypeScript, Node.js
- **Database**: SQLite (better-sqlite3)
- **AI**: @anthropic-ai/sdk
- **Email**: Resend
- **Hosting**: Fly.io

## Current State
9 of 18 original tasks complete. Foundation, services, and first two templates (dashboard, long reading) are done. This PRD covers all remaining work including design improvements from `specs/improvements-v2.md`.

## Spec files to read
- `specs/improvements-v2.md` — **primary reference for all design decisions**
- `specs/design.md` — color palette, typography, tokens
- `specs/exercise-*.md` — per-exercise content and UX rules
- `specs/daily-flow.md` — overall navigation and state model
- `specs/gamification.md` — streak, heatmap, progress bar rules

---

## Task List

```json
[
  {
    "category": "improvement",
    "description": "IMPROVE-1: Dashboard redesign. Refactor src/templates/dashboard.ts to implement the newspaper layout from specs/improvements-v2.md section 1. Two-column desktop grid (topic+illustration left, streak+heatmap right), separated by a column rule. Better exercise cards with type-specific left accent colors. Thicker progress bar (8px, pill segments). Streak widget with fire emoji and warm tint when streak > 7. Move heatmap to a standalone full-width section below cards with month labels and day labels.",
    "steps": [
      "Read specs/improvements-v2.md sections 1.1 through 1.6 carefully",
      "Read specs/design.md for color tokens and typography rules",
      "Read the current src/templates/dashboard.ts to understand existing structure",
      "Implement two-column desktop layout: topic+illustration left col, streak+heatmap right col, with column rule divider",
      "Improve topic headline: kicker 'TEMA DEL DÍA', Playfair Display 900 36px topic text, ASCII illustration in <pre> JetBrains Mono below",
      "Improve streak widget: large 🔥 emoji, JetBrains Mono 700 48px number, warm amber tint background when streak > 7",
      "Improve progress bar: 8px height, 5 pill segments with gaps, smooth color fill, 'X de 5 completados' label",
      "Improve exercise cards: left 4px solid accent border per type (navy/green/purple/amber/dark-red), type label in accent color, time estimate, completed state with green tint",
      "Move heatmap to standalone section below exercise cards: full width, 'ACTIVIDAD — ÚLTIMAS 16 SEMANAS' header, month labels above, day labels left",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "improvement",
    "description": "IMPROVE-2: Long Reading exercise improvements. Refactor src/templates/exercise-long-reading.ts to implement better question cards and interaction from specs/improvements-v2.md sections 2 and 3. Numbered question cards with left border, proper T/F/NG horizontal pill buttons ('Verdadero' / 'Falso' / 'No se menciona'), MC options with letter badges. Exercise header bar with 'Ejercicio 1 de 5' + time estimate. Smooth feedback reveal after submit.",
    "steps": [
      "Read specs/improvements-v2.md sections 2.1-2.5 and 3.1-3.5",
      "Read specs/exercise-1-long-reading.md",
      "Read current src/templates/exercise-long-reading.ts",
      "Add header bar: back link left, 'Ejercicio 1 de 5' center, '~8 min' right, bottom border",
      "Wrap each question in a card: border-left 3px var(--muted), question number in JetBrains Mono large muted, question text Inter 500 15px",
      "T/F/NG: three horizontal pill buttons side by side, 1.5px border, selected = var(--fg) dark bg white text, labels in Spanish",
      "MC options: vertical stack, letter badge (A/B/C/D) in small box left-aligned, selected = dark bg",
      "Submit button: clear disabled (muted, cursor not-allowed) vs enabled (var(--fg) dark, white text) states with smooth transition",
      "Feedback reveal: CSS slide-in animation 300ms, questions staggered 50ms, score counts up with JS animation",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P3-3: Exercise Template — Short Reading. Create src/templates/exercise-short-reading.ts for Exercise 2. Same structure as long reading template (with all IMPROVE-2 improvements applied). Shorter passage (150-250 words), 2 questions. Supports MC, T/F/NG, and short answer (text input). Header shows 'Ejercicio 2 de 5 · ~3 min'. Fix: ensure question text renders from content.questions[i].text field (not undefined).",
    "steps": [
      "Read specs/improvements-v2.md sections 2 and 3, specs/exercise-2-short-reading.md",
      "Read src/templates/exercise-long-reading.ts to copy improved patterns",
      "Create src/templates/exercise-short-reading.ts with identical structure/styles as long reading",
      "Adjust for 2 questions, shorter passage, header showing 'Ejercicio 2 de 5 · ~3 min'",
      "Support short answer: text input styled to match, placeholder 'Tu respuesta (1-3 palabras)'",
      "Ensure question text renders: read content JSON shape from db.ts Exercise interface, access correct field",
      "Apply all IMPROVE-2 styles: numbered cards, T/F/NG pills, MC badges, feedback animation",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P3-4: Exercise Template — Vocabulary Match (full game). Create src/templates/exercise-vocabulary.ts for Exercise 3. NOT a table — a proper tap-to-pair matching game. Two columns: 6 word cards left, 6 shuffled definition cards right. Tap word → highlight → tap definition → pair snaps together with shared soft color. 6 pair colors assigned dynamically. Tap connected pair to undo. Submit when all 6 paired. After submit: correct green, incorrect red with context sentence. Score X/6.",
    "steps": [
      "Read specs/improvements-v2.md section 4 (full vocabulary game design) and specs/exercise-3-vocabulary.md",
      "Read specs/design.md for color tokens",
      "Create src/templates/exercise-vocabulary.ts",
      "Layout: two-column grid (desktop) — words left col, definitions right col, gap between",
      "Word cards: var(--n100) background, Playfair Display 700 16px centered, 2px solid var(--muted) border, rounded 6px",
      "Definition cards: smaller, Inter 400 13px, same border/radius",
      "Shuffle definitions on render (Fisher-Yates in JS, seeded by exercise ID so consistent on refresh)",
      "Implement vanilla JS matching: tap word → selectedWord, tap definition → connect pair with shared color from 6-color palette",
      "Pair colors: 6 soft bg+border combinations as defined in improvements-v2.md section 4.4",
      "Connection animation: CSS transition 200ms + scale bounce (1.0 → 1.04 → 1.0)",
      "Undo: tap connected card → remove pairing, both return to default",
      "Submit enables when all 6 paired, shows feedback: correct green, incorrect red with context sentence",
      "Mobile: word chips in horizontal scroll row at top, definitions stacked below",
      "Header: 'Ejercicio 3 de 5 · ~3 min'",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P3-5: Exercise Template — Fill the Gap. Create src/templates/exercise-fill-gap.ts for Exercise 4. Paragraph with 5 interactive blank slots. Word bank below as pill chips. Tap blank → highlight → tap chip → fills blank inline, chip grays out. Tap filled blank to return word. All from specs/improvements-v2.md section 5.",
    "steps": [
      "Read specs/improvements-v2.md section 5 and specs/exercise-4-fill-gap.md",
      "Create src/templates/exercise-fill-gap.ts",
      "Paragraph: Lora 400 17px line-height 1.9, blanks as underlined spans with number",
      "Blank states: default (underlined, muted), selected (red underline + yellow bg tint), filled (word inline bold accent color)",
      "Word bank section: label 'BANCO DE PALABRAS' uppercase 10px muted, chips in flex-wrap below",
      "Chips: Inter 600 13px, 1.5px solid var(--fg) border, rounded pill, hover = dark bg white text",
      "Used chip: opacity 0.4, cursor not-allowed, not tappable",
      "Two tap models supported: (blank then chip) OR (chip then blank)",
      "Tap filled blank → word returns to bank, blank resets",
      "Submit button enables when all 5 blanks filled",
      "Feedback: correct blanks green in paragraph, incorrect red with correct word + explanation, score X/5",
      "Header: 'Ejercicio 4 de 5 · ~3 min'",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P3-6: Exercise Template — Writing Micro. Create src/templates/exercise-writing.ts for Exercise 5. Prompt in left-bordered box (Lora italic). Textarea with live word counter. Counter colors: gray <15, green 15-90, orange 91-100, red >100. Submit enabled 15-100 words only. Feedback: 3 expandable cards (Claridad / Gramática / Vocabulario) each showing score 0 or 1. Delete src/templates/practice.ts.",
    "steps": [
      "Read specs/improvements-v2.md section 6 and specs/exercise-5-writing-micro.md",
      "Create src/templates/exercise-writing.ts",
      "Prompt box: 4px left red border, label 'CONSIGNA' Inter 600 uppercase 10px letter-spacing 3px above, Lora 400 italic 16px text",
      "Textarea: bottom-border-only style, min-height 120px, focus = border darkens to var(--fg)",
      "Live word counter: vanilla JS on input event, 'X palabras', color thresholds: gray/green/orange/red",
      "Submit button: disabled outside 15-100 word range, enabled state is dark bg white text",
      "Feedback: three cards for Claridad / Gramática / Vocabulario, each shows 0 or 1 point indicator",
      "Grammar corrections in diff-style box: 'Escribiste: [X]' → 'Mejor: [Y]' with reason",
      "If response is in Spanish: show 'Intenta responder en inglés :)' instead of full feedback",
      "Delete src/templates/practice.ts",
      "Header: 'Ejercicio 5 de 5 · ~3 min'",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "improvement",
    "description": "IMPROVE-3: Cross-cutting animations and completion celebration. Add feedback slide-in animation to all exercise templates (CSS transition 300ms). Add completion confetti when last exercise of the day is done. Add score count-up animation (0 → final score in 600ms). These are CSS+JS additions to existing templates.",
    "steps": [
      "Read specs/improvements-v2.md sections 2.4 and 2.5",
      "Add shared CSS (inline in each template or via a shared style block): .feedback-reveal slide-in keyframe, .score-animate class",
      "In each exercise template (long-reading, short-reading, vocabulary, fill-gap, writing): wrap feedback section in div with feedback-reveal class, trigger via JS classList.add after submit response",
      "Score count-up: after submission, JS animates score display from 0 to final value over 600ms",
      "Completion confetti: on dashboard, if exercises_completed === 5 after returning from last exercise, trigger CSS confetti (colored dots/shapes with fall animation, no library needed)",
      "Toast notification: fixed bottom banner 'X de 5 completados' fades in then out after 3 seconds",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "improvement",
    "description": "IMPROVE-4: Landing page polish. Refactor src/templates/landing.ts to add newspaper editorial details from specs/improvements-v2.md section 7. Decorative ornamental rule, thin border frame around the card, bottom-only email input style.",
    "steps": [
      "Read specs/improvements-v2.md section 7",
      "Read current src/templates/landing.ts",
      "Add ornamental horizontal rule: ──── § ──── between masthead and form",
      "Wrap the landing card in a 1px border frame (subtle, var(--muted))",
      "Email input: bottom-border-only style (remove full box border), focus = border darkens",
      "Style 'CADA DÍA UN PASO MÁS CERCA' as small-caps with letter-spacing",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P3-7: Student Routes — Full Wiring. Implement src/routes/student.ts with all student-facing routes. GET /s/:token renders dashboard. GET /s/:token/exercise/:id renders correct template by type. POST /s/:token/exercise/:id grades and saves submission. GET /s/:token/stats. Vocabulary submission adds words to word_bank. Cookie set on first token visit.",
    "steps": [
      "Read specs/routes.md for complete route specifications",
      "Read src/db.ts to understand available query functions",
      "Read all 5 exercise templates to understand their expected data shapes and form field names",
      "Implement GET /s/:token: validate token, set session cookie, get board+exercises+submissions, render dashboard",
      "Implement GET /s/:token/exercise/:id: validate, select correct template by exercise type (long_reading → exercise-long-reading, etc.), show existing submission if done",
      "Implement POST /s/:token/exercise/:id: parse answers, call correct grading function, save submission, add words to word_bank for vocabulary exercises, return JSON {score, maxScore, feedback}",
      "Implement GET /s/:token/stats: render stats template",
      "Set HTTP-only SameSite=Lax session cookie on first token URL visit, 1-year expiry",
      "Return 404 for invalid token or exercise ID",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "P4-1: Email Template Update. Rewrite src/templates/email.ts — fixed subject 'Tu práctica de hoy está lista', body with topic + single CTA 'Comenzar →', red button #CC0000, max 480px. Update src/services/email.ts to pass topic instead of article title.",
    "steps": [
      "Read specs/email.md",
      "Read current src/templates/email.ts and src/services/email.ts",
      "Rewrite email template: fixed subject, greeting with name, topic line, single CTA button red #CC0000",
      "Update sendInviteEmail signature to accept topic string instead of article title",
      "Update all callers in src/index.ts",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "P4-2: Stats Page Rebuild. Rewrite src/templates/stats.ts for the 5-exercise model. Streak display, totals, 16-week heatmap with 21-point scale, recent history (last 20 exercises with date, type label, score). Responsive, dark mode.",
    "steps": [
      "Read specs/design.md and specs/gamification.md",
      "Read current src/templates/stats.ts and src/db.ts for existing queries",
      "Add any missing DB query functions needed (total boards, per-exercise stats)",
      "Rewrite stats template: streak cards (current + longest), totals (exercises + boards completed)",
      "16-week heatmap: 21-point max scale, 4 intensity levels, same as dashboard heatmap component",
      "Recent history: last 20 exercises, date + exercise type label (Lectura Larga etc.) + score",
      "Responsive layout, dark mode support",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "P5-1: Admin Dashboard Template. Create src/templates/admin.ts. Sections: Today's Edition hero (topic, 5 collapsible exercise previews, status badge, action buttons), readership metrics (4 cards), users table, email log, settings form. Clean Inter font, white bg, desktop-first.",
    "steps": [
      "Read specs/admin.md",
      "Read src/routes/admin.ts and src/db.ts for data shapes",
      "Create src/templates/admin.ts with all 5 sections",
      "Today's Edition: topic, 5 collapsible exercise preview cards, Live/Draft badge, Generate/Regenerate/Send Email buttons",
      "Readership metrics row: active users today, avg completion, avg score, active streaks",
      "Users table: name, email, streak, last active, completed today, action buttons",
      "Email log table: last 30 entries",
      "Settings form: recipients, from_email, cron_schedule, base_url, difficulty",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "P5-2: Admin Routes — Full Implementation. Rewrite src/routes/admin.ts with all routes from specs. GET /admin, POST /admin/generate, POST /admin/regenerate, POST /admin/exercise/:id/regenerate, POST /admin/email, POST /admin/settings, user CRUD, topic CRUD, API routes. HTTP Basic Auth on all routes.",
    "steps": [
      "Read specs/routes.md and specs/admin.md",
      "Read current src/routes/admin.ts, src/db.ts, src/services/content.ts",
      "Ensure P5-1 admin template is done first",
      "Implement GET /admin: fetch all data, render admin template",
      "Implement POST /admin/generate and /admin/regenerate (with optional topic)",
      "Implement POST /admin/exercise/:id/regenerate",
      "Implement POST /admin/email (manual send)",
      "Implement settings, user CRUD, topic CRUD routes",
      "Implement API routes returning JSON: /api/board/today, /api/stats, /api/logs, /api/topics",
      "Verify HTTP Basic Auth on all admin routes",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  }
]
```

---

## Agent Instructions

1. Read `activity.md` first — understand what was recently done
2. Read `CLAUDE.md` — project conventions and rules
3. Find the next task with `"passes": false` in order
4. Read ALL spec files referenced in the task steps before writing any code
5. Search existing codebase for patterns before inventing new ones
6. Full implementations only — no stubs or TODOs
7. Run `npm run build` — must pass before committing
8. If it's a UI task: start local server and verify with agent-browser
9. Update `"passes": true`, log to `activity.md`, commit, push

---

## Completion Criteria
All tasks marked `"passes": true`
