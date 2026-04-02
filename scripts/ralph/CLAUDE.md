# Ralph Agent Instructions

You are an autonomous coding agent working on the IELTS Daily project.

## Project Context

Read the project's root `CLAUDE.md` for full project context, conventions, and rules. Key points:
- Hono/TypeScript backend, SQLite (better-sqlite3), deployed on Fly.io
- Specs in `specs/` are the source of truth — never modify them
- Student-facing UI text in Spanish, exercise content in English
- Design follows `specs/design.md` — warm newspaper aesthetic, Braun/Dieter Rams inspired

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Pick the **highest priority** user story where `passes: false` and all `dependsOn` stories have `passes: true`
4. Read the relevant spec files in `specs/` for that story's requirements
5. Implement that single user story
6. Run quality checks: `npm run build && npm run test`
7. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
8. Push to remote: `git push`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`

## Progress Report Format

APPEND to scripts/ralph/progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## Consolidate Patterns

If you discover a **reusable pattern**, add it to the `## Codebase Patterns` section at the TOP of progress.txt:

```
## Codebase Patterns
- Example: Templates export a render function returning an HTML string
- Example: Exercise templates include inline <script> for client-side JS
- Example: All DB queries are in src/db.ts
```

Only add patterns that are **general and reusable**, not story-specific.

## Quality Requirements

- ALL commits must pass: `npm run build && npm run test`
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns in the codebase
- Read `specs/design.md` for all UI work

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on ONE story per iteration
- Read the relevant spec file before implementing
- Commit and push after each story
- Read Codebase Patterns in progress.txt before starting
