import Anthropic from "@anthropic-ai/sdk";
import type {
  LongReadingContent,
  ShortReadingContent,
  VocabularyContent,
  FillGapContent,
  WritingMicroContent,
  MiniWritingContent,
  WordSearchContent,
  HangmanContent,
  NumberWordsContent,
} from "./content.js";

const client = new Anthropic();
const MODEL = "claude-sonnet-4-20250514";

// =============================================
// Answer shapes — what the student submits
// =============================================

export interface ReadingAnswers {
  answers: Array<{ number: number; answer: string }>;
}

export interface VocabularyAnswers {
  matches: Array<{ word: string; matched_definition: string }>;
}

export interface FillGapAnswers {
  fills: Array<{ number: number; word: string }>;
}

export interface WritingAnswers {
  text: string;
}

export interface MiniWritingAnswers {
  text: string;
}

export interface WordSearchAnswers {
  found_words: string[];
}

export interface HangmanAnswers {
  won: boolean;
}

export interface NumberWordsAnswers {
  answers: string[]; // 3 text answers
}

// =============================================
// Feedback shapes — what the grader returns
// =============================================

export interface ReadingQuestionResult {
  number: number;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation: string;
}

export interface ReadingFeedback {
  results: ReadingQuestionResult[];
}

export interface VocabularyWordResult {
  word: string;
  correct: boolean;
  correct_definition: string;
}

export interface VocabularyFeedback {
  results: VocabularyWordResult[];
}

export interface FillGapResult {
  number: number;
  correct: boolean;
  user_word: string;
  correct_word: string;
}

export interface FillGapFeedback {
  results: FillGapResult[];
}

export interface WritingFeedback {
  comment: string;
  clarity: {
    score: number;
    note: string;
  };
  grammar: {
    score: number;
    corrections: Array<{
      original: string;
      corrected: string;
      reason: string;
    }>;
  };
  vocabulary: {
    score: number;
    note: string;
  };
}

export interface MiniWritingFeedback {
  comment: string;
  is_correct: boolean;
  correction?: string;
  reason?: string;
}

export interface WordSearchWordResult {
  word: string;
  definition: string;
  example: string;
  found: boolean;
}

export interface WordSearchFeedback {
  results: WordSearchWordResult[];
}

export interface HangmanFeedback {
  won: boolean;
  word: string;
  definition: string;
}

export interface NumberWordsItemResult {
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  note?: string;
}

export interface NumberWordsFeedback {
  results: NumberWordsItemResult[];
}

export interface GradeResult {
  score: number;
  feedback: ReadingFeedback | VocabularyFeedback | FillGapFeedback | WritingFeedback | MiniWritingFeedback | WordSearchFeedback | HangmanFeedback | NumberWordsFeedback;
}

// =============================================
// Deterministic graders (exercises 1-4)
// =============================================

export function gradeLongReading(
  content: LongReadingContent,
  answers: ReadingAnswers
): GradeResult {
  const results: ReadingQuestionResult[] = content.questions.map((q) => {
    const userAnswer = answers.answers.find((a) => a.number === q.number);
    const userStr = (userAnswer?.answer ?? "").trim().toUpperCase();
    const correctStr = q.correct.trim().toUpperCase();
    return {
      number: q.number,
      correct: userStr === correctStr,
      user_answer: userAnswer?.answer ?? "",
      correct_answer: q.correct,
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  return { score, feedback: { results } };
}

export function gradeShortReading(
  content: ShortReadingContent,
  answers: ReadingAnswers
): GradeResult {
  const results: ReadingQuestionResult[] = content.questions.map((q) => {
    const userAnswer = answers.answers.find((a) => a.number === q.number);
    const userStr = (userAnswer?.answer ?? "").trim().toUpperCase();
    const correctStr = q.correct.trim().toUpperCase();

    // Short answer: normalize whitespace and case for comparison
    const isCorrect =
      q.type === "short_answer"
        ? normalize(userStr) === normalize(correctStr)
        : userStr === correctStr;

    return {
      number: q.number,
      correct: isCorrect,
      user_answer: userAnswer?.answer ?? "",
      correct_answer: q.correct,
      explanation: q.explanation,
    };
  });

  const score = results.filter((r) => r.correct).length;
  return { score, feedback: { results } };
}

export function gradeVocabulary(
  content: VocabularyContent,
  answers: VocabularyAnswers
): GradeResult {
  const results: VocabularyWordResult[] = content.words.map((w) => {
    const match = answers.matches.find(
      (m) => normalize(m.word) === normalize(w.word)
    );
    const isCorrect = match
      ? normalize(match.matched_definition) === normalize(w.definition)
      : false;
    return {
      word: w.word,
      correct: isCorrect,
      correct_definition: w.definition,
    };
  });

  const score = results.filter((r) => r.correct).length;
  return { score, feedback: { results } };
}

export function gradeFillGap(
  content: FillGapContent,
  answers: FillGapAnswers
): GradeResult {
  const results: FillGapResult[] = content.blanks.map((b) => {
    const fill = answers.fills.find((f) => f.number === b.number);
    const userWord = (fill?.word ?? "").trim();
    const isCorrect = normalize(userWord) === normalize(b.correct);
    return {
      number: b.number,
      correct: isCorrect,
      user_word: userWord,
      correct_word: b.correct,
    };
  });

  const score = results.filter((r) => r.correct).length;
  return { score, feedback: { results } };
}

// =============================================
// AI grader (exercise 5 — writing micro)
// =============================================

export async function gradeWritingMicro(
  content: WritingMicroContent,
  answers: WritingAnswers,
  studentName?: string
): Promise<GradeResult> {
  const name = studentName || "the student";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an encouraging English teacher grading a short writing exercise for ${name}, a Spanish-speaking IELTS student.

The prompt was:
"${content.prompt}"

The student wrote:
"${answers.text}"

Evaluate on 3 dimensions. Each dimension scores 0 or 1:
1. **Clarity** (1 = meaning is clear, 0 = meaning is unclear)
2. **Grammar** (1 = no significant errors, 0 = has errors that affect meaning)
3. **Vocabulary** (1 = appropriate word choice, 0 = very basic or incorrect words)

Be encouraging and gentle — this is practice, not a formal exam. The student is learning.

If the response is in Spanish or not in English, set all scores to 0 and include a comment: "Intenta responder en inglés :)"

Return ONLY valid JSON (no markdown, no code fences) in this exact shape:
{
  "comment": "Short encouraging overall comment (1-2 sentences)",
  "clarity": {
    "score": 0 or 1,
    "note": "Brief note about clarity"
  },
  "grammar": {
    "score": 0 or 1,
    "corrections": [
      {
        "original": "what the student wrote",
        "corrected": "better version",
        "reason": "brief explanation"
      }
    ]
  },
  "vocabulary": {
    "score": 0 or 1,
    "note": "Highlight good word usage or suggest an upgrade"
  }
}

The corrections array can be empty if grammar is perfect. Include at most 3 corrections.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const feedback = JSON.parse(text) as WritingFeedback;

  const score =
    (feedback.clarity?.score ?? 0) +
    (feedback.grammar?.score ?? 0) +
    (feedback.vocabulary?.score ?? 0);

  return { score, feedback };
}

// =============================================
// AI grader (exercise 6 — mini writing)
// =============================================

export async function gradeMiniWriting(
  content: MiniWritingContent,
  answers: MiniWritingAnswers
): Promise<GradeResult> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a friendly English teacher grading a one-sentence writing exercise for a Spanish-speaking IELTS student.

The prompt was:
"${content.prompt}"

The student wrote:
"${answers.text}"

Evaluate lightly:
- Is the sentence grammatically acceptable? (minor issues like missing articles are OK)
- Does it address the prompt? (loosely — any reasonable attempt counts)
- Is it in English?

Score: 1 = acceptable sentence that addresses the prompt in English. 0 = off-topic, not in English, or has a major grammar error that makes it hard to understand.

Return ONLY valid JSON (no markdown, no code fences):
{
  "comment": "Short encouraging comment in Spanish (1 sentence, e.g. '¡Bien hecho!' or 'Casi, sigue practicando.')",
  "is_correct": true or false,
  "correction": "corrected version of their sentence (only include if is_correct is false)",
  "reason": "brief reason in Spanish (only include if is_correct is false, e.g. 'Falta el artículo antes de ...')"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";
  const feedback = JSON.parse(text) as MiniWritingFeedback;
  const score = feedback.is_correct ? 1 : 0;

  return { score, feedback };
}

// =============================================
// Deterministic grader (exercise 4 — word search)
// =============================================

export function gradeWordSearch(
  content: WordSearchContent,
  answers: WordSearchAnswers
): GradeResult {
  const results: WordSearchWordResult[] = content.words.map((w) => {
    const found = answers.found_words.some(
      (fw) => normalize(fw) === normalize(w.word)
    );
    return {
      word: w.word,
      definition: w.definition,
      example: w.example,
      found,
    };
  });

  const score = results.filter((r) => r.found).length;
  return { score, feedback: { results } };
}

// =============================================
// Deterministic grader (hangman)
// =============================================

export function gradeHangman(
  content: HangmanContent,
  answers: HangmanAnswers
): GradeResult {
  const score = answers.won ? 1 : 0;
  const feedback: HangmanFeedback = {
    won: answers.won,
    word: content.word,
    definition: content.definition,
  };
  return { score, feedback };
}

// =============================================
// AI grader (number to words)
// =============================================

export async function gradeNumberWords(
  content: NumberWordsContent,
  answers: NumberWordsAnswers
): Promise<GradeResult> {
  const itemsText = content.items.map((item, i) =>
    `Item ${i + 1}: display="${item.display}", canonical answer="${item.answer}", alternatives=${JSON.stringify(item.alternatives)}, student wrote: "${answers.answers[i] ?? ""}"`
  ).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are grading a number-to-words exercise for an IELTS English learner.
For each item, decide if the student's written form is a valid English representation of the number.
Accept spelling variants (e.g. "eighty-five" = "eighty five"), common alternatives (e.g. "three and a half" = "three point five"), and minor capitalization differences.
Reject if the number value is wrong or the form is not standard English.

${itemsText}

Return ONLY valid JSON (no markdown, no code fences):
{
  "results": [
    { "correct": true, "userAnswer": "...", "correctAnswer": "...", "note": "optional note" },
    { "correct": false, "userAnswer": "...", "correctAnswer": "...", "note": "why it's wrong" },
    { "correct": true, "userAnswer": "...", "correctAnswer": "...", "note": "" }
  ]
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text) as { results: NumberWordsItemResult[] };
  const score = parsed.results.filter(r => r.correct).length;
  return { score, feedback: { results: parsed.results } };
}

// =============================================
// Helpers
// =============================================

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
