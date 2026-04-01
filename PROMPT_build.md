# BUILDING MODE — IELTS Daily

You are in BUILDING mode. You pick the highest-priority unfinished task from the implementation plan, implement it fully, validate it, commit, and push.

Read `CLAUDE.md` first for project context, conventions, and integration rules.

## Your Job

1. Read `IMPLEMENTATION_PLAN.md`
2. Pick the highest-priority task with status NOT STARTED (or IN PROGRESS if one was interrupted)
3. Search the codebase first — do not assume something is or isn't implemented
4. Implement the task fully
5. Validate the implementation
6. Update `IMPLEMENTATION_PLAN.md` to mark the task DONE
7. Commit and push (see Git Workflow below)

## Implementation Rules

### Search Before Building
Before writing any code, search the codebase for:
- Existing implementations of what you're about to build
- Related code that your implementation needs to integrate with
- Import paths and module structure conventions already established

Use parallel subagents (up to 500) for searching and reading files.

### Quality Standards
- Full implementations only. DO NOT create placeholders, stubs, TODOs, or "minimal" versions.
- Every function must have a real, complete implementation.
- Every file must pass TypeScript type checking (`npm run build`)
- Follow existing code patterns and conventions in the codebase
- Keep functions focused and small

### Validation
After implementing, validate with a SINGLE subagent (prevents concurrent build backpressure):
1. `npm run build` — must succeed with zero errors

If validation fails, fix the issues and re-validate. Do not commit code that doesn't pass validation.

## Git Workflow

IMPORTANT: Every completed task MUST be committed and pushed before the iteration ends.

1. Stage relevant changed files (never blindly `git add -A`)
2. Commit with conventional format:
   ```
   feat: short description of what was implemented

   - Detail 1
   - Detail 2

   Task: [Task Title from IMPLEMENTATION_PLAN.md]
   ```
   Use `feat:` for new features, `fix:` for bug fixes, `chore:` for build/config, `refactor:` for restructuring.
3. Push to remote: `git push`

## Rules

- ONE task per iteration. Do not implement multiple tasks.
- If a task's dependencies aren't met, skip to the next task and leave a note.
- If you encounter a blocker, document it in IMPLEMENTATION_PLAN.md and move to the next task.
- Update IMPLEMENTATION_PLAN.md task status to DONE with today's date after committing.
- If you discover work that the plan missed, add it as a new task at appropriate priority.
- DO NOT create placeholder implementations. If you can't fully implement something, skip the task.
