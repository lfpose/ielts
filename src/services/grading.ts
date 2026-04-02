import Anthropic from "@anthropic-ai/sdk";
import type {
  LongReadingContent,
  ShortReadingContent,
  VocabularyContent,
  FillGapContent,
  WritingMicroContent,
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

export interface GradeResult {
  score: number;
  feedback: ReadingFeedback | VocabularyFeedback | FillGapFeedback | WritingFeedback;
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
// Helpers
// =============================================

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}
