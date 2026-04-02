# Admin Dashboard

The admin dashboard is the editorial desk. You're the editor-in-chief of a daily newspaper — you review content before it goes live, watch your readers' engagement, and manage the operation.

Protected by HTTP Basic Auth (`DASH_USER`, `DASH_PASS` from env).

## Sections

The admin panel is a single-page dashboard with collapsible sections, not a multi-page app. Everything visible at a glance, details expandable.

---

## 1. Today's Edition (Hero Section)

The first thing you see: today's board status.

### If board exists:
- **Topic** displayed prominently (e.g., "Today: Dinosaurs and prehistoric life")
- **Status badge**: "Live" (green) or "Draft" (yellow, if generated but email not sent)
- **5 exercise cards** in a row, each showing:
  - Type label (Long Reading, Short Reading, etc.)
  - Title or first line of content
  - Expandable preview — click to see the full exercise content (article text, questions, answers, word list, prompt)
  - **Regenerate** button per exercise — re-generates just that one exercise while keeping the others
- **Actions row**:
  - "Regenerate All" — delete today's board and regenerate from scratch (same topic)
  - "Regenerate with New Topic" — delete and regenerate with a different topic
  - "Send Email" — send (or re-send) the daily email to all recipients
  - "Preview as Student" — opens the student dashboard in a new tab using a test user token

### If no board yet:
- Big "Generate Today's Board" button
- Topic picker: dropdown of available topics (excluding recently used) + "Random" option
- After generation: board appears with preview

---

## 2. Readership (Stats Overview)

At-a-glance metrics about your users. Think analytics dashboard, not spreadsheet.

### Metrics cards (row of 4):
- **Active Users Today**: how many users have completed at least 1 exercise today
- **Avg Completion**: average exercises completed per user today (e.g., "3.2 / 5")
- **Avg Daily Score**: average total score across users today (out of 21)
- **Active Streaks**: how many users currently have a streak ≥ 2 days

### Engagement chart (simple):
- Last 14 days, bar chart
- Each bar = number of exercises completed that day (across all users)
- Gives a quick sense of: are people using this?

---

## 3. Users

User management table.

### User list:
| Name | Email | Streak | Last Active | Completed Today | Total Exercises | Actions |
|---|---|---|---|---|---|---|
| Natalia | n@email.com | 🔥 12 | Today | 4/5 | 156 | View · Remove |

### Per-user detail (expandable):
- Streak history (current + longest)
- Last 10 days of activity: date, exercises completed, total score
- Word bank size (how many words learned)
- Link to their student dashboard (opens as them)

### Add user:
- Simple form: name + email
- Auto-generates UUID token
- Option to send welcome email immediately

---

## 4. Editorial Calendar (Topic Management)

You're the editor. Control what your readers practice.

### Topic Queue:
- The list of 20 topics (from content-pipeline spec)
- Each row shows: topic name, last used date (or "Never"), times used
- **Drag to reorder** — top of the list = next to be picked (instead of random, the system picks from the top of the queue)
- **Add topic** — text input to add a new topic to the queue
- **Remove topic** — remove from rotation (but keep in history)
- **Force next** — pin a topic as tomorrow's pick (overrides queue order)

### Topic History:
- Last 30 days: date, topic, board ID
- Shows the full rotation pattern so you can spot gaps

### How topic selection works (updated):
1. If a topic is "forced" for tomorrow → use it
2. Otherwise pick from the top of the queue (topics not used in the last 20 days)
3. After use, topic moves to the bottom of the queue
4. This gives the admin full control while keeping a sensible default

---

## 5. Email Log

### Recent emails table:
| Sent At | Topic | Recipients | Status | Duration |
|---|---|---|---|---|
| 07:01 | Dinosaurs | 2 recipients | ✓ Sent | 1.2s |
| Yesterday 07:00 | Coral reefs | 2 recipients | ✗ Failed | — |

- Last 30 entries
- Failed emails show error message on expand
- "Resend" button on failed emails

---

## 6. Settings

Configuration form at the bottom. Saved to the `settings` table.

### Fields:
- **Recipients**: comma-separated emails (who gets the daily email)
- **From Email**: Resend sender address
- **Cron Schedule**: when to generate + send (e.g., `0 7 * * *`)
- **Base URL**: for links in emails (e.g., `https://ielts-daily.fly.dev`)
- **Difficulty Level**: dropdown — B1 / B2 / C1 (affects AI generation prompts, default B2)

### Save button:
- Saves all settings
- Shows confirmation toast

---

## Design

The admin dashboard does NOT follow the newspaper aesthetic. It's a functional tool.

- Clean, minimal — white background, no serif fonts
- Inter throughout (the UI font from the main design system)
- Cards and tables with subtle borders
- Status colors: green (success/live), yellow (warning/draft), red (error/failed)
- Responsive but desktop-first (admin will use this on a laptop)
- No dark mode needed for admin (keep it simple)

---

## Routes (additions to routes spec)

These supplement the routes already defined in `specs/routes.md`:

- `POST /admin/exercise/:exerciseId/regenerate` — regenerate a single exercise
- `POST /admin/topics/reorder` — save new topic order
- `POST /admin/topics/add` — add a topic
- `POST /admin/topics/remove` — remove a topic
- `POST /admin/topics/force` — force a topic for tomorrow
- `POST /admin/users/add` — create a new user
- `POST /admin/users/:userId/remove` — remove a user
- `GET /admin/users/:userId` — user detail JSON (for expandable rows)
