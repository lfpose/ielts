# Exercise 7: Word Search (Sopa de Letras)

## Purpose
A fun, low-pressure game that reinforces vocabulary. The student finds 4 hidden English words in a letter grid. After finding each word, they see its meaning and an example sentence. This is gamification — it should feel like a puzzle, not a test.

## Content

### The Words
- 4 words per exercise
- Related to the day's topic
- B1-B2 level (same practical vocabulary philosophy as Exercise 3)
- Each 4-8 letters long (short enough to fit in the grid)
- Each word comes with:
  - A simple definition (1 line)
  - An example sentence using the word

### The Grid
- 10x10 letter grid
- 4 words placed in the grid:
  - Horizontal (left-to-right) or vertical (top-to-bottom) only — NO diagonals, NO backwards (keep it accessible)
  - Words cannot overlap
- Remaining cells filled with random lowercase letters
- Grid generation happens server-side during content generation (the grid is stored as part of the exercise content JSON)

### Content JSON shape
```json
{
  "grid": [["s","u","s","t","a","i","n","a","b","l"], ...],
  "words": [
    {
      "word": "sustainable",
      "definition": "able to continue over a long period without causing damage",
      "example": "We need more sustainable energy sources.",
      "startRow": 0,
      "startCol": 0,
      "direction": "horizontal"
    }
  ]
}
```

## UI/UX

### Grid Display
- Square grid of letter cells (each cell ~36px on desktop, ~28px on mobile)
- Letters: Inter 600, 14px, uppercase, centered in each cell
- Cells have subtle borders (1px var(--muted))
- Grid is centered on the page

### Interaction
1. Tap a cell to start selection → cell highlights
2. Tap another cell in the same row or column → all cells between them highlight (forming a word)
3. If the selected letters spell one of the hidden words → word "found" animation:
   - Cells turn green with the word's pair color (same 4-color palette as vocab)
   - Word appears below the grid with its definition and example
   - Small celebration: the word briefly scales up
4. If the selected letters don't match any word → cells flash red briefly, deselect
5. Tap a highlighted cell to deselect

### Found Words Section
Below the grid, found words appear as they're discovered:
- Word in bold (Playfair Display)
- Definition in Inter 400
- Example sentence in Lora italic
- Each card uses a soft accent color (same palette as vocabulary pairs)

### Progress
- "X de 4 encontradas" counter above the grid
- When all 4 found → submit button appears (or auto-submit)

## Feedback

After all 4 words are found:
- Show all 4 words with definitions and examples (even if already shown during play)
- Score: "4/4" (or less if we add a time/attempt limit later — for now, always 4/4 since they must find all to complete)
- "Nuevas palabras guardadas en tu banco" — words added to word bank

## Scoring
- 4 points maximum
- For now: finding all 4 = 4 points (no partial, they must find all to submit)
- Score stored as integer (0-4)

## Post-Exercise
- All 4 words saved to user's word bank (same as vocabulary exercise)
- These words may appear in future Fill the Gap exercises

## Position in Daily Board
- Slot 4 (after Vocabulary Match, before Fill the Gap)
- Dashboard: appears in the right column under Vocabulary, or in the briefs section

## Technical Notes
- Grid generation algorithm (server-side):
  1. Create empty 10x10 grid
  2. For each word, try to place horizontally or vertically at random positions (retry if overlap/conflict)
  3. Fill remaining cells with random letters (a-z)
  4. Store grid + word positions in content JSON
- The grid is deterministic once generated — same grid on every page load
- Selection logic is vanilla JS — track selected cells, check if they form a valid word
