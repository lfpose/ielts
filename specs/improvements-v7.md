# V7 Improvements — IELTS Daily

## Context

The current app has several user-facing bugs and UX gaps discovered after v6 shipped, plus two feature requests to reduce API costs and improve visual polish.

---

## Bug 1 — Word Search: No Way to End

**Symptom**: Once the word search loads, users can find words but have no way to submit/complete the exercise unless they find ALL words. There is no "Finish" or "Give Up" button. If they leave the page, progress is lost and the exercise is not marked done.

**Root cause**: `exercise-word-search.ts` only calls `onAllFound()` when `foundWords.length === WORDS.length`. No path to submission on partial completion.

**Fix**: Add a "Terminar ejercicio" button visible from the start (or after first word found). Clicking it submits whatever words have been found so far. Score is prorated: (found / total) × max_score.

---

## Bug 2 — Hangman: Completing by Losing Resets to Interactive

**Symptom**: When the user loses in Hangman, the page reloads back to the interactive state (letters, gallows) instead of showing the result screen. "Nothing is saved."

**Root cause**: `endGame(false)` in `exercise-hangman.ts` fires `window.location.reload()` after 1800ms whether the fetch succeeded or failed. If the server returns an error (any 5xx, body parse failure, etc.), no submission is created, so on reload `submission` is null and the interactive mode renders again.

**Secondary root cause**: The catch handler also reloads unconditionally, hiding the error.

**Fix**:
- On `endGame`, don't reload until fetch confirms `{ ok: true }` or a submission was persisted. 
- If the fetch fails, show an error toast and a manual "Submit result" retry button — do NOT reload to interactive.
- In the feedback view, make it visually unambiguous (big win/lose banner, clearly different from interactive layout).

---

## Bug 3 — Short Reading (and likely others): Submit Does Nothing

**Symptom**: User clicks "Enviar respuestas", button briefly shows "Enviando...", then resets to original state. No feedback, no animation, nothing.

**Root cause**: The catch handler silently re-enables the button:
```js
.catch(function() { btn.disabled = false; btn.textContent = 'Enviar respuestas'; });
```
When the server returns a 500 (or `r.json()` throws), the user sees zero indication of the failure.

**Secondary potential cause**: The server may be crashing during grading for some exercises due to malformed content or grader bugs. Without visible error feedback this is invisible.

**Fix**: Every exercise template must show a visible error toast (see Bug 4) in the catch handler instead of silent reset.

---

## Bug 4 — No User Feedback Toasts

**Symptom**: Across all exercises, success and failure states are communicated only via page reload or silent catch. Users don't know if a submission worked, if the server is slow, or if something broke.

**Fix**: Implement a lightweight toast notification system (Sonner-inspired) used by all exercise templates:
- Success: green toast "✓ Enviado" on successful submission
- Error: red toast "✗ Error al enviar — intenta de nuevo" on catch, with the error message if available
- Loading: already handled by spinner animations, but toast should also appear during long AI grading
- Toast auto-dismisses after 4s, closeable by click
- Single `showToast(message, type)` helper injected into each exercise template's `<script>` block — no external dependency, ~30 lines of vanilla JS + CSS

---

## Feature 5 — OpenRouter for Cheaper AI Grading

**Motivation**: Claude Sonnet is expensive for grading. Grading exercises (short writing, number-to-words) doesn't require the best model — a fast cheap model works. Content generation (board, word search grid) needs quality and can stay on Sonnet.

**Approach**:
- Add `OPENROUTER_API_KEY` env var
- Create `src/services/openrouter.ts`: thin client wrapping OpenRouter's OpenAI-compatible API (`https://openrouter.ai/api/v1`)
- Grading functions that call AI (`gradeWritingMicro`, `gradeMiniWriting`, `gradeNumberWords`) switch to OpenRouter with a configurable cheap model (default: `google/gemini-flash-1.5` or `qwen/qwen3-235b-a22b:free`)
- Content generation stays on Anthropic Claude Sonnet (quality matters for daily board)
- Model can be configured via `OPENROUTER_GRADING_MODEL` env var, defaulting to `google/gemini-flash-1.5`
- If `OPENROUTER_API_KEY` is unset, fall back to Anthropic (current behavior) so existing deploys aren't broken

---

## Feature 6 — Pretext Text Animations

**Library**: https://github.com/chenglou/pretext — a zero-dependency text scramble/reveal animation library.

**Usage**: Apply to select high-visibility text in the student-facing UI:
- Dashboard: topic title reveals with scramble effect on page load
- Exercise pages: the main heading (e.g. "Long Reading", "Hangman") scrambles in on load
- Feedback reveal: when AI feedback appears after submission, the score line animates in

**Implementation**: 
- Inline the minified pretext script (it's tiny, ~2KB) into the relevant templates — no build step needed
- Initialize with `pretext(element, { ... })` on `DOMContentLoaded`
- Only apply to 2-3 elements per page to keep it tasteful, not overwhelming

---

## Feature 7 — Improved Image Dithering

**Current**: Simple CSS radial-gradient dot overlay at 3px × 3px, opacity 0.25 over a grayscale+contrast image.

**Goal**: Stronger, more intentional retro-newspaper dithering aesthetic that matches the glass morphism admin and the IELTS Daily brand.

**Approach**:
- Apply an SVG `<feTurbulence>` + `<feColorMatrix>` filter to create ordered noise on the image
- Combine with a CSS `image-rendering: pixelated` at reduced resolution (scale down to ~200px wide, scale back up) to get hard pixel edges
- Use a Bayer 4×4 ordered dither pattern via a repeating CSS `background-image: url("data:image/svg+xml,...")` overlay
- Dark theme: blend mode `screen`, light theme: `multiply`
- Result should look like a 2-bit newspaper halftone print

---

## Feature 8 — Clickable Exercise Section Cards

**Current**: Each exercise section in the dashboard has a small CTA link ("Comenzar →" or "X/Y · ✓ Completado"). The surrounding card area is NOT clickable.

**Fix**: Wrap the entire exercise card section in a link (or use `onclick="window.location.href=..."`) pointing to the exercise URL. The small CTA link should remain for accessibility but the whole card area should be clickable. Use CSS `cursor: pointer` on the card.

Implementation note: Use a `<a>` wrapper with `display: contents` trick or set `position: relative` on the card with an absolutely-positioned pseudo-element link overlay — the latter avoids nested interactive element warnings.

---

## Out of Scope for V7

- Persisting highlights from the reading highlighter to the DB
- Multiplayer / shared boards
- Mobile app
