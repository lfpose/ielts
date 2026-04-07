# Daily Flow

The app is a daily English practice platform. Every day, 5 fresh exercises are waiting. The user arrives, solves them, sees their streak grow, and leaves.

## The Loop

1. User receives a daily email with a link (their personal token baked in)
2. They click the link, land on the exercise dashboard
3. Dashboard shows 5 exercises for today, each as a card
4. User taps a card → opens the exercise inline or as a focused view
5. User completes the exercise → submits → sees instant feedback
6. Card flips to "done" state with score
7. After all 5 are done, a completion celebration + streak update
8. Come back tomorrow. New exercises.

## Daily Board

Each day is a "board" — a set of 5 exercises generated together from a shared theme/article. The board resets every day at midnight in the user's timezone (or a fixed time like 5:00 AM UTC-3 for the initial user).

### Exercise slots (always in this order):

| # | Type | Duration | Purpose |
|---|---|---|---|
| 1 | Long Reading | ~5 min | Deep comprehension |
| 2 | Short Reading | ~3 min | Quick inference |
| 3 | Vocabulary Match | ~3 min | Learn new words |
| 4 | Word Search (Sopa de Letras) | ~3 min | Find + learn words (game) |
| 5 | Fill the Gap | ~3 min | Apply known vocabulary |
| 6 | Mini Writing (Una Frase) | ~1 min | Write 1 sentence |
| 7 | Writing Micro | ~3 min | Write 2-3 sentences |

Total: ~21 minutes per day. Max score: 5+2+6+4+5+1+3 = 26 points.

## Exercise States

Each exercise card has one of these states:
- **Locked**: Not yet — future consideration (all unlocked for now)
- **Available**: Ready to solve
- **In Progress**: Started but not submitted
- **Completed**: Submitted, feedback shown, score recorded

## Navigation

- The dashboard is the home. Always shows today's board.
- Each exercise card on the dashboard is clickable.
- Clicking opens a **dedicated exercise page** (`/s/{token}/exercise/{id}`) — a full page with proper UI for that exercise type (radio buttons, drag-and-drop, text inputs, etc.)
- Each exercise page has its own tailored layout — not generic plain text. The UI matches the exercise type (see individual exercise specs).
- After submitting, feedback is shown on the same exercise page.
- "Back to dashboard" button returns to the board, where the card now shows as completed with score.
- Each exercise is its own page, its own URL. User can refresh without losing state (answers saved on submit, not on navigate).

## Daily Reset

- New board every day
- Streak counts consecutive days with at least 1 exercise completed (ideally all 5)

## Archive (Lower Priority)

- Past boards are accessible from the dashboard (scrollable list below today's board)
- Shows last 10 days: date, topic, completion status (e.g., "5/5" or "3/5")
- Tapping a past day opens that board's exercises (read-only if already submitted, solvable if not)
- This is a secondary feature — the dashboard should focus on TODAY first
