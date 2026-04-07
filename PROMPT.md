@prd.md @activity.md @CLAUDE.md

We are building the IELTS Daily app according to the PRD above.

First, read `activity.md` to understand what was recently accomplished.

## Find Your Task

Open `prd.md` and find the single next task where `"passes": false`, in order from top to bottom.

Work on **exactly ONE task** per iteration.

## Before Writing Code

Search the codebase first. For every task:
1. Read the spec files mentioned in the task steps (they are in `specs/`)
2. Read related existing files (templates, routes, db.ts) to understand patterns
3. Use the patterns you find — don't invent new ones

## Implement the Task

Follow the task's `steps` array exactly. Each task ends with `npm run build` — this is your quality gate.

- Full implementations only. No stubs, TODOs, or placeholder code.
- TypeScript strict mode — no type errors allowed.
- Follow existing code conventions (see CLAUDE.md).

If `npm run build` fails:
1. Read the error carefully
2. Fix the issue
3. Run `npm run build` again
4. Do not commit until it passes.

## Verify in Browser (MANDATORY for UI tasks)

For ANY task that touches templates, pages, or rendering logic — you MUST verify visually.

```bash
# Kill any leftover server
pkill -f "node dist/index.js" 2>/dev/null || true

# Start server with dummy env vars
npm run build && RESEND_API_KEY=dummy ANTHROPIC_API_KEY=dummy node dist/index.js &
SERVER_PID=$!
sleep 3

# Find a user token
TOKEN=$(RESEND_API_KEY=dummy ANTHROPIC_API_KEY=dummy node --input-type=module -e "
import { getAllUsers } from './dist/db.js';
const u = getAllUsers();
if (u.length) console.log(u[0].token);
else console.log('NO_USERS');
" 2>/dev/null)

# Screenshot the page you changed
agent-browser open "http://localhost:8080/s/$TOKEN"
agent-browser screenshot "screenshots/verify-[task-id].png"
agent-browser snapshot -i -c
```

### Check for rendering bugs

After taking the screenshot, inspect the page output for these common issues:
- `[object Object]` in any visible text — means you're rendering an object instead of a string property
- `undefined` in any visible text — means a field name mismatch
- Blank/empty image areas — means the image URL is missing or broken
- Console errors in the snapshot output

If you find ANY of these issues, fix them before committing. Do NOT mark a task as passing if the browser shows rendering bugs.

```bash
# Kill server when done
kill $SERVER_PID 2>/dev/null || true
```

For non-UI tasks (services, routes without templates), skip this step.

## Log Progress

Append a dated entry to `activity.md`:
```
### YYYY-MM-DD HH:MM — [Task ID]
- What was implemented
- Files changed
- Any notable decisions or issues
---
```

## Update Task Status

When the task passes `npm run build`, update that task's `"passes"` field in `prd.md` from `false` to `true`.

## Commit

Stage only the files changed for this task (never `git add -A` blindly).

Commit format:
```
feat: short description

- Detail 1
- Detail 2

Task: [Task description from prd.md]
```

Use `feat:` for new features, `fix:` for bugs, `refactor:` for restructuring.

Then push: `git push`

## Rules

- ONE task per iteration — no more
- Never commit code that fails `npm run build`
- Never modify spec files in `specs/`
- If a task's dependencies aren't ready, skip to the next unblocked task and note why

## Completion

When ALL tasks have `"passes": true`, output:

<promise>COMPLETE</promise>
