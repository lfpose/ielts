# Exercise 6: Mini Writing (Una Frase)

## Purpose
The absolute lowest-friction writing task. Get the student to produce ONE English sentence. Remove the "blank page" anxiety completely — give them a sentence frame, a word to use, or a situation to respond to. This should take under 1 minute.

## Content

### The Prompt
One of these formats (vary daily):
- **Complete the sentence**: "If I could visit any country, I would choose _____ because _____."
- **Use the word**: Write one sentence using the word "sustainable".
- **Reply to a message**: Someone says: "Hey, what did you think of the movie?" — Write a one-sentence reply.
- **Describe**: Describe your morning routine in one sentence.
- **Translate the idea**: Express this idea in English: [simple Spanish sentence]

The prompt should always be related to the day's topic when possible.

### Constraints
- Minimum: 5 words
- Maximum: 30 words
- Just ONE sentence — not a paragraph

## UI/UX

1. Prompt displayed in a compact card (same red left-border style as Writing Micro)
2. Label: "UNA FRASE" (kicker)
3. Single-line text input (NOT a textarea) — reinforces "just one sentence"
4. Live word counter: "X palabras" 
5. Submit enabled when 5-30 words
6. Should feel instant — tap, type, done

## Feedback

AI evaluates lightly (fast, cheap):
- **Grammar**: correct or 1 correction shown
- **Word usage**: if the prompt asked to use a specific word, did they use it correctly?
- Short encouraging comment in Spanish

### Feedback format:
- "Tu oración: [what they wrote]"
- If correct: "Bien dicho." + optional vocabulary upgrade suggestion
- If grammar error: "Mejor: [corrected sentence]" with brief reason

## Scoring
- 1 point maximum (pass/fail)
- 1 = grammatically acceptable sentence that addresses the prompt
- 0 = off-topic, not English, or major grammar issue
- Score stored as integer (0-1)

## Position in Daily Board
- Slot 6 (after Fill the Gap, before Writing Micro)
- Dashboard: appears in the "EN BREVE" briefs section
