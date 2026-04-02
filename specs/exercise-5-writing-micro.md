# Exercise 5: Writing Micro

## Purpose
Get the student to produce English. Not a full IELTS essay — just 2-3 sentences in response to a prompt. Builds confidence and writing fluency in small, daily doses.

## Content

### The Prompt
- A short question or scenario requiring a 2-3 sentence response
- Related to the day's theme/article (gives context, reduces "blank page" anxiety)
- Examples:
  - "The article discusses how cities are adapting to climate change. In 2-3 sentences, describe one change you think your city should make and why."
  - "Do you agree that technology has made people less social? Write 2-3 sentences explaining your view."
  - "Imagine you are writing to a friend about this topic. Summarize the main idea in 2-3 sentences."
- Prompt should be specific enough that the student knows what to write, but open enough for personal expression

### Constraints
- Minimum: 15 words (prevent empty/trivial submissions)
- Maximum: 100 words (keep it micro — this isn't an essay)
- Word count shown live as the user types

## UI/UX

1. Prompt displayed at top
2. Textarea below with live word counter
3. Word counter changes color: gray (under min) → green (in range) → orange (approaching max)
4. "Submit" button enabled when word count is within range
5. Clean, focused — no distractions

## Feedback

AI evaluates the response on 3 dimensions (not IELTS band scores — too heavy for 2 sentences):

1. **Clarity**: Is the meaning clear? (✓ / needs work)
2. **Grammar**: Any errors? (list specific corrections with explanations)
3. **Vocabulary**: Word choice — highlight good usage, suggest upgrades for basic words

### Feedback format:
- A short overall comment (1-2 sentences, encouraging tone)
- Grammar corrections shown as: "You wrote: [X] → Better: [Y] — because [reason]"
- One vocabulary suggestion: "Good use of 'significant'!" or "'Good' → try 'beneficial' here"
- If the response is in Spanish or not English, gently redirect: "Intenta responder en inglés :)"

## Scoring
- 3 points maximum (1 per dimension: clarity, grammar, vocabulary)
- Each dimension: 1 = good, 0 = needs work
- Score stored as integer (0-3)
- This is the most "gentle" scoring — the goal is to encourage writing, not punish mistakes
