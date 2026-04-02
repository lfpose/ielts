# Exercise 4: Fill the Gap

## Purpose
Reinforce vocabulary the student already knows (or recently learned). The student must USE words in context, choosing the right word for each blank. This is about APPLYING vocabulary, not learning new words.

## Content

### The Paragraph
- A standalone paragraph, 80-120 words
- Topic can relate to the day's theme or be independent
- Written at B2 level
- Contains 5 blanks (gaps), each replacing a single word

### The Word Bank
- 7 words provided (5 correct + 2 distractors)
- Words should be ones the student is expected to know:
  - Common academic words
  - Words from the user's **word bank** (previously learned in Vocabulary exercises)
  - Everyday words that are commonly confused (e.g., "affect" vs "effect")
- Each word is used only once
- Distractors should be plausible (same part of speech, related meaning)

## UI/UX

1. Paragraph displayed with numbered blanks: "The scientist __(1)__ the results..."
2. Word bank displayed below as a row of tappable chips/buttons
3. User taps a blank, then taps a word to fill it (or taps a word then taps a blank)
4. Filled blanks show the selected word inline
5. User can tap a filled blank to remove the word (returns to word bank)
6. "Submit" button when all 5 blanks are filled
7. Unused distractor words remain in the bank — that's expected

## Feedback

After submission:
- Correct fills highlighted green in the paragraph, incorrect red
- For incorrect fills: show the correct word + brief explanation of why it fits
- Score: "X/5"

## Scoring
- 5 points maximum
- Score stored as integer (0-5)
