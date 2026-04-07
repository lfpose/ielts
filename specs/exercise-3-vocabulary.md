# Exercise 3: Vocabulary Game

## Purpose
Expand the user's vocabulary. Introduce new or less common words and make the user learn their meaning through context and matching. This is about LEARNING new words, not testing known ones.

## Content

### The Words
- 6 words per exercise
- Sourced from the day's long reading article (or the theme)
- Target: practical, useful vocabulary at B1-B2 level — words a Spanish speaker would encounter in everyday English but might not know confidently
  - Good: "sustainable", "shortage", "affordable", "deadline", "achieve", "struggle"
  - Too easy: "house", "important", "because"
  - Too hard: "ubiquitous", "mitigate", "unprecedented", "albeit", "democratization", "unpalatable"
- The goal is to build a FUNCTIONAL vocabulary, not an academic one. Think words you'd find in a newspaper or conversation, not a PhD thesis.
- Each word comes with:
  - A definition (clear, simple English — not dictionary jargon)
  - The sentence from the article where it appeared (context)

### The Game
- **Matching format**: 6 words on one side, 6 definitions on the other, shuffled
- User connects each word to its definition
- This is a drag-and-drop or tap-to-match interaction

## UI/UX

1. Two columns: words (left), definitions (right)
2. User taps a word, then taps a definition to connect them (or drag-and-drop on desktop)
3. Connected pairs are visually linked (line, color, or moved together)
4. User can undo a connection by tapping it again
5. "Submit" button when all 6 are connected
6. Should feel like a mini-game, not a test

## Feedback

After submission:
- Correct matches highlighted green, incorrect red
- For incorrect matches: show the correct definition + the context sentence from the article
- Score: "X/6"

## Post-Exercise: Word Bank
- All 6 words (with definitions) are saved to the user's personal **word bank**
- The word bank is a growing list across days
- Words from the word bank may reappear in future Fill the Gap exercises (Exercise 4)
- This creates a learning loop: Vocab introduces → Fill the Gap reinforces

## Scoring
- 6 points maximum
- Score stored as integer (0-6)
