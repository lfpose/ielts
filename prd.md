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
v4 feedback round: bug fixes, admin redesign, cron fix, word search hints, fill-the-gap typing UX, reading highlighter.

## Spec files to read
- `specs/improvements-v4.md` — **primary reference for v4 feedback fixes**
- `specs/improvements-v3.md` — v3 dashboard redesign
- `specs/improvements-v2.md` — exercise-level design decisions
- `specs/design.md` — color palette, typography, tokens
- `specs/exercise-*.md` — per-exercise content and UX rules
- `specs/daily-flow.md` — overall navigation and state model
- `specs/gamification.md` — streak, heatmap, progress bar rules

---

## Task List

```json
[
  {
    "category": "bugfix",
    "description": "FIX-1: Dashboard — topic image not loading. The dithered image area in the feature story card is blank (gray rectangle). Debug: read src/templates/dashboard.ts and check how the image URL from board.illustration JSON is being used in the <img> tag. Read src/services/content.ts fetchTopicImage() to verify it actually returns a URL. Test with a real board in the DB — check what illustration field contains. The image URL from Wikipedia may need a fallback, or the <img> src might be empty. Also verify the CSS dithering filter isn't hiding the image (check mix-blend-mode, contrast, brightness values). MUST verify fix with agent-browser screenshot.",
    "steps": [
      "Read src/templates/dashboard.ts — find the feature image rendering code",
      "Read src/services/content.ts — find fetchTopicImage() and check what URL it returns",
      "Check the DB: query a board's illustration field to see what's actually stored",
      "Fix the image rendering: ensure the <img> src gets the correct URL from the parsed illustration JSON",
      "If Wikipedia images have CORS issues, try using the original image URL (not thumbnail) or add crossorigin attribute",
      "If no image URL exists for a board, show a CSS gradient fallback (not a blank area)",
      "Start local server with dummy env vars, open dashboard with agent-browser, verify the image loads or fallback shows",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "FIX-2: Dashboard — vocabulary word preview shows [object Object]. In the right column vocabulary section, the word preview line renders as '[object Object] · [object Object] · ...' instead of actual words. The template is rendering the word objects directly instead of extracting the .word string property. Fix: in src/templates/dashboard.ts, find where vocabulary exercise words are displayed and change to map over the words array extracting the word string — e.g. words.map(w => w.word).join(' · '). MUST verify fix with agent-browser screenshot.",
    "steps": [
      "Read src/templates/dashboard.ts — search for the vocabulary word preview rendering (look for 'VOCABULARIO' section or word preview code)",
      "The content JSON for vocabulary exercises has shape: { words: [{ word: string, definition: string, context: string }, ...] }",
      "Fix: parse the content JSON, then map words extracting the .word property: words.map((w: any) => w.word).slice(0, 4).join(' · ') + ' ...'",
      "Start local server, open dashboard with agent-browser, verify word preview shows actual words like 'emissions · renewable · infrastructure · transition ...'",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "FIX-3: Vocabulary exercise — still renders as a plain HTML table instead of the tap-to-pair matching game. The template src/templates/exercise-vocabulary.ts should render two columns of tappable cards with vanilla JS tap-to-pair interaction, NOT a table. Read specs/improvements-v2.md section 4 for the full game design. Two columns: 6 word cards left, 6 shuffled definition cards right. Tap word → highlight → tap definition → pair connects with shared color. 6 pair colors. Tap to undo. Submit when all paired. MUST verify with agent-browser that the game renders as interactive cards, not a table.",
    "steps": [
      "Read specs/improvements-v2.md section 4 (full vocabulary game design)",
      "Read current src/templates/exercise-vocabulary.ts — understand what's there now",
      "If it renders a <table>, rewrite entirely to use div-based card layout",
      "Left column: 6 word cards (div with class, Playfair Display 700, 2px border, rounded, clickable)",
      "Right column: 6 definition cards (div, Inter 400 13px, same border/radius, shuffled order)",
      "Vanilla JS: selectedWord state, click word → highlight, click definition → pair with shared color from 6-color palette",
      "Pair colors from improvements-v2.md section 4.4: sage green, soft blue, warm amber, soft purple, soft rose, soft teal",
      "Connection animation: CSS transition 200ms, both cards get shared bg+border color",
      "Undo: click connected card → remove pairing",
      "Submit enables when all 6 paired",
      "Feedback after submit: correct green, incorrect red with context sentence shown",
      "Mobile: words as horizontal scroll row, definitions stacked below",
      "Start local server, open vocabulary exercise with agent-browser, verify cards render (NOT a table), verify JS interaction works by checking snapshot shows clickable elements",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "FIX-4: Content pipeline fixes — shorter long reading, easier vocabulary, short reading line breaks. In src/services/content.ts: (1) Update generateLongReading prompt to request 250-350 words instead of 500-700, with short paragraphs and clear line breaks. (2) Update generateVocabulary prompt to target B1-B2 practical vocabulary — words like 'sustainable', 'shortage', 'affordable', 'deadline' — NOT academic words like 'ubiquitous', 'mitigate', 'democratization'. Add explicit instruction: 'Choose practical, everyday vocabulary a Spanish speaker would encounter in conversations and news. Avoid academic or GRE-level words.' (3) Update generateShortReading prompt to require paragraph breaks every 2-3 sentences — never a wall of text. Read updated specs: specs/exercise-1-long-reading.md, specs/exercise-2-short-reading.md, specs/exercise-3-vocabulary.md.",
    "steps": [
      "Read the updated specs: specs/exercise-1-long-reading.md (250-350 words), specs/exercise-2-short-reading.md (paragraph breaks), specs/exercise-3-vocabulary.md (B1-B2 practical words)",
      "Read src/services/content.ts — find generateLongReading, generateShortReading, generateVocabulary functions",
      "Update generateLongReading prompt: change word count to 250-350, add 'Use short paragraphs of 3-4 sentences with clear line breaks'",
      "Update generateShortReading prompt: add 'Use short paragraphs of 2-3 sentences. NEVER write one continuous block of text. Include line breaks between paragraphs.'",
      "Update generateVocabulary prompt: change target level to B1-B2, add examples of good words (sustainable, shortage, affordable) and bad words (ubiquitous, mitigate, democratization), add 'Choose practical vocabulary a Spanish speaker needs for everyday English, not academic words'",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-1: DB + types for 2 new exercise types. Add 'mini_writing' and 'word_search' to the ExerciseType union in src/db.ts. Update daily board to have 7 exercise slots instead of 5. Update max score from 21 to 26 (5+2+6+4+5+1+3). Update any heatmap intensity thresholds or score calculations that reference 21 to use 26.",
    "steps": [
      "Read src/db.ts — find ExerciseType union type, update to include 'mini_writing' | 'word_search'",
      "Update any max score constants or calculations that use 21 to use 26",
      "Update getActivityData, getCurrentStreak, any heatmap functions that reference 21-point scale to use 26",
      "Update getTodaysBoardWithStatus if it assumes 5 exercises — should work with 7",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-2: Content generation for mini_writing and word_search. In src/services/content.ts, add generateMiniWriting(topic) and generateWordSearch(topic) functions. Update generateBoard() to produce 7 exercises (slots 1-7) instead of 5. Mini writing generates a 1-sentence prompt (complete-the-sentence, use-the-word, or reply-to-message format). Word search generates a 10x10 grid with 4 hidden words placed horizontally or vertically, remaining cells filled with random letters.",
    "steps": [
      "Read specs/exercise-6-mini-writing.md and specs/exercise-7-word-search.md fully",
      "Read src/services/content.ts — understand existing generation pattern",
      "Add generateMiniWriting(topic: string, difficulty: string): returns { prompt: string, type: 'complete'|'use_word'|'reply'|'describe' } — vary the format, always related to day's topic",
      "Add generateWordSearch(topic: string, difficulty: string): returns { grid: string[][], words: Array<{word, definition, example, startRow, startCol, direction}> }",
      "Word search grid generation: (1) pick 4 topic-related B1-B2 words 4-8 chars long via Claude, (2) place words in 10x10 grid — horizontal or vertical only, no overlaps, (3) fill remaining cells with random a-z letters",
      "Update generateBoard() to call generateMiniWriting and generateWordSearch in parallel with the other generators",
      "Create 7 exercises (slots 1-7): long_reading, short_reading, vocabulary, word_search, fill_gap, mini_writing, writing_micro",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-3: Grading for mini_writing and word_search. In src/services/grading.ts, add gradeMiniWriting(content, answers) and gradeWordSearch(content, answers). Mini writing: call Claude for quick 1-sentence grammar check, score 0 or 1. Word search: compare found words against hidden words, score = number correctly found (0-4).",
    "steps": [
      "Read specs/exercise-6-mini-writing.md (scoring section) and specs/exercise-7-word-search.md (scoring section)",
      "Read src/services/grading.ts — understand existing grading pattern",
      "Add gradeMiniWriting(content, answers): call Claude API for quick evaluation — is the sentence grammatically acceptable and on-topic? Return score 0 or 1, feedback with correction if needed. Feedback in Spanish.",
      "Add gradeWordSearch(content, answers): deterministic — compare submitted found-word positions against content.words positions. Score = number of correctly identified words (0-4). Feedback shows all 4 words with definitions.",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-4: Mini Writing template. Create src/templates/exercise-mini-writing.ts for Exercise 6. Compact layout: 'UNA FRASE' kicker, prompt in red-bordered box, single-line text input (not textarea), live word counter (5-30 words), submit button. After submit: feedback shows original sentence, correction if needed, score 0/1. Header: 'Ejercicio 6 de 7 · ~1 min'.",
    "steps": [
      "Read specs/exercise-6-mini-writing.md",
      "Read src/templates/exercise-writing.ts as a pattern reference (similar but simpler)",
      "Create src/templates/exercise-mini-writing.ts",
      "Layout: header bar with 'Ejercicio 6 de 7 · ~1 min', kicker 'UNA FRASE' (dark-red accent), prompt box with red left border",
      "Input: single-line <input type='text'> styled like textarea bottom-border-only, NOT a <textarea>",
      "Word counter: 'X palabras', gray <5, green 5-30, red >30",
      "Submit enabled only 5-30 words",
      "Feedback: 'Tu oración: [text]', correction if grammar error, score badge 0/1 or 1/1",
      "MUST verify with agent-browser — start local server, screenshot the page",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-5: Word Search template (Sopa de Letras game). Create src/templates/exercise-word-search.ts for Exercise 4. Interactive 10x10 letter grid. Tap cell to start selection, tap another in same row/col to complete selection. If letters spell a hidden word → cells turn green, word + definition + example appear below. 4 words to find. Counter 'X de 4 encontradas'. When all found, auto-submit. Vanilla JS.",
    "steps": [
      "Read specs/exercise-7-word-search.md fully",
      "Read specs/improvements-v2.md section 4.4 for pair colors (reuse 4 of the 6 colors for found words)",
      "Create src/templates/exercise-word-search.ts",
      "Grid: 10x10 div grid, each cell 36px square (28px mobile), Inter 600 14px uppercase, 1px border, centered",
      "Vanilla JS interaction: track selectedCells array. On cell click: if no selection start new selection, if same row/col as first cell extend selection to form a line, if different row AND col → deselect and restart",
      "When selection complete (second tap): extract letters, check if they spell any unfound word. If match → mark cells with pair color, add word to found list. If no match → flash red 300ms, deselect.",
      "Found words section below grid: word card with bold word (Playfair), definition (Inter), example (Lora italic), colored left border matching cell color",
      "Counter above grid: 'X de 4 encontradas'",
      "When 4 found: brief celebration animation, then show submit/complete button",
      "Feedback: all 4 words with definitions + examples, score 4/4, 'Palabras guardadas en tu banco'",
      "Header: 'Ejercicio 4 de 7 · ~3 min', kicker 'SOPA DE LETRAS'",
      "Mobile: smaller cells (28px), grid still fits in viewport",
      "MUST verify with agent-browser — check grid renders, cells are clickable",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "NEW-6: Dashboard + routes update for 7 exercises. Update src/templates/dashboard.ts layout for 7 exercises: feature (long reading), right column (short reading + vocabulary + word search), briefs row (fill gap + mini writing + writing micro — 3 items). Update src/routes/student.ts to handle mini_writing and word_search exercise types. Update exercise labels, accent colors, time estimates, and symbols maps to include the 2 new types.",
    "steps": [
      "Read specs/improvements-v3.md section 1.1 (updated exercise mapping for 7 exercises)",
      "Read src/templates/dashboard.ts — update EXERCISE_LABELS, EXERCISE_ACCENT, EXERCISE_SYMBOL, EXERCISE_TIME maps to include mini_writing and word_search",
      "mini_writing: label 'Una Frase', accent '#1a0000' (dark red, same family as writing), symbol '✏', time '~1 min'",
      "word_search: label 'Sopa de Letras', accent '#1a3a3a' (teal), symbol '🔍' or grid symbol, time '~3 min'",
      "Update dashboard layout: right column now has 3 items (short reading + vocabulary + word search), briefs row now has 3 items (fill gap + mini writing + writing micro)",
      "Briefs row: 3-column grid on desktop (33% each), stack on mobile",
      "Word search in right column: kicker 'SOPA DE LETRAS', '4 palabras escondidas', CTA 'Buscar →'",
      "Mini writing in briefs: kicker 'UNA FRASE', 'Escribe una oración sobre el tema', CTA 'Escribir →'",
      "Update progress dots: 7 dots instead of 5",
      "Update max score references: 26 points instead of 21",
      "Read src/routes/student.ts — add cases for 'mini_writing' → exercise-mini-writing template and 'word_search' → exercise-word-search template",
      "Update grading route to call gradeMiniWriting and gradeWordSearch for the new types",
      "MUST verify with agent-browser — dashboard shows 7 exercises, all links work",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "V4-1: Topic queue — repopulate with 50+ diverse topics. The topic queue is nearly empty. In src/db.ts or content.ts, expand the seed topic list to 50+ topics spanning: science, nature, culture, history, technology, health, geography, food, sports, travel, art, music, environment, space, animals, psychology, economics, architecture, fashion, film. If the seed population logic only runs on empty table, also add a function to repopulate when queue has < 5 remaining topics.",
    "steps": [
      "Read specs/improvements-v4.md section 1",
      "Read src/db.ts — find topic_queue seed population",
      "Expand the topic seed list to 50+ diverse topics across at least 15 categories",
      "Ensure repopulation: if topic_queue has < 5 unused topics, add more from the seed list (or generate via Claude)",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "V4-2: Admin login page — replace HTTP Basic Auth popup with a styled login page. Create src/templates/admin-login.ts with a shadcn-inspired card: centered, white bg, subtle shadow, rounded 8px, max-width 400px. Username + password inputs (40px height, rounded 6px, focus ring). Dark 'Iniciar sesión' button. On POST /admin/login validate against DASH_USER/DASH_PASS env vars, set admin_session cookie (HTTP-only, 24h). GET /admin without valid cookie → render login page. POST /admin/logout → clear cookie.",
    "steps": [
      "Read specs/improvements-v4.md section 2",
      "Create src/templates/admin-login.ts with shadcn-style card layout",
      "Inputs: Inter font, 40px height, 1px border #e2e8f0, rounded 6px, focus ring #3b82f6",
      "Button: #18181b bg, white text, rounded 6px, full-width, hover #27272a",
      "Update src/routes/admin.ts: remove HTTP Basic Auth middleware, add cookie-based session check",
      "Add POST /admin/login: validate credentials, set admin_session cookie (httpOnly, 24h, sameSite Lax)",
      "Add POST /admin/logout: clear cookie, redirect to /admin",
      "GET /admin without valid cookie → render login page",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "feature",
    "description": "V4-3: Admin dashboard — shadcn-style redesign with dark mode. Rewrite src/templates/admin.ts using shadcn design tokens from specs/improvements-v4.md section 3. Fixed sidebar (240px, muted bg), header bar with logout, card-based content sections. Dark mode toggle + CSS variables that swap. All admin components: cards with shadow+rounded, clean tables with hover, pill badges for status.",
    "steps": [
      "Read specs/improvements-v4.md sections 3 and 5",
      "Rewrite src/templates/admin.ts with shadcn design tokens as CSS variables",
      "Layout: fixed sidebar (240px) with nav items (Today/Users/Topics/Email/Settings), header bar with title + dark mode toggle + logout",
      "Cards: white bg, 1px border var(--admin-border), rounded 8px, shadow, 24px padding",
      "Tables: clean rows, muted header bg, hover highlight",
      "Buttons: primary (dark), secondary (border-only), destructive (red)",
      "Badges: rounded-full pills, green=live, yellow=draft, red=error",
      "Dark mode: add toggle, CSS variables swap via data-theme attribute, localStorage persistence",
      "MUST verify with agent-browser",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "V4-4: Cron schedule — change from 7:00 AM UTC to 00:00 CLT (04:00 UTC). In src/index.ts, update cron.schedule from '0 7 * * *' to '0 4 * * *'. Also ensure runDailyJob both generates the board AND sends the email automatically — no manual click needed.",
    "steps": [
      "Read specs/improvements-v4.md section 4",
      "Read src/index.ts — find cron.schedule line",
      "Change '0 7 * * *' to '0 4 * * *' (midnight CLT = 04:00 UTC)",
      "Update console.log message to say '00:00 CLT (04:00 UTC)'",
      "Verify runDailyJob() both generates the board AND sends email",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "bugfix",
    "description": "V4-5: Dashboard image STILL broken — deep fix. FIX-1 was not resolved. Debug thoroughly: (1) query the DB to check what illustration field actually contains, (2) check if fetchTopicImage in content.ts returns a real URL, (3) check the <img> tag src in dashboard.ts, (4) test the Wikipedia API call manually, (5) add crossorigin='anonymous' to img, (6) add onerror fallback (CSS gradient with topic text). If Wikipedia images have issues, try fetching originalimage.source instead of thumbnail. MUST verify with agent-browser that image loads or fallback shows.",
    "steps": [
      "Read specs/improvements-v4.md section 6",
      "Read src/services/content.ts — find fetchTopicImage, test the Wikipedia API URL manually with fetch/curl",
      "Read src/templates/dashboard.ts — find the <img> tag, check src binding",
      "Start local server, query a board to see what illustration field contains: is it valid JSON? does imageUrl have a value?",
      "If URL is empty: fix fetchTopicImage to try multiple Wikipedia API approaches (summary → opensearch → featured image)",
      "If URL exists but image doesn't load: add crossorigin='anonymous', try originalimage.source URL",
      "Add onerror fallback on the <img>: on error, replace with a CSS gradient + topic name text overlay",
      "MUST verify with agent-browser that either the image loads OR the fallback looks good",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "V4-6: Word search hints. Update src/templates/exercise-word-search.ts: (1) Show the 4 target words in a 'PALABRAS A BUSCAR' section below the grid by DEFAULT — the player knows WHAT to find but not WHERE. (2) Add a 'Pista' button per unfound word that highlights ONE cell in the grid where a letter of that word appears (soft yellow pulse animation).",
    "steps": [
      "Read specs/improvements-v4.md section 7",
      "Read src/templates/exercise-word-search.ts",
      "Add 'PALABRAS A BUSCAR' section below grid: list all 4 words (just the word text, no definitions yet)",
      "When a word is found: cross it out in the list, show its definition + example",
      "Add 'Pista' button next to each unfound word in the list",
      "On hint click: pick a random cell from that word's grid positions, highlight it with yellow bg pulse animation (CSS keyframe 1s), mark hint as used for that word",
      "Style: 'Pista' as small muted text button, changes to 'Usada' after click",
      "MUST verify with agent-browser",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "V4-7: Fill the Gap — immersive typing UX. Rewrite src/templates/exercise-fill-gap.ts: instead of tap-chip interaction, display the paragraph with inline <input> fields where blanks are. User types the missing words. Inputs are styled to look like inline text (same font, no visible border, auto-width). Placeholder shows dashes matching word length. Word bank displayed below as READ-ONLY reference list (not tappable). Tab key moves between inputs.",
    "steps": [
      "Read specs/improvements-v4.md section 8",
      "Read current src/templates/exercise-fill-gap.ts",
      "Rewrite paragraph rendering: split text at blank markers, insert inline <input> elements",
      "Input styling: Lora 400 17px (matching paragraph font), no border, bottom-border-only on focus, width = correct word length in ch units + 2ch padding",
      "Placeholder: light gray dashes '_ _ _ _' matching character count of correct word",
      "As user types: text appears in var(--fg) color over the ghost text",
      "Word bank below: label 'BANCO DE PALABRAS (referencia)', show all 7 words as plain text (Inter 500, comma-separated, not clickable)",
      "Tab key moves to next <input> (natural tab order)",
      "Submit enabled when all inputs have text",
      "Grading: compare each input value (trimmed, lowercased) against correct word",
      "MUST verify with agent-browser",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "feature",
    "description": "V4-8: Reading highlighter tool. Add text highlighting to long reading and short reading templates. User selects text in the passage → floating toolbar appears with 3 color buttons (yellow, green, pink). Clicking a color wraps the selection in a <mark> with that color. Clicking an existing highlight removes it. Vanilla JS, no persistence needed.",
    "steps": [
      "Read specs/improvements-v4.md section 9",
      "Read src/templates/exercise-long-reading.ts and exercise-short-reading.ts",
      "Add shared highlight JS code (can be inline in both templates or a shared function)",
      "On mouseup/touchend in the passage area: check if window.getSelection() has a non-empty range",
      "If selection exists: show floating toolbar positioned near the selection (absolute positioned div with 3 color buttons)",
      "Color buttons: 3 small circles (20px, rounded-full) — yellow #FEF3C7, green #D1FAE5, pink #FCE7F3",
      "On color click: wrap the selection range in a <mark> element with that background color, hide toolbar",
      "On click outside toolbar or on deselection: hide toolbar",
      "On click on existing <mark>: unwrap it (remove the mark, keep the text)",
      "Toolbar style: pill shape, subtle shadow, 8px above selection, z-index above content",
      "Only apply to passage text (not questions area)",
      "MUST verify with agent-browser — check toolbar appears on text selection",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": false
  },
  {
    "category": "improvement",
    "description": "V3-1: Content pipeline — replace ASCII art with Wikipedia topic image. In src/services/content.ts, remove the Claude API call that generates ASCII illustrations. Replace with a fetchTopicImage(topic) function that calls the Wikipedia REST API (https://en.wikipedia.org/api/rest_v1/page/summary/{topic}) and returns the thumbnail.source URL. If not found, try Opensearch first result. If nothing, return empty string. Also generate a short editorial subheadline (1 journalistic sentence about the topic). Store both (imageUrl, subheadline) in the board's illustration field as JSON: {imageUrl, subheadline}.",
    "steps": [
      "Read specs/improvements-v3.md sections 2 and 3",
      "Read src/services/content.ts — find the ASCII illustration generation (the Claude API call for ASCII art near line 428)",
      "Remove the ASCII generation Claude API call entirely",
      "Write fetchTopicImage(topic: string): Promise<string> — calls Wikipedia REST API https://en.wikipedia.org/api/rest_v1/page/summary/{encodeURIComponent(topic)}, returns response.thumbnail?.source or empty string",
      "If Wikipedia summary has no thumbnail, try Wikipedia Opensearch: https://en.wikipedia.org/w/api.php?action=opensearch&search={topic}&limit=3&format=json — take first result title, then fetch its summary for the thumbnail",
      "Write generateSubheadline(topic: string): Promise<string> — short Claude API call, one sentence, journalistic style, e.g. 'How volcanic eruptions reshape the natural world's most dramatic landscapes.'",
      "In generateBoard(): call fetchTopicImage and generateSubheadline in parallel (Promise.all)",
      "Store as JSON string in illustration field: JSON.stringify({ imageUrl, subheadline })",
      "Update createBoard() call — illustration is now this JSON string",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
  {
    "category": "improvement",
    "description": "V3-2: Dashboard — editorial newspaper masonry layout. Completely rewrite src/templates/dashboard.ts to implement the front-page newspaper layout from specs/improvements-v3.md. Feature story (long reading) takes left ~58% with dithered image. Right column has short reading + vocabulary. Bottom briefs row has fill gap + writing. Streak moves to masthead edition line. Progress becomes 5 small dots in topic banner. No 'Disponible' labels anywhere.",
    "steps": [
      "Read specs/improvements-v3.md sections 1 and 4-6 fully before touching any code",
      "Read specs/design.md for color tokens and typography",
      "Read current src/templates/dashboard.ts to understand existing data structures (BoardWithStatus, ExerciseWithStatus, etc.)",
      "Parse illustration field: const illus = board.illustration ? JSON.parse(board.illustration) : {}; → illus.imageUrl, illus.subheadline",
      "Masthead: edition line (vol + date left, greeting + streak right), big Playfair masthead, tagline, then double rule (3px + gap + 1px)",
      "Topic banner: 'TEMA DEL DÍA' kicker + horizontal rule + 5 progress dots right-aligned, then big topic headline (Playfair 900, 42px centered), subheadline below (Lora italic 15px centered muted)",
      "Main two-column layout: left 58% feature story, right 42% secondary stories, column rule between them",
      "Feature story (exercise slot 1 — long_reading): dithered image with CSS halftone overlay, kicker 'LECTURA PRINCIPAL', article title, 2-line lead, red CTA link — or score badge if completed",
      "CSS dithering on image: filter grayscale(1) contrast(1.6) brightness(0.9) + ::after dot overlay radial-gradient 3px pattern at 25% opacity",
      "Right column top (exercise slot 2 — short_reading): kicker 'ANÁLISIS BREVE', title, 2-line lead, CTA, thin rule below",
      "Right column bottom (exercise slot 3 — vocabulary): kicker 'VOCABULARIO', word list preview (first 4 words comma-separated), 'Juego de emparejamiento', CTA",
      "Bottom briefs section: 'EN BREVE' section header with rule, then two equal columns for exercises 4 and 5",
      "Brief (exercise slot 4 — fill_gap): kicker 'COMPLETA LOS ESPACIOS', 1-line description, CTA",
      "Brief (exercise slot 5 — writing_micro): kicker 'MICRO ESCRITURA', 1-line description, CTA",
      "Archive: compact horizontal flex list of past boards below briefs",
      "Remove: streak widget box, progress bar, all 'Disponible' text, ESTADÍSTICAS button (add stats link tiny in edition line instead)",
      "Heatmap: move to its own section after archive, or remove from dashboard entirely (it lives in stats page)",
      "Mobile: single column stack, all sections full width, image stays in feature card, briefs still 2-col",
      "Run npm run build — must pass with zero errors"
    ],
    "passes": true
  },
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
    "passes": true
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
    "passes": true
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
    "passes": true
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
    "passes": true
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
