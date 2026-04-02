# Migration from Current App

The current app has working infrastructure but the exercise model is being redesigned. This is a refactor — keep the good parts, replace the exercise system.

## What to KEEP (refactor in place)

### Server & infrastructure
- `src/index.ts` — Hono server entry, cron scheduling. Refactor the job to generate boards instead of old daily_practices.
- `fly.toml` — deployment config, unchanged
- `Dockerfile` — unchanged
- `package.json` — keep all dependencies. Add none.

### Database layer
- `src/db.ts` — Keep the file, refactor the schema. Drop old tables, create new ones (see database spec). Keep the `settings` table and `email_log` table as-is. Keep utility functions like `getSetting`, `logEmail`.

### Services
- `src/services/email.ts` — Keep, simplify the template (see email spec)
- `src/services/article.ts` — **Delete entirely.** No more RSS. Content is AI-generated.
- `src/services/questions.ts` — **Rewrite.** New generation functions for each exercise type.

### Auth
- Keep the existing user/token model. Add cookie-based session on top (see auth spec).

## What to DELETE

- `src/services/article.ts` — RSS pipeline, article extraction. Replaced by AI generation.
- `src/templates/newspaper.ts` — Old dashboard template. Replaced by new dashboard.
- `src/templates/practice.ts` — Old practice page (one big form). Replaced by per-exercise-type pages.
- `src/templates/stats.ts` — Rebuild with new scoring model (21 pts/day, per-exercise tracking).
- `src/templates/email.ts` — Replace with simpler email template (see email spec).
- Old RSS-related dependencies can stay in package.json (removing them risks breaking the build for no gain).

## What to BUILD NEW

- `src/services/content.ts` — AI content generation pipeline (topic selection, exercise generation)
- `src/services/grading.ts` — Deterministic grading for exercises 1-4, AI grading for exercise 5
- `src/templates/dashboard.ts` — New daily board dashboard
- `src/templates/exercise-*.ts` — One template per exercise type (5 templates)
- `src/templates/landing.ts` — Login/landing page
- `src/templates/stats.ts` — Rebuilt stats page
- `src/templates/email.ts` — Simplified email
- `src/templates/admin.ts` — Admin dashboard (refactored from dashboard.ts)
- `src/word-bank-seed.ts` — Initial 1000 common English words

## Database Migration

Drop and recreate. This is a pre-launch app with one test user — no data worth preserving.

1. Drop all existing tables
2. Create new schema (see database spec)
3. Re-create users from settings (or admin adds them manually)
4. Populate word_bank_seed table

## File Reorganization

Current structure:
```
src/
├── index.ts
├── db.ts
├── dashboard.ts        → delete (admin routes move to routes/admin.ts)
├── services/
│   ├── article.ts      → delete
│   ├── email.ts        → keep, simplify
│   └── questions.ts    → rewrite as content.ts + grading.ts
└── templates/
    ├── newspaper.ts    → delete, replace with dashboard.ts
    ├── practice.ts     → delete, replace with per-type templates
    ├── stats.ts        → rebuild
    └── email.ts        → simplify
```

Target structure:
```
src/
├── index.ts              # Server entry, cron
├── db.ts                 # Schema, queries
├── routes/
│   ├── student.ts        # /s/:token, /s/:token/exercise/:id
│   ├── admin.ts          # /admin/*, /api/*
│   └── auth.ts           # /, /login
├── services/
│   ├── content.ts        # AI content generation
│   ├── grading.ts        # Exercise grading
│   └── email.ts          # Email delivery
├── templates/
│   ├── landing.ts        # Login page
│   ├── dashboard.ts      # Daily board
│   ├── exercise-long-reading.ts
│   ├── exercise-short-reading.ts
│   ├── exercise-vocabulary.ts
│   ├── exercise-fill-gap.ts
│   ├── exercise-writing.ts
│   ├── stats.ts          # Stats page
│   ├── admin.ts          # Admin dashboard
│   └── email.ts          # Email HTML
└── word-bank-seed.ts     # 1000 common English words
```
