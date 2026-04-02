# Routes & API

All routes served by Hono. Server-rendered HTML pages with client-side JS for interactive exercise components.

## Public Routes (no auth)

### `GET /`
Landing page.
- If `session_token` cookie present and valid → redirect to `GET /s/:token`
- Otherwise → render a simple page with "Enter your email" form
- Minimal: logo, one input field, one button

### `POST /login`
Email-based login.
- Body: `{ email: string }`
- Looks up user by email
- If found → set `session_token` cookie → redirect to `/s/:token`
- If not found → render landing page with error: "No encontramos tu cuenta"

## Student Routes (token auth)

All student routes validate the token from the URL. On first visit, set the `session_token` cookie.

### `GET /s/:token`
**Dashboard / Daily Board.**
- Validates token → get user
- Get today's board (by date)
- Get user's submissions for today's exercises
- Render the newspaper-style dashboard:
  - Header: date, streak, daily progress (X/5)
  - 5 exercise cards in order, each showing: type icon/label, title, status (available/completed + score)
  - Activity heatmap (16 weeks)
  - Below: archive of past boards (last 10 days, lower priority)
- If no board for today → show "Today's exercises are being prepared" message

### `GET /s/:token/exercise/:exerciseId`
**Exercise page.**
- Validates token → get user
- Get exercise by ID, verify it belongs to today's board (or a past board for archive access)
- Check if user already submitted this exercise
- If not submitted → render the exercise UI for this type:
  - `long_reading`: article text + 5 questions with radio buttons
  - `short_reading`: passage + 2 questions with radio buttons (or text input for short answer)
  - `vocabulary`: two-column matching game with tap-to-connect JS
  - `fill_gap`: paragraph with blanks + tappable word chips
  - `writing_micro`: prompt + textarea with live word counter
- If already submitted → render the exercise with feedback overlay (answers locked, corrections shown)

### `POST /s/:token/exercise/:exerciseId`
**Submit exercise answers.**
- Validates token → get user
- Validates exercise exists and user hasn't already submitted
- Body: JSON with answers (shape depends on exercise type, see database spec)
- Grade the exercise:
  - `long_reading`, `short_reading`, `vocabulary`, `fill_gap`: deterministic grading, compare to answer key
  - `writing_micro`: call Claude API for AI evaluation
- Save submission (answers, score, feedback)
- Add words to word_bank if vocabulary exercise (all 6 words, regardless of score)
- Return JSON: `{ score, maxScore, feedback }`
- Client-side JS updates the page to show feedback without full reload

### `GET /s/:token/stats`
**Statistics page.**
- Validates token → get user
- Compute: current streak, longest streak, total exercises completed, total boards completed
- 16-week activity heatmap (daily total score out of 21)
- Recent score history (last 20 submissions with dates and scores)

## Admin Routes (HTTP Basic Auth)

Protected by HTTP Basic Auth (credentials from env: `DASH_USER`, `DASH_PASS`).

### `GET /admin`
**Admin dashboard.** Single page with collapsible sections. See `specs/admin.md` for full layout.

### `POST /admin/generate`
**Generate today's board.**
- Optional body: `{ topic?: string }` — if provided, use this topic; otherwise pick from queue
- If board already exists for today, returns error (use regenerate)
- Generates 5 exercises, saves to DB
- Does NOT auto-send email (admin sends manually)

### `POST /admin/regenerate`
**Delete today's board and regenerate.**
- Optional body: `{ newTopic?: boolean }` — if true, picks a different topic
- Deletes today's board + exercises + submissions
- Runs full generation pipeline

### `POST /admin/exercise/:exerciseId/regenerate`
**Regenerate a single exercise.**
- Keeps the board and other exercises intact
- Re-generates just this exercise using the same topic
- Deletes any submissions for this exercise

### `POST /admin/email`
**Send daily email manually.**
- Sends the daily email to all recipients with link to today's board
- Logs result in email_log

### `POST /admin/settings`
**Update settings.**
- Body: form data with key-value pairs (recipients, from_email, cron_schedule, base_url, difficulty)
- Updates settings table

### `POST /admin/users/add`
**Add a new user.**
- Body: `{ name: string, email: string }`
- Creates user with auto-generated UUID token
- Optional: `{ sendWelcome?: boolean }` to send welcome email

### `POST /admin/users/:userId/remove`
**Remove a user.**
- Deletes user + their submissions + word bank entries

### `GET /admin/users/:userId`
**User detail (JSON).**
- Returns: streak, last 10 days activity, word bank size, completion stats

### `POST /admin/topics/reorder`
**Save topic queue order.**
- Body: `{ topics: string[] }` — ordered list of topic names

### `POST /admin/topics/add`
**Add a topic to the queue.**
- Body: `{ topic: string }`

### `POST /admin/topics/remove`
**Remove a topic from the queue.**
- Body: `{ topic: string }`

### `POST /admin/topics/force`
**Force a topic for tomorrow.**
- Body: `{ topic: string }`
- Stores in settings as `forced_topic`

## API Routes (JSON)

### `GET /api/board/today`
- Returns today's board + exercises as JSON (for admin preview)

### `GET /api/stats`
- Returns: active users today, avg completion, avg score, active streaks, 14-day engagement

### `GET /api/logs`
- Returns recent email logs as JSON

### `GET /api/topics`
- Returns topic queue with order, last used dates, usage counts
