# Design Language

Editorial newspaper aesthetic with warm Braun/Dieter Rams undertones. Light, clean, human — not techy. Mobile-first.

## Core Principles
- Feels like a printed newspaper, not a web app
- Warm off-whites, serif typography, generous whitespace
- Red as the only accent color — used sparingly for emphasis
- No harsh borders. Use weight, size, and spacing for hierarchy.
- Dark mode supported (system preference + manual toggle)

## Typography

Load from Google Fonts:
- **Playfair Display** (400, 700, 900) — headings, masthead, exercise titles
- **Lora** (400, 600) — body text, article passages, reading content
- **Inter** (400, 500, 600, 700) — UI labels, buttons, navigation, scores
- **JetBrains Mono** (400, 500) — timestamps, scores, data

### Hierarchy
- Masthead/page title: Playfair Display 900, 36-48px, tight letter-spacing (-1px)
- Section headers: Inter 600-700, 10px, uppercase, letter-spacing 3px
- Exercise titles: Playfair Display 700, 20-24px
- Body/passages: Lora 400, 15-16px, line-height 1.7, justified
- UI/controls: Inter 500-600, 13-14px
- Scores/data: JetBrains Mono 500, 12-14px

## Color Palette

### Light Mode (default)
```
--bg: #F9F9F7          /* warm off-white */
--fg: #111             /* near-black */
--muted: #E5E5E0       /* subtle borders, dividers */
--red: #CC0000         /* accent — links, highlights, errors */
--n100: #F5F5F5        /* card backgrounds */
--n500: #737373        /* secondary text */
--n600: #525252        /* tertiary text */
```

### Dark Mode
```
--bg: #111
--fg: #E8E8E4
--muted: #2A2A28
--red: #FF4444
--n100: #1A1A1A
--n500: #888
--n600: #AAA
```

### Heatmap (GitHub-style greens)
```
Light: #EBEDF0, #9BE9A8, #40C463, #30A14E, #216E39
Dark:  #1A1A1A, #0E4429, #006D32, #26A641, #39D353
```

### Score colors
- Correct: `#2D6A4F` (dark green, not neon)
- Incorrect: `var(--red)`
- Neutral/pending: `var(--n500)`

## Layout

### Container
- Max width: `720px` (exercise pages), `960px` (dashboard)
- Padding: `32px 24px` (desktop), `16px 12px` (mobile)
- Centered with `margin: 0 auto`

### Breakpoints
- Mobile: `max-width: 600px` — single column, reduced font sizes
- Desktop: `min-width: 601px` — multi-column where appropriate

### Background
Subtle diagonal dot pattern at 4% opacity on all pages:
```
url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4'%3E%3Cpath fill='%23111' fill-opacity='.04' d='M1 3h1v1H1V3zm2-2h1v1H3V1z'/%3E%3C/svg%3E")
```

## Component Patterns

### Dashboard — Exercise Cards
- 5 cards, stacked vertically (full width on mobile, can be 2+3 grid on desktop)
- Each card:
  - Left: exercise type label (uppercase Inter, colored badge)
  - Center: exercise title or description
  - Right: status — "Disponible" or score badge ("4/5")
- Available cards: `border: 1px solid var(--muted)`, hover: `border-color: var(--fg)`
- Completed cards: subtle green-tinted background, score shown
- Card click → navigates to exercise page

### Exercise Pages
Each exercise type has a dedicated page layout. Common elements:
- Back arrow + "Volver al tablero" link at top
- Exercise type label (kicker) + title
- Content area (varies by type)
- Submit button at bottom: solid `var(--fg)` background, `var(--bg)` text, uppercase Inter
- After submit: feedback section appears below, button changes to "Volver al tablero"

### Exercise Type: Long Reading
- Article title (Playfair Display 700, 24px)
- Passage in Lora, justified, 15px, generous line-height
- Divider
- Questions numbered 1-5, each in its own card:
  - Question text in Inter 500
  - Radio buttons styled as tappable pills/chips (not default browser radios)
  - T/F/NG: three horizontal buttons
  - Multiple choice: vertical stack of option buttons
- After submit: each question shows ✓ or ✗ with correct answer and explanation

### Exercise Type: Short Reading
- Same as long reading but shorter passage, 2 questions

### Exercise Type: Vocabulary Match
- Two columns on desktop, stacked with tap-to-pair on mobile
- Words column (left): styled as cards/chips with the word in bold
- Definitions column (right): styled as cards with definition text
- Interaction: tap a word → it highlights → tap a definition → they connect (visual line or shared color)
- Connected pairs: both cards share a colored border/background
- 6 soft colors for the 6 pairs (assigned on connection, not predetermined)
- Undo: tap a connected pair to disconnect
- All vanilla JS — no framework needed

### Exercise Type: Fill the Gap
- Paragraph displayed with numbered blanks as underlined empty slots
- Word bank below: 7 word chips in a flex-wrap row
- Interaction: tap a blank → it highlights → tap a word chip → word fills the blank, chip dims
- Tap a filled blank to return the word to the bank
- All vanilla JS

### Exercise Type: Writing Micro
- Prompt text in a highlighted box (Lora italic or Inter, subtle background)
- Textarea: clean, minimal border (bottom-only or thin all-around)
- Live word counter below textarea: "23 palabras" — gray when under 15, green 15-100, orange >90
- Submit enabled when word count is 15-100

### Feedback States
- Correct answer: green background tint, ✓ icon
- Incorrect answer: red/pink background tint, ✗ icon, correct answer shown
- Writing feedback: structured card with comment, corrections as before→after pairs
- Overall: encouraging tone, Spanish UI labels ("Correcto", "Incorrecto", "Tu respuesta", "Respuesta correcta")

### Activity Heatmap
- GitHub-style contribution grid
- Cell size: 12-14px squares with 3px gap
- 16 weeks (112 days), 7 rows (Mon-Sun)
- Tooltip on hover: date + score
- Color intensity mapped to daily total (0-21 points)

### Progress Bar (Dashboard)
- 5 segments, one per exercise
- Filled segments: `var(--fg)` or green
- Empty segments: `var(--muted)`
- Shows "3/5 completados" text

### Streak Display
- Large number (JetBrains Mono, 32px, bold)
- Label below: "días consecutivos" (Inter, 11px, uppercase)
- Fire emoji or warm-colored icon next to number

## Dark Mode Toggle
- Small button in page header/footer
- Stores preference in localStorage
- `data-theme` attribute on `<html>`
- Respects `prefers-color-scheme` as default

## Language
- All UI text in Spanish: buttons, labels, navigation, feedback labels
- Exercise content (passages, questions, vocabulary) in English
- Error messages in Spanish
