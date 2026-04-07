# Improvements v3 — Editorial Newspaper Redesign

**Source**: Visual feedback session (2026-04-05)
**Goal**: Make the dashboard look and feel like a real printed newspaper front page, not a grid of equal cards. Big stories get big space. Small stories get column briefs. No tech-app chrome.

---

## 1. Dashboard — Editorial Masonry Layout

### 1.1 Philosophy

Stop thinking in "cards". Think in **stories**. A newspaper front page has:
- One big **feature story** (takes ~60% of the page, has an image)
- A **secondary column** with 1-2 shorter stories
- A **briefs section** at the bottom for minor items
- **Section labels** that read like editorial headers, not UI labels

Exercise mapping (7 exercises):
| Exercise | Newspaper role | Visual weight |
|----------|---------------|---------------|
| Long Reading | Feature story | Big — ~58% of main area, with image |
| Short Reading | Secondary story | Medium — right column top |
| Vocabulary Match | Column item | Medium — right column middle |
| Word Search | Column item | Medium — right column bottom |
| Fill the Gap | Brief | Small — bottom row |
| Mini Writing | Brief | Small — bottom row |
| Writing Micro | Brief | Small — bottom row |

### 1.2 Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ VOL. 1 · DOMINGO, 5 DE ABRIL DE 2026      Hola, María · 🔥 7│
│                  THE IELTS DAILY                              │
│              READ · WRITE · IMPROVE · REPEAT                 │
├──────────────────────────────────────────────────────────────┤
│  TEMA DEL DÍA ─────────────────────── ○ ○ ○ ○ ○             │
│                                                              │
│              VOLCANIC ERUPTIONS                              │
│     How lava and ash reshape the natural world               │
├────────────────────────────┬─────────────────────────────────┤
│                            │                                 │
│  [dithered image]          │  ANÁLISIS BREVE                 │
│                            │  ────────────                  │
│  LECTURA PRINCIPAL         │  Renewable Energy Solutions     │
│  ─────────────────         │  Solar and wind power are       │
│  The Impact of Volcanic    │  growing rapidly as...          │
│  Eruptions on Climate      │                                 │
│                            │  ──────────────────────────── │
│  Lava flows and ash clouds │                                 │
│  are transforming...       │  VOCABULARIO                    │
│                            │  ────────────                  │
│  Comenzar lectura →        │  emissions · renewable ·        │
│                            │  infrastructure · transition    │
│                            │  Juego de emparejamiento →      │
├────────────────────────────┴─────────────────────────────────┤
│  EN BREVE ──────────────────────────────────────────────────│
│  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  │ COMPLETA LOS ESPACIOS    │  │ MICRO ESCRITURA           │ │
│  │ Fill blanks in context   │  │ Responde en 2-3 oraciones │ │
│  │ Comenzar →               │  │ Comenzar →                │ │
│  └──────────────────────────┘  └──────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│  EDICIONES ANTERIORES                                        │
│  Sáb 4 abr · Climate · 4/5    Vie 3 abr · Space · 5/5      │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 Masthead / Header Bar

Replace the current 3-row masthead with:

**Edition line** (top, Inter 500, 10px, uppercase, letter-spacing 3px):
```
VOL. 1 · DOMINGO, 5 DE ABRIL DE 2026                   Hola, María · 🔥 7 días
```
- Left: volume + date
- Right: greeting + streak inline (🔥 7 días, or "Sin racha" muted if 0)
- This is the ONLY place streak appears — not in the body

**Masthead** (Playfair Display 900, 52px, centered):
```
The IELTS Daily
```

**Tagline** (Inter 500, 10px, uppercase, letter-spacing 4px, muted):
```
READ · WRITE · IMPROVE · REPEAT
```

Then a thick double rule: a 3px line + 2px gap + 1px line (classic newspaper style).

### 1.4 Topic Banner

Full-width band between masthead and content:

```
TEMA DEL DÍA ──────────────────────────────── ○ ● ○ ○ ○
```
- Left: "TEMA DEL DÍA" kicker (Inter 600, 10px, uppercase, red)
- Center: a thin horizontal rule fills the space
- Right: 5 small circles for progress (filled = completed, outline = not yet)
  - This is the ONLY progress indicator — no bar, no count text

Below: big topic headline centered
- Topic name: Playfair Display 900, 40-48px, centered, tight tracking
- Subheadline: a short editorial subtext generated with the content (see section 3)

### 1.5 Main Content: Two Columns

**Left column (~58% width):**

Feature story = Exercise 1 (Long Reading):
- Dithered image fills full column width (see section 2 for image)
- Below image: thin rule
- Kicker: "LECTURA PRINCIPAL" (Inter 600, 9px, uppercase, accent navy color, letter-spacing 3px)
- Headline: article title in Playfair Display 700, 26px
- Lead: first 2-3 sentences of passage, Lora 400, 14px, muted
- CTA link: "Comenzar lectura →" (Inter 600, 12px, red)
  - If completed: replace with score badge "4/5 · ✓ Completado" (green)
- Column rule on the right edge of this column

**Right column (~42% width):**

Top item = Exercise 2 (Short Reading):
- Kicker: "ANÁLISIS BREVE" (same style as above, forest green)
- Title: Playfair Display 700, 18px
- Lead: 2 lines of excerpt, Lora 14px
- CTA: "Leer →" or score if completed
- Thin horizontal rule below

Bottom item = Exercise 3 (Vocabulary):
- Kicker: "VOCABULARIO" (purple accent)
- Body: word preview list — comma-separated words in Inter 500, 13px, italic
- Sub: "Juego de emparejamiento · 6 palabras"
- CTA: "Jugar →" or score if completed

### 1.6 Bottom Row: "EN BREVE"

Section divider: "EN BREVE ─────────────────────" (red, Inter 600, 10px)

Two equal columns:

Exercise 4 (Fill the Gap):
- Kicker: "COMPLETA LOS ESPACIOS" (amber)
- 1-line description: "Elige las palabras correctas para el párrafo"
- CTA: "Comenzar →"

Exercise 5 (Writing):
- Kicker: "MICRO ESCRITURA" (dark red)
- 1-line description: "Escribe 2-3 oraciones sobre el tema de hoy"
- CTA: "Escribir →"

### 1.7 "Available" — Remove the Label

No card should say "Disponible". Available state = default neutral state. The card content is the signal.

Completed state signals:
- Score badge inline: "4/5 ✓" in green next to the CTA
- CTA changes from "Comenzar →" to "Ver resultados →"
- Feature card: replace image overlay with a subtle green check tint

### 1.8 Archive Section (below fold)

Compact horizontal list, Inter 400, 12px:
```
EDICIONES ANTERIORES
Sáb 4 abr · Climate Change · 4/5    Vie 3 abr · Space · 5/5    Jue 2 abr · ...
```
Past dates are links. Current day is always at top.

---

## 2. Topic Image — Dithered Web Photo

Replace ASCII art entirely with a real photo fetched during content generation, displayed with a CSS halftone/dithering effect.

### 2.1 Image Source: Wikipedia API (no key needed)

During content generation in `generateBoard()`, after picking the topic, fetch a relevant image:

```
GET https://en.wikipedia.org/api/rest_v1/page/summary/{topic-keyword}
→ response.thumbnail.source (URL of Wikipedia article's featured image)
```

Fallback chain:
1. Wikipedia summary thumbnail
2. Wikipedia Opensearch → first result → summary thumbnail  
3. If nothing found: use a CSS gradient placeholder (no broken images)

Store the image URL in `boards.illustration` (repurpose the field — remove ASCII art generation entirely).

### 2.2 CSS Dithering / Halftone Effect

Apply purely in CSS — no image processing needed:

```css
.feature-image {
  position: relative;
  overflow: hidden;
  background: var(--fg);  /* dark fallback */
}
.feature-image img {
  width: 100%;
  display: block;
  filter: grayscale(1) contrast(1.6) brightness(0.9);
  mix-blend-mode: multiply;
}
.feature-image::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #000 1px, transparent 1px);
  background-size: 3px 3px;
  opacity: 0.25;
  pointer-events: none;
}
```

This creates:
- Grayscale + high contrast = newspaper-like photo
- Dot overlay = halftone/dithering texture
- Result looks like a printed newspaper photo

Dark mode: invert the blend to `screen` mode.

### 2.3 Image Aspect Ratio

- Force `aspect-ratio: 16/9` on the image container
- `object-fit: cover` so any Wikipedia image works regardless of original ratio

### 2.4 Content Generation Change

In `src/services/content.ts`:
- Remove the ASCII illustration generation (the Claude API call for ASCII art)
- Replace with a `fetchTopicImage(topic: string): Promise<string>` function
- This function calls the Wikipedia API and returns a URL (or empty string)
- Pass the URL to `createBoard()` as the illustration field

---

## 3. Topic Subheadline

The content pipeline should also generate a short editorial subheadline for the topic (1 sentence, journalistic style, summarizes the day's angle).

Add to `generateBoard()`: generate a `subheadline` string — one sentence in newspaper style, e.g. "How lava flows and ash clouds are reshaping the natural world's most dramatic landscapes."

Store in board. Display below the big topic headline in the topic banner. Lora 400 italic, 16px, centered, muted.

---

## 4. Mobile Layout

On mobile (< 700px):
- Edition line wraps to 2 rows (date top, greeting bottom)
- Topic banner: headline smaller (32px), no subheadline (or smaller/hidden)
- No two-column split — everything stacks
- Feature card: image on top, then kicker + title + lead
- Short reading, vocabulary: normal stacked cards
- Briefs: 2-col still works at mobile (50% each, minimal)
- Archive: horizontal scroll

---

## 5. Typography Refinements

- Add `font-variant: small-caps` to section kickers (LECTURA PRINCIPAL etc.)
- Column rules between left/right columns: `border-right: 1px solid var(--muted)`
- Section dividers: thin rule with text: use `display: flex; align-items: center; gap: 12px` — text left, `<hr>` stretches right
- Dates in archive: small-caps
- All CTAs ("Comenzar →", "Leer →"): Inter 600, 12px, red, no underline by default, underline on hover

---

## 6. What to Remove

- The current streak widget box (the bordered box with 0/0 and heatmap) — **delete entirely**
- The separate "ESTADÍSTICAS" button link — move stats link to the masthead edition line (small, muted, right side)
- The current 5-segment progress bar — replaced by 5 dots in the topic banner
- All "Disponible" text labels
- All ASCII art generation code
