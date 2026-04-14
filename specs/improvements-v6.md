# Improvements v6 — UX, Admin & New Exercises

**Source**: User feedback session (2026-04-13)
**Goal**: Improve admin visibility, add life to the writing wait experience, make login optional (not required), add 2 new exercises and 1 minigame, fix word search hint UX, and add reading highlighter.

---

## 1. Admin — User Detail Page

### Problem
The users table shows summary stats but clicking a user does nothing. You can't see what they've done.

### Feature
`GET /admin/users/:id/detail` returns a full HTML admin page showing:
- **Header**: name, email, token, joined date
- **Streak card**: current streak 🔥, longest streak, last active date
- **Totals**: total exercises completed, total boards completed, word bank size
- **Recent activity**: last 20 submissions — date, exercise type, score/max, collapsible feedback JSON preview
- **Activity heatmap**: same 16-week heatmap as student stats page
- **Word bank**: first 20 words with difficulty badges

### Implementation
- `GET /admin/users/:id` already returns JSON — keep that as the API endpoint
- Add `GET /admin/users/:id/detail` returning HTML (new route + new template function)
- Make user rows clickable in admin table: `onclick="window.location='/admin/users/${u.id}/detail'"` with `cursor: pointer`
- Add "Ver detalle →" link in the user actions dropdown

---

## 2. Admin — Word Search Grid Preview

### Problem
Word search exercise preview in admin Today's Edition shows generic text, not the actual grid.

### Feature
In `renderExercisePreview()` in `src/templates/admin.ts`, add a `word_search` case:
- Render the 10×10 grid as a compact HTML table (cell size ~18px, Inter Mono 10px)
- Highlight cells belonging to target words with soft background colors (one per word)
- Below grid: list the 4 target words

---

## 3. Writing Exercise — AI Thinking Animation

### Problem
After submitting writing, nothing happens for 5-10 seconds. User doesn't know the app is working.

### Feature
When writing submit button is clicked:
1. Button → "Evaluando..." (disabled)
2. ASCII braille spinner + cycling messages appear below:
```
⠋ Leyendo tu respuesta...
⠙ Analizando gramática...
⠹ Evaluando vocabulario...
⠸ Preparando feedback...
```
- Frames cycle every 80ms (⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏)
- Messages cycle every 1500ms
- Animation stops and hides when feedback arrives
- Monospace font, muted color, 14px

### Applies to
- `src/templates/exercise-writing.ts` (Writing Micro, Exercise 5)
- `src/templates/exercise-mini-writing.ts` (Mini Writing, Exercise 6)
- `src/templates/exercise-number-words.ts` (Number to Words, Exercise 8 — since it uses AI grading)

---

## 4. Optional Login — Use App Without Account

### Philosophy
The app should be usable by anyone without friction. Login is optional and exists for two purposes only:
1. Cross-device tracking (same progress on phone + laptop)
2. Daily email updates

An unauthenticated user can do everything a logged-in user can, except their progress isn't saved between sessions.

### Landing Page Change
Current: landing page requires email to enter.
New: landing page has a single primary action — enter without friction:

```
┌──────────────────────────────────────────┐
│         The IELTS Daily                  │
│                                          │
│  [Comenzar →]                            │  ← only button, no email required
│                                          │
│  ── ¿Ya tienes cuenta? ──                │
│  [email input] [Entrar]                  │  ← small, secondary, for returning users
└──────────────────────────────────────────┘
```

### Anonymous session
- `GET /` with no email → create a guest user record, store token in `session_token` cookie
- Guest user: `email = null`, `name = "Invitado"`, `is_guest = true`
- Guest progress IS saved to DB — the cookie is their identity, same as a real user
- If guest adds their email later: update `email`, `name`, `is_guest = false` on the SAME user record — all progress is preserved

### Email prompt modal — shown after first exercise completion
Do NOT ask for email on the landing page. Instead, after the user submits their FIRST exercise and sees feedback, show a dismissible modal:

```
┌─────────────────────────────────────────────┐
│  ¡Buen trabajo! 🎉                           │
│                                             │
│  Guarda tu progreso y recibe el ejercicio   │
│  diario en tu correo — completamente        │
│  opcional.                                  │
│                                             │
│  Tu correo electrónico:                     │
│  [________________________]                 │
│                                             │
│  [Guardar progreso]   [Ahora no]            │
│                                             │
│  Sin spam. Cancela cuando quieras.          │
└─────────────────────────────────────────────┘
```

- Modal trigger: `POST /s/:token/exercise/:id` response → if `user.is_guest && user.total_submissions === 1` → response includes `{ showEmailPrompt: true }`
- Template JS shows the modal on this condition
- "Ahora no" dismisses the modal and sets a `email_prompt_dismissed` flag in localStorage (never show again until next session, or show once per day at most)
- "Guardar progreso" submits `POST /s/:token/register` with email → updates user record, sets `is_guest = false`
- After registering: modal thanks them and closes — no page reload needed

### Dashboard soft nudge (for persistent guests)
If guest has completed ≥ 3 exercises total (across days) and never dismissed permanently, show a one-line soft nudge at the top of the dashboard:
```
"Ingresa tu correo para acceder desde cualquier dispositivo →"
```
Small, muted, easy to ignore. Clicking opens the same email modal.

### Guest user in DB
Add `is_guest` column to `users` table (integer, default 0). Guest users can be pruned after 30 days of inactivity.

### Email unsubscribe
- Every email sent must include an unsubscribe link: `GET /unsubscribe?token=:token`
- That route sets `email_unsubscribed = 1` on the user record (add column to `users`)
- Unsubscribed users are skipped in `runDailyJob()` email sending
- Unsubscribe page: simple confirmation "Te dimos de baja del boletín diario. Puedes volver a suscribirte desde tu tablero."
- Re-subscribe link on the student dashboard for unsubscribed users

### DB changes
- `users` table: add `is_guest INTEGER DEFAULT 0`, `email_unsubscribed INTEGER DEFAULT 0`

---

## 5. Minigame — Hangman

### Purpose
Fun vocabulary minigame. Guess the hidden English word related to the day's topic.

### Content
- 1 word per game, 5-10 letters
- Word related to the day's topic
- A definition hint shown from the start

### Content JSON
```json
{
  "word": "sustainable",
  "definition": "able to be maintained over a long period without causing damage",
  "example": "We need more sustainable farming practices."
}
```

### UI/UX
- Word shown as underscores: `_ _ _ _ _ _ _ _ _ _ _`
- Definition shown below the word display
- 26 letter buttons (A-Z) in a 6-column grid
- Correct guess → fills all matching letters
- Wrong guess → letter button turns red, hangman gains a part
- ASCII hangman drawing (6 stages), monospace font

```
  +---+     +---+     +---+     +---+     +---+     +---+
  |   |     |   |     |   |     |   |     |   |     |   |
  |         |   O     |   O     |   O     |   O     |   O
  |         |         |   |     |  \|     |  \|/    |  \|/
  |         |         |         |         |         |   |
  |         |         |         |         |         |  / \
 ===       ===       ===       ===       ===       ===
```

- Win: word revealed in green, "¡Lo lograste!" message
- Lose: word revealed in red, "La palabra era: [word]", definition shown again
- Max wrong guesses: 6

### Scoring
- 1 point if won (guessed within 6 wrong attempts)
- 0 points if lost

### Position in Daily Board
- Slot 8, label "AHORCADO"

### Post-exercise
- Word added to user's word bank regardless of win/lose

---

## 6. Exercise 8 — Number to Words

### Purpose
Practices a core IELTS Academic Writing Task 1 skill: writing numbers as English words.

### Content
- 3 numbers per exercise
- Types: integers (85), decimals (3.5), ordinals (1st, 2nd), percentages (45%), years (1995)
- Numbers are context-appropriate for the day's topic

### Content JSON
```json
{
  "items": [
    {
      "display": "85",
      "answer": "eighty-five",
      "alternatives": ["eighty five"],
      "type": "integer"
    },
    {
      "display": "3.5",
      "answer": "three point five",
      "alternatives": ["three and a half"],
      "type": "decimal"
    },
    {
      "display": "1st",
      "answer": "first",
      "alternatives": [],
      "type": "ordinal"
    }
  ]
}
```

### UI/UX
- 3 number cards stacked vertically
- Each card: big number display (JetBrains Mono, 48px, centered), label "Escríbelo en inglés:", text input
- Input: no autocorrect, no autocapitalize, `spellcheck="false"`
- Submit when all 3 filled
- AI grading (not deterministic): Claude evaluates each answer for correctness, accepting valid spelling variants and common alternatives. Returns per-item `{ correct: boolean, userAnswer: string, correctAnswer: string, note?: string }` — the `note` explains why a variant is or isn't acceptable
- AI thinking animation while grading
- Feedback: each card shows ✓ or ✗, correct answer, optional note
- Score: 1 point per correct = 3 max

### Grading
AI-based (not deterministic) because English has many valid variants ("eighty-five" vs "eighty five", "three and a half" vs "three point five"). Claude checks:
- Is the written form a valid English representation of the number?
- Is it appropriate for formal/academic writing?
- Returns structured JSON per item with `correct`, `correctAnswer`, `note`

### Position in Daily Board
- Slot 9, label "NÚMEROS"

---

## 7. Word Search — Fix Hint UX

### Problem
Currently the word search shows the TARGET WORDS (e.g., "DREAM") above the grid. This defeats the purpose — the user knows exactly what to look for without reading the definitions. They can just scan the grid for the word.

### Fix
Remove the word text from the "words to find" section. Show ONLY the definition and example sentence. The user must:
1. Read the definition: "a sequence of images and sensations during sleep"
2. Read the example: "She had a vivid _____ about flying" (word blanked out in the example)
3. Deduce the word: "That must be DREAM"
4. Then search the grid for it

### Display format (below the grid)
```
PALABRA 1 DE 4
─────────────────────────────
Definición: a sequence of images and sensations occurring in a person's mind during sleep
Ejemplo: "She had a vivid _____ about flying over the mountains."
[ _ _ _ _ _ ] ← 5 blanks showing word length as a hint
```

After finding the word, the card reveals the word and turns green.

### Content change
In `generateWordSearch()`, change the example sentence generation: blank out the target word in the example with `_____`. The word length is shown as blank count.

### Template change
In `src/templates/exercise-word-search.ts`:
- Remove the "PALABRAS A BUSCAR" word list
- Show definition + blanked example + letter count hint `(_ _ _ _ _)` per word
- After a word is found: reveal the actual word in green in its card

### Hint button (keep from v4)
The "Pista" button still works — highlights one letter cell in the grid.

---

## 8. Reading Highlighter

### Feature
Text highlighting on passage text in reading exercises:
1. User selects text → floating toolbar appears with 3 color circles (yellow, green, pink)
2. Tap color → wraps selection in `<span style="background: #COLOR">`
3. Tap existing highlight → removes it
4. In-memory only, lost on refresh

### Colors
- Yellow: `#FEF3C7`
- Green: `#D1FAE5`
- Pink: `#FCE7F3`

### Toolbar
- `position: fixed`, placed 8px above selection via `getBoundingClientRect()`
- 3 colored circles, 20px each, `border-radius: 50%`, subtle shadow
- Disappears on click outside

### Applies to
- `src/templates/exercise-long-reading.ts`
- `src/templates/exercise-short-reading.ts`

---

## Priority Order

1. **Writing animation (#3)** — quick win, big UX impact
2. **Word search UX fix (#7)** — fixes a fundamental gameplay issue
3. **Reading highlighter (#8)** — quick, already specced
4. **Optional login / email unsubscribe (#4)** — larger refactor, high value
5. **Admin user detail page (#1)** — admin polish
6. **Admin word search preview (#2)** — minor polish
7. **Exercise 8: Number to Words (#6)** — new exercise
8. **Hangman minigame (#5)** — most complex, save for last
