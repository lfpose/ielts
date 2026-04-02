# Content Pipeline

## Overview
Every day, the system generates a complete "board" of 5 exercises. All exercises share a common theme anchored by the long reading article.

## Generation Flow

1. **Pick a topic/article** — AI generates an original article on a randomly selected topic from a curated category list
2. **Generate Exercise 1** (Long Reading) — The article + 5 questions
3. **Generate Exercise 2** (Short Reading) — A shorter passage on a related subtopic + 2 questions
4. **Generate Exercise 3** (Vocabulary) — 6 words extracted from the long reading article + definitions + context sentences
5. **Generate Exercise 4** (Fill the Gap) — A paragraph with 5 blanks, using words the student should know (from word bank + common academic vocabulary)
6. **Generate Exercise 5** (Writing Micro) — A prompt related to the day's theme

## Content Source: AI-Generated

### Why not RSS/real articles?
- Inconsistent quality and length
- Can't control difficulty level
- Copyright concerns
- Can't guarantee vocabulary variety
- Extraction is fragile (HTML parsing breaks)

### AI generation approach
- Use Claude to generate all content
- Single API call per exercise (or batch where possible)
- Model: claude-sonnet (fast, cheap, good enough for content generation)
- Each generation call includes:
  - The exercise spec (what to generate)
  - The day's topic
  - The user's level (initially fixed at B2, can adapt later)
  - For Exercise 4: words from the user's word bank

## Topic List

Each day, one topic is picked at random (without repeating recent ones). Topics are safe, universal, interesting, and apolitical. Each topic is a concrete subject — not a vague category.

1. Dinosaurs and prehistoric life
2. The Great Barrier Reef
3. How volcanoes work
4. The history of chocolate
5. Antarctica and its wildlife
6. How the human brain learns
7. The Amazon rainforest
8. Ancient Egypt and the pyramids
9. The water cycle and weather patterns
10. Octopuses and marine intelligence
11. The solar system and planets
12. How bridges are built
13. Migration patterns of birds
14. The invention of the printing press
15. Coral reefs and ocean ecosystems
16. Traditional foods around the world
17. The science of sleep
18. Mountains: how they form and erode
19. Bees and pollination
20. The history of maps and navigation

### Topic selection rules
- Pick randomly, but don't repeat any topic within the last 20 days (full rotation before repeats)
- Track which topics have been used and when (stored in DB)
- If the list is exhausted or needs expansion, admin can add more later
- No politics, no religion, no war, no controversial current events

## Scheduling
- Daily generation runs via cron (e.g., 5:00 AM UTC-3)
- Generates the board for "today"
- If generation fails, retry up to 3 times
- Admin can manually trigger regeneration

## Storage
- Each exercise is stored in the database with its content, questions, answers, and metadata
- The daily board is a group of 5 exercises sharing the same date
- Content is stored as JSON (questions array, answer key, etc.)

## Word Bank Integration
- Exercise 3 (Vocabulary) adds all 6 words to the user's word bank after submission (regardless of score)
- Exercise 4 (Fill the Gap) pulls words from the user's word bank for its word choices
- The word bank grows over time, creating a personalized reinforcement loop
- Word bank is per-user, stored in the database

### Cold Start (Day 1-3)
On early days when the user's personal word bank is small (fewer than 20 words):
- Exercise 4 draws from the **word_bank_seed** table — a pre-populated list of 1000 common English words
- The seed words are categorized by difficulty: basic, intermediate, advanced
- Exercise 4 at B2 level should pull from intermediate seed words
- As the user's personal bank grows, it gradually replaces the seed as the primary source
- Selection: prefer personal word bank words, fill remaining slots from seed

### Seed Word List
The `word_bank_seed` table is populated once at database initialization with ~1000 common English words. These are sourced from standard frequency lists (Oxford 3000, Academic Word List, etc.) and categorized:
- **basic** (~400 words): everyday vocabulary (e.g., "important", "different", "available")
- **intermediate** (~400 words): academic/formal (e.g., "significant", "establish", "consequence")
- **advanced** (~200 words): sophisticated (e.g., "ubiquitous", "mitigate", "paradigm")

The full list should be generated as a TypeScript file (`src/word-bank-seed.ts`) exporting an array of `{ word, difficulty }` objects.
