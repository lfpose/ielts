import Anthropic from "@anthropic-ai/sdk";
import {
  getNextTopic,
  getRandomUserWords,
  getRandomSeedWords,
  getUserWordBankCount,
  getSetting,
  type TopicQueueEntry,
  type WordBankEntry,
  type WordBankSeedEntry,
} from "../db.js";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-20250514";

// =============================================
// Types — match specs/database.md JSON shapes
// =============================================

export interface LongReadingContent {
  title: string;
  passage: string;
  questions: Array<{
    number: number;
    type: "multiple_choice" | "true_false_ng";
    question?: string;
    statement?: string;
    options?: string[];
    correct: string;
    explanation: string;
  }>;
}

export interface ShortReadingContent {
  title: string;
  passage: string;
  questions: Array<{
    number: number;
    type: "multiple_choice" | "true_false_ng" | "short_answer";
    question?: string;
    statement?: string;
    options?: string[];
    correct: string;
    explanation: string;
  }>;
}

export interface VocabularyContent {
  words: Array<{
    word: string;
    definition: string;
    context: string;
  }>;
}

export interface FillGapContent {
  paragraph: string;
  blanks: Array<{
    number: number;
    correct: string;
  }>;
  word_bank: string[];
}

export interface WritingMicroContent {
  prompt: string;
}

export interface GeneratedBoard {
  topic: string;
  illustration: string;
  exercises: [
    { type: "long_reading"; content: LongReadingContent; max_score: 5 },
    { type: "short_reading"; content: ShortReadingContent; max_score: 2 },
    { type: "vocabulary"; content: VocabularyContent; max_score: 6 },
    { type: "fill_gap"; content: FillGapContent; max_score: 5 },
    { type: "writing_micro"; content: WritingMicroContent; max_score: 3 },
  ];
}

// =============================================
// Topic Selection
// =============================================

export function pickTopic(forcedTopic?: string): { topic: string; fromQueue: boolean } {
  if (forcedTopic) {
    return { topic: forcedTopic, fromQueue: false };
  }

  const next = getNextTopic();
  if (next) {
    return { topic: next.topic, fromQueue: true };
  }

  // Fallback: if all topics were used recently, pick the one with the oldest last_used_on
  return { topic: "The natural world and biodiversity", fromQueue: false };
}

// =============================================
// Board Generation
// =============================================

export async function generateBoard(
  topic: string,
  userId?: number
): Promise<GeneratedBoard> {
  const difficulty = getSetting("difficulty") || "B2";

  // Generate long reading first (vocabulary depends on it)
  const longReading = await generateLongReading(topic, difficulty);

  // Generate short reading, vocabulary, writing, and illustration in parallel
  const [shortReading, vocabulary, writingMicro, illustration] = await Promise.all([
    generateShortReading(topic, difficulty),
    generateVocabulary(longReading),
    generateWritingMicro(topic),
    generateIllustration(topic),
  ]);

  // Fill gap needs word bank context
  const userWords = userId ? getWordBankWords(userId) : [];
  const fillGap = await generateFillGap(topic, difficulty, userWords);

  return {
    topic,
    illustration,
    exercises: [
      { type: "long_reading", content: longReading, max_score: 5 },
      { type: "short_reading", content: shortReading, max_score: 2 },
      { type: "vocabulary", content: vocabulary, max_score: 6 },
      { type: "fill_gap", content: fillGap, max_score: 5 },
      { type: "writing_micro", content: writingMicro, max_score: 3 },
    ],
  };
}

// =============================================
// Word Bank Helpers
// =============================================

function getWordBankWords(userId: number): string[] {
  const bankCount = getUserWordBankCount(userId);

  if (bankCount >= 20) {
    // Enough personal words — use them
    const words = getRandomUserWords(userId, 10);
    return words.map((w: WordBankEntry) => w.word);
  }

  // Cold start: mix personal + seed words
  const personal = getRandomUserWords(userId, Math.min(bankCount, 5));
  const seedNeeded = 10 - personal.length;
  const seeds = getRandomSeedWords(seedNeeded, "intermediate");
  return [
    ...personal.map((w: WordBankEntry) => w.word),
    ...seeds.map((w: WordBankSeedEntry) => w.word),
  ];
}

// =============================================
// JSON Extraction Helper
// =============================================

function extractJSON<T>(text: string): T {
  // Try to find JSON in code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error("No valid JSON found in response");
}

// =============================================
// Exercise Generators
// =============================================

export async function generateLongReading(
  topic: string,
  difficulty: string
): Promise<LongReadingContent> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Generate an IELTS Academic Reading exercise about "${topic}".

Requirements:
- Write an original article of 500-700 words at ${difficulty} level
- The article should feel like a real publication (informative, engaging, well-structured)
- Include a compelling title
- Create exactly 5 questions that follow the order of the text:
  - 2-3 multiple choice questions (4 options each: A, B, C, D)
  - 2-3 True/False/Not Given questions
  - Mix the types (don't group all MC together)
- Questions should test: main idea, specific detail, inference, author's purpose
- Distractors should be plausible, not obviously wrong
- Each question needs a 1-sentence explanation of the correct answer

Return ONLY valid JSON in this exact format:
{
  "title": "Article Title",
  "passage": "Full article text, 500-700 words...",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "What is the main purpose of...?",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correct": "B",
      "explanation": "The passage states in paragraph 2 that..."
    },
    {
      "number": 2,
      "type": "true_false_ng",
      "statement": "Statement to evaluate.",
      "correct": "TRUE",
      "explanation": "Paragraph 3 explicitly mentions..."
    }
  ]
}

Important: Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON<LongReadingContent>(text);
}

export async function generateShortReading(
  topic: string,
  difficulty: string
): Promise<ShortReadingContent> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Generate a short IELTS reading exercise about a subtopic related to "${topic}".

Requirements:
- Write a short passage of 150-250 words at B1-B2 level (slightly easier than ${difficulty})
- Style it as a news brief, short report, informational blurb, or letter excerpt
- Include a descriptive title
- Create exactly 2 questions. Choose 2 different types from:
  - Multiple choice (4 options: A, B, C, D)
  - True/False/Not Given
  - Short answer (answer is 1-3 words from the passage)
- Each question needs a 1-sentence explanation

Return ONLY valid JSON in this exact format:
{
  "title": "Brief: Title Here",
  "passage": "Short passage, 150-250 words...",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "What does the report suggest?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct": "A",
      "explanation": "The passage states..."
    },
    {
      "number": 2,
      "type": "short_answer",
      "question": "In which year was the discovery made?",
      "correct": "2019",
      "explanation": "The second sentence mentions..."
    }
  ]
}

Important: Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON<ShortReadingContent>(text);
}

export async function generateVocabulary(
  longReading: LongReadingContent
): Promise<VocabularyContent> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `From the following article, extract 6 vocabulary words that an upper-intermediate English learner would benefit from learning.

ARTICLE TITLE: ${longReading.title}
ARTICLE TEXT: ${longReading.passage}

Requirements:
- Choose 6 academic or upper-intermediate words FROM the article
- Target words the student likely doesn't know yet (not basic words like "house", "important")
- Good examples: "ubiquitous", "mitigate", "unprecedented", "albeit", "substantial"
- For each word provide:
  - A clear, simple definition (not dictionary jargon)
  - The exact sentence from the article where it appears (for context)

Return ONLY valid JSON in this exact format:
{
  "words": [
    {
      "word": "ubiquitous",
      "definition": "Found everywhere; very common",
      "context": "The exact sentence from the article where this word appears..."
    }
  ]
}

Important: Return exactly 6 words. Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON<VocabularyContent>(text);
}

export async function generateFillGap(
  topic: string,
  difficulty: string,
  userWordBank: string[]
): Promise<FillGapContent> {
  const wordBankHint =
    userWordBank.length > 0
      ? `Try to incorporate some of these words the student has been learning: ${userWordBank.join(", ")}.`
      : "Use common academic vocabulary appropriate for B2 level.";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `Generate a fill-the-gap exercise related to "${topic}".

Requirements:
- Write a standalone paragraph of 80-120 words at ${difficulty} level
- Include exactly 5 blanks (gaps), each replacing a single word
- Mark blanks as __(1)__, __(2)__, etc.
- Provide a word bank of exactly 7 words: 5 correct answers + 2 plausible distractors
- Distractors should be the same part of speech as at least one correct word
- ${wordBankHint}
- Each word is used only once

Return ONLY valid JSON in this exact format:
{
  "paragraph": "The scientist __(1)__ the results and found that the data __(2)__ the hypothesis...",
  "blanks": [
    { "number": 1, "correct": "analyzed" },
    { "number": 2, "correct": "supported" },
    { "number": 3, "correct": "significant" },
    { "number": 4, "correct": "concluded" },
    { "number": 5, "correct": "evidence" }
  ],
  "word_bank": ["analyzed", "supported", "significant", "concluded", "evidence", "reluctant", "abundant"]
}

Important: The word_bank array must contain all 5 correct words plus 2 distractors (7 total). Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON<FillGapContent>(text);
}

export async function generateWritingMicro(
  topic: string
): Promise<WritingMicroContent> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Generate a writing micro-exercise prompt related to "${topic}".

Requirements:
- Write a short prompt that asks the student to respond in 2-3 sentences
- Reference the day's theme to give context (reduces "blank page" anxiety)
- The prompt should be specific enough that the student knows what to write
- But open enough for personal expression
- Keep it encouraging and accessible

Examples of good prompts:
- "The article discusses how cities are adapting to climate change. In 2-3 sentences, describe one change you think your city should make and why."
- "Do you agree that technology has made people less social? Write 2-3 sentences explaining your view."

Return ONLY valid JSON in this exact format:
{
  "prompt": "Your prompt text here. In 2-3 sentences, ..."
}

Important: Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return extractJSON<WritingMicroContent>(text);
}

export async function generateIllustration(topic: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Create a simple ASCII art illustration for the topic: "${topic}".

Requirements:
- Width: 30-40 characters per line
- Height: 15-20 lines
- Use simple block characters, dots, slashes, and basic ASCII to create a recognizable silhouette or outline
- Keep it simple — think: outline of an animal, a landscape, a building, a simple object
- No text labels inside the art
- The illustration should be immediately recognizable as related to the topic

Return ONLY the ASCII art, nothing else. No code blocks, no explanation, just the raw ASCII lines.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // Clean up: remove any code block markers if present
  return text.replace(/^```[a-z]*\n?/gm, "").replace(/\n?```$/gm, "").trim();
}
