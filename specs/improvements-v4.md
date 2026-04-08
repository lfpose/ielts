# Improvements v4 — User Feedback Round

**Source**: User testing session (2026-04-07)

---

## 1. Topic Queue — Repopulate

The topic queue only has 1 remaining option. The queue should always have at least 20 topics ready.

### Fix
In `src/db.ts` or `src/services/content.ts`, when the topic queue runs low (< 5 remaining), auto-generate new topics via Claude API and insert them. Alternatively, expand the seed list in the initial population to 50+ diverse topics.

The topics should span: science, nature, culture, history, technology, health, geography, food, sports, travel, art, music, environment, space, animals, psychology, economics, architecture, fashion, film.

---

## 2. Admin Login Page

Replace the HTTP Basic Auth browser popup with a proper styled login page.

### Design (shadcn-inspired, server-rendered HTML)
- Centered card on neutral background
- Clean form: email/username input + password input
- "Iniciar sesión" button (dark, full-width)
- Subtle branding: small "The IELTS Daily · Admin" text above
- Card: white bg, subtle shadow (`box-shadow: 0 1px 3px rgba(0,0,0,0.1)`), rounded 8px, max-width 400px
- Inputs: full-width, 40px height, 1px border `#e2e8f0`, rounded 6px, focus ring blue `#3b82f6`
- Button: `#18181b` bg, white text, rounded 6px, 40px height, hover `#27272a`
- Font: Inter throughout

### Flow
- `GET /admin` → if no session cookie, render login page
- `POST /admin/login` → validate against `DASH_USER`/`DASH_PASS` env vars, set admin session cookie, redirect to `/admin`
- Session cookie: `admin_session`, HTTP-only, 24h expiry
- Logout: `POST /admin/logout` → clear cookie, redirect to login

---

## 3. Admin Dashboard — shadcn-Style Redesign

Redesign the admin panel to look like a modern shadcn dashboard. Server-rendered HTML that LOOKS like shadcn components.

### Layout
```
┌──────────┬─────────────────────────────────────────┐
│          │  Header: "IELTS Daily Admin" + Logout   │
│ Sidebar  │─────────────────────────────────────────│
│          │                                          │
│ Today    │  Content area                            │
│ Users    │  (switches based on sidebar selection)   │
│ Topics   │                                          │
│ Email    │                                          │
│ Settings │                                          │
│          │                                          │
│          │                                          │
│          │                                          │
└──────────┴─────────────────────────────────────────┘
```

### shadcn Design Tokens (for admin only)
```css
--admin-bg: #ffffff;
--admin-card: #ffffff;
--admin-border: #e2e8f0;
--admin-muted: #f1f5f9;
--admin-fg: #0f172a;
--admin-muted-fg: #64748b;
--admin-primary: #18181b;
--admin-radius: 8px;
--admin-shadow: 0 1px 3px rgba(0,0,0,0.1);
--admin-font: Inter, system-ui, sans-serif;
```

### Dark mode (admin)
```css
--admin-bg: #09090b;
--admin-card: #18181b;
--admin-border: #27272a;
--admin-muted: #27272a;
--admin-fg: #fafafa;
--admin-muted-fg: #a1a1aa;
--admin-primary: #fafafa;
```

### Component Styles
- **Cards**: white bg, 1px border, rounded 8px, subtle shadow, 24px padding
- **Tables**: clean rows with hover highlight, header row muted bg
- **Buttons**: primary = dark bg + white text, secondary = border-only, destructive = red
- **Inputs**: 40px height, rounded 6px, 1px border, focus ring
- **Badges**: rounded-full pills, colored per status (green=live, yellow=draft, red=error)
- **Sidebar**: fixed left, 240px wide, muted bg, icon + label per item, active = primary bg

---

## 4. Cron Job — Auto-Generate at Midnight CLT

Update the cron schedule to generate the daily board at 00:00 CLT (Chile time).

- CLT = UTC-4 (standard) / UTC-3 (DST, summer)
- Use `0 4 * * *` (UTC) as a safe approximation for midnight CLT
- Or better: use `TZ=America/Santiago` with node-cron if supported
- The cron should auto-generate the board AND send the daily email
- No manual click needed — the admin "Generate" button is for manual override only

### In `src/index.ts`:
```
// Change from:
cron.schedule("0 7 * * *", runDailyJob);
// To:
cron.schedule("0 4 * * *", runDailyJob); // 00:00 CLT (UTC-4)
```

---

## 5. Admin Dark Theme

Add dark mode support to the admin dashboard, matching the shadcn dark palette above.

- Toggle button in admin header (same as student side)
- Store preference in localStorage
- `data-theme="dark"` on admin `<html>`
- All admin components use CSS variables that swap in dark mode

---

## 6. Dashboard Image — Still Broken

The Wikipedia topic image on the student dashboard still shows a blank gray area. This was FIX-1 but wasn't resolved.

### Debug checklist
1. Check what `board.illustration` actually contains in the DB — is it valid JSON with an imageUrl?
2. Check if `fetchTopicImage()` in content.ts actually fetches a URL from Wikipedia
3. Check if the `<img>` tag has the correct `src` attribute
4. Check if Wikipedia images are blocked by CORS or CSP headers
5. Try using the larger Wikipedia image URL (originalimage.source) instead of thumbnail
6. Add `crossorigin="anonymous"` to the `<img>` tag
7. Add a visible CSS fallback when image fails to load (gradient or topic text)

---

## 7. Word Search — Hint System

The word search is too hard when playing blind. Add a progressive hint system.

### Hint 1: Show Target Words
- Below the grid, show a "PALABRAS A BUSCAR" section listing the 4 words
- Just the words, not their positions — the player knows WHAT to find but not WHERE
- This should be the DEFAULT state (always visible)

### Hint 2: Reveal 1 Letter (on demand)
- Small "Pista" button below each unfound word
- Tapping it highlights ONE cell in the grid where that word's letter appears
- Only reveals 1 letter per word, per use
- Visual: the revealed cell gets a soft yellow background pulse
- Optional: limit to 2 hints total per game, or no limit (keep it friendly)

---

## 8. Fill the Gap — Immersive Typing UX

Replace the tap-chip interaction with an inline typing experience.

### Current UX (tap-chip)
Tap a blank → tap a word chip → word fills the blank. Feels disconnected.

### New UX (type-to-fill)
The full paragraph is displayed as ghost text (light gray). The blanks are highlighted inline as editable fields. As the user types each word, it fills in over the ghost text, changing from gray to black.

### Implementation
- Display the full paragraph with blanks as inline `<input>` elements
- Each input is styled to look like part of the paragraph text (same font, same line-height, no visible border)
- The input width auto-sizes to match the correct word length
- Placeholder text shows as light gray dashes: `_ _ _ _ _` (number of chars in the correct word)
- As the user types, text appears in `var(--fg)` color
- Keep the word bank visible below as a REFERENCE (read-only, not tappable) — shows the 7 available words so the user knows their options
- Tab key moves to next blank

### Visual
```
The scientist ________ the results carefully before publishing.
               ↑ cursor here, placeholder shows "_ _ _ _ _ _ _ _"
               
BANCO DE PALABRAS (referencia): analyzed · predicted · ignored · confirmed · ...
```

---

## 9. Reading Highlighter Tool

Add a text highlighting tool to reading exercises (Long Reading and Short Reading).

### Interaction
1. User selects text in the passage (native text selection)
2. A small floating toolbar appears near the selection with 3 color buttons:
   - Yellow (#FEF3C7)
   - Green (#D1FAE5)  
   - Pink (#FCE7F3)
3. Tapping a color applies the highlight (wraps selected text in a `<mark>` with that color)
4. Tapping an existing highlight removes it

### Technical
- Vanilla JS using `window.getSelection()` and `document.execCommand` or Range API
- Highlights are stored in-memory only (lost on page refresh) — no persistence needed for now
- The floating toolbar: position absolute near selection, 3 small round color buttons, disappears on click outside
- Only available on the passage text, not on questions

### Visual
- Highlighted text: background color of chosen highlight, no border, inline
- Toolbar: small pill with 3 colored circles (16px each), subtle shadow, appears 8px above selection
