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

## Verify in Browser

For tasks that produce visible UI (templates, pages), verify visually with agent-browser:

```bash
# Start the server in background
npm run build && node dist/index.js &
SERVER_PID=$!
sleep 2

# Open and screenshot
agent-browser open http://localhost:3000
agent-browser screenshot screenshots/[task-id].png

# Check for console errors
agent-browser snapshot -i -c

# Kill server
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
