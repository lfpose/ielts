# Improvements v5 — Critical Bug Fixes

**Source**: Debug session (2026-04-13)
**Goal**: Fix 3 bugs that make the app unusable: admin page blank, admin buttons show JSON, daily boards not auto-generating.

---

## 1. Bug: Admin Page Shows Blank

### Problem
Visiting `/admin` with no session shows a blank page instead of the login form. The user has no way to reach the admin dashboard.

### Root Cause
In `src/routes/admin.ts` (line ~101), the auth middleware intercepts unauthenticated requests and calls `return c.html(renderAdminLogin())`. The login template in `src/templates/admin-login.ts` appears valid (47 lines, proper HTML structure). Need to debug why the response body is empty or not rendering.

### Debug Steps
1. Check the `renderAdminLogin()` return value — does it return a string or undefined?
2. Check if the middleware's `c.html()` call is actually reached (add a console.log)
3. Check browser devtools: is the response status 200 with empty body, or something else?
4. Check if there's a path-matching issue where the route is mounted

### Fix
- Ensure `renderAdminLogin()` always returns a complete HTML string
- Verify the auth middleware sends the response correctly for the root path
- Add an explicit `GET /login` route as a safety net
- Test: visiting `/admin` unauthenticated → see styled login form

---

## 2. Bug: Admin Buttons Return Raw JSON

### Problem
Clicking "Generate", "Regenerate", "Send Email", and other action buttons navigates to a blank page showing raw JSON like `{"success": true, "boardId": 5}`.

### Root Cause
In `src/routes/admin.ts`, these POST endpoints return `c.json()`:
- `POST /generate` (line ~179) → `c.json({ success: true, boardId, topic })`
- `POST /regenerate` (line ~226) → `c.json({ success: true, boardId, topic })`
- `POST /exercise/:id/regenerate` (line ~305) → `c.json({ success: true })`
- `POST /email` (line ~353) → `c.json({ success: true, results })`
- `POST /users/add` (line ~403) → `c.json({ success: true })`
- `POST /users/:id/remove` (line ~415) → `c.json({ success: true })`
- `POST /topics/reorder` (line ~480) → `c.json({ success: true })`
- `POST /topics/add` (line ~497) → `c.json({ success: true })`
- `POST /topics/remove` (line ~519) → `c.json({ success: true })`
- `POST /topics/force` (line ~541) → `c.json({ success: true })`

But the admin template uses plain HTML `<form method="POST">` submissions. The browser navigates and renders whatever comes back. `/admin/settings` (line ~367) already does it correctly with `c.redirect("/admin")`.

### Fix
Change all admin action POST endpoints to redirect back to `/admin`:
```typescript
// Change from:
return c.json({ success: true, boardId: board.id, topic });
// To:
return c.redirect("/admin");
```

Also change error responses to redirect with an error query param or just redirect without it — the dashboard can show current state on reload.

Keep the `/api/*` GET endpoints as JSON (those are data endpoints, not form targets).

---

## 3. Bug: Daily Board Not Auto-Generating

### Problem
The cron job runs at 04:00 UTC but no boards are being created. Database has 0 boards generated via cron.

### Root Cause
In `src/index.ts` (line ~112):
```typescript
cron.schedule("0 4 * * *", runDailyJob);
```

`runDailyJob()` is async, but the promise is not caught. When the Anthropic API call fails (or any other async error), the rejection is silently swallowed. The retry loop (line ~47) also catches and returns silently after MAX_RETRIES without propagating.

### Fix
1. Wrap the cron callback with error handling:
```typescript
cron.schedule("0 4 * * *", () => {
  runDailyJob().catch(err => {
    console.error("[CRON FATAL] Daily job failed:", err);
  });
});
```

2. Same for the `RUN_NOW` path (line ~162):
```typescript
if (process.env.RUN_NOW === "true") {
  runDailyJob().catch(err => {
    console.error("[RUN_NOW FATAL]", err);
  });
}
```

3. Add startup diagnostic logging:
```typescript
const todayBoard = getTodaysBoard();
console.log(`[STARTUP] Today's board: ${todayBoard ? todayBoard.topic : "NOT GENERATED"}`);
```

4. Make the retry loop's final failure louder — log the full error stack, not just the message.

---

## Priority Order

1. **Bug #1** (admin blank) — can't manage the app without admin access
2. **Bug #2** (JSON responses) — can't use admin controls
3. **Bug #3** (auto-generation) — the core daily loop is broken
