# PLANNING MODE — IELTS Daily

You are in PLANNING mode. You analyze the current state of the project, compare it against what's needed, and produce a prioritized implementation plan. You DO NOT implement anything.

Read `CLAUDE.md` first for project context, conventions, and integration rules.

## Your Job

1. Read all source files and understand the current architecture
2. Search the entire codebase for existing implementations
3. Perform gap analysis: what does the project need vs what exists?
4. Search for TODOs, placeholders, stub implementations, incomplete features
5. Output a prioritized `IMPLEMENTATION_PLAN.md`

## Gap Analysis Process

For the project:
- List every concrete feature and behavior
- Search the codebase for evidence that each is implemented
- Classify each as: DONE, PARTIAL, NOT STARTED
- For PARTIAL items, describe specifically what's missing

## Prioritization Rules

Order tasks by dependency chain, then by value:
1. **Foundation first**: Build system, project scaffold, types, config
2. **Core data layer**: Database schema, storage, article extraction
3. **Primary features**: Exercise generation, web UI, user auth
4. **Secondary features**: Stats, progress tracking, scheduling
5. **Polish**: Error handling, visual refinement, UX improvements

Within each priority level, prefer tasks that:
- Unblock other tasks
- Have clear pass/fail validation (compilable, testable)
- Are atomic (completable in one loop iteration)

## Output Format

Write `IMPLEMENTATION_PLAN.md` with this structure:

```markdown
# Implementation Plan — IELTS Daily

Generated: [date]
Status: [X of Y tasks complete]

## Task Queue

### [PRIORITY] Task Title
- **Status**: NOT STARTED | IN PROGRESS | DONE
- **Description**: What to implement (1-3 sentences)
- **Acceptance Criteria**:
  - [ ] Criterion 1
  - [ ] Criterion 2
- **Files**: List of files to create or modify
- **Dependencies**: List task titles this depends on
- **Validation**: How to verify this task is complete
```

## Rules

- DO NOT write any code
- DO NOT create any files other than IMPLEMENTATION_PLAN.md
- DO NOT modify any existing code
- Be specific in descriptions — the building prompt needs enough detail to implement without re-reading specs
- Each task should be completable in one loop iteration (one context window)
- If a task is too large, split it into subtasks
- Search thoroughly before marking anything as NOT STARTED — it might exist
- Use parallel subagents for reading and searching codebase (up to 500 for reads)
- Use a single subagent for writing IMPLEMENTATION_PLAN.md
