# Implementation Plan — IELTS Daily

Generated: 2026-04-13
Status: 3 of 3 tasks complete

## Summary

The app is fully built: 7 exercise types, student routes, admin dashboard, grading, content generation, email — all implemented. However, 3 critical bugs make it unusable: the admin page renders blank (can't log in), admin action buttons return raw JSON instead of redirecting, and the cron job silently fails so no boards auto-generate. This plan fixes all three.

Spec: `specs/improvements-v5.md`

---

## Task Queue

### [V5-1] Fix Admin Blank Page
- **Status**: DONE (2026-04-13)
- **Description**: The `/admin` route shows a blank page when unauthenticated. The auth middleware in `src/routes/admin.ts` (line ~101) calls `c.html(renderAdminLogin())` but the page renders empty. Debug why `renderAdminLogin()` from `src/templates/admin-login.ts` doesn't display. Likely causes: the function returns undefined, the path matching skips the middleware, or the Hono sub-app mounting swallows the response. Fix so that unauthenticated visits to `/admin` show the styled login form.
- **Acceptance Criteria**:
  - [ ] `GET /admin` with no session cookie renders the login form (username + password fields, "Iniciar sesión" button)
  - [ ] `POST /admin/login` with correct `DASH_USER`/`DASH_PASS` sets cookie and redirects to dashboard
  - [ ] `POST /admin/login` with wrong credentials re-renders login with error message
  - [ ] `POST /admin/logout` clears session and redirects to login
  - [ ] `npm run build` passes
- **Files**: `src/routes/admin.ts`, `src/templates/admin-login.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Visit `/admin` in browser → see login form. Log in → see dashboard.

---

### [V5-2] Fix Admin Buttons Returning JSON
- **Status**: DONE (2026-04-13)
- **Description**: All admin POST action endpoints (`/generate`, `/regenerate`, `/exercise/:id/regenerate`, `/email`, `/users/add`, `/users/:id/remove`, `/topics/*`) return `c.json()` responses. Since the admin template uses plain HTML `<form method="POST">` submissions, the browser navigates away and shows raw JSON. Change all action POST endpoints to `return c.redirect("/admin")` after completing their action. The `/admin/settings` endpoint (line ~367) already does this correctly — follow that pattern. Keep `/api/*` GET endpoints as JSON (they're data endpoints, not form targets).
- **Acceptance Criteria**:
  - [ ] `POST /admin/generate` redirects to `/admin` after generating
  - [ ] `POST /admin/regenerate` redirects to `/admin` after regenerating
  - [ ] `POST /admin/exercise/:id/regenerate` redirects to `/admin`
  - [ ] `POST /admin/email` redirects to `/admin` after sending
  - [ ] `POST /admin/users/add` redirects to `/admin`
  - [ ] `POST /admin/users/:id/remove` redirects to `/admin`
  - [ ] `POST /admin/topics/reorder` redirects to `/admin`
  - [ ] `POST /admin/topics/add` redirects to `/admin`
  - [ ] `POST /admin/topics/remove` redirects to `/admin`
  - [ ] `POST /admin/topics/force` redirects to `/admin`
  - [ ] Error cases also redirect (not return JSON errors)
  - [ ] `/api/*` GET endpoints still return JSON (unchanged)
  - [ ] `npm run build` passes
- **Files**: `src/routes/admin.ts`
- **Dependencies**: V5-1 (admin page must be visible to test buttons)
- **Validation**: `npm run build` succeeds. Click "Generate" → stay on admin dashboard, board appears. Click "Send Email" → stay on dashboard.

---

### [V5-3] Fix Cron Auto-Generation
- **Status**: DONE (2026-04-13)
- **Description**: The cron job in `src/index.ts` (line ~112) passes async `runDailyJob` directly to `cron.schedule()` without catching promise rejections. When `generateBoard()` fails (API error, network issue), the rejection is silently swallowed. The retry loop (line ~47) also catches and returns silently. Fix: wrap the cron callback to catch and log errors, wrap the `RUN_NOW` path the same way, add startup diagnostic logging, and make the retry loop's final failure log the full stack trace.
- **Acceptance Criteria**:
  - [ ] Cron callback wrapped: `runDailyJob().catch(err => console.error(...))`
  - [ ] `RUN_NOW=true` path also wrapped with `.catch()`
  - [ ] Startup log shows whether today's board exists: `[STARTUP] Today's board: <topic> | NOT GENERATED`
  - [ ] Retry loop final failure logs full error stack, not just message
  - [ ] If all retries fail, error is clearly logged with `[CRON FATAL]` prefix
  - [ ] `npm run build` passes
- **Files**: `src/index.ts`
- **Dependencies**: None
- **Validation**: `npm run build` succeeds. Run `RUN_NOW=true npm run dev` → board generates (or error is clearly logged if API key missing).

---

## Dependency Graph

```
V5-1 (Admin Blank Page)
└── V5-2 (Admin JSON Buttons) — needs admin visible to test

V5-3 (Cron Fix) — independent
```

## Recommended Build Order

1. V5-1 + V5-3 in parallel (independent fixes)
2. V5-2 (after V5-1, same file but needs admin visible to verify)
