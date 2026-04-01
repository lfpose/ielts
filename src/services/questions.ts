import Anthropic from "@anthropic-ai/sdk";
import type { Article } from "./article.js";

const client = new Anthropic();

export interface IELTSQuestions {
  passage: string;
  questions: string;
  answerKey: string;
}

const SYSTEM_PROMPT = `You are an expert IELTS examiner who creates Academic Reading test questions.
You create questions that match the official IELTS difficulty level and format exactly.
All questions must be answerable solely from the passage provided.
Use clear, simple English appropriate for IELTS test-takers.`;

const USER_PROMPT = (article: Article) => `Based on the following article, create an IELTS Academic Reading practice set.

ARTICLE TITLE: ${article.title}
SOURCE: ${article.source}

PASSAGE:
${article.content}

Create the following question types (8-10 questions total):

1. TRUE / FALSE / NOT GIVEN (3-4 statements)
   - Statements that test understanding of specific facts in the passage
   - Include a mix of TRUE, FALSE, and NOT GIVEN answers

2. MULTIPLE CHOICE (2-3 questions)
   - Each with 4 options (A, B, C, D)
   - Test comprehension of main ideas and details

3. SENTENCE COMPLETION (2-3 questions)
   - Complete sentences using words from the passage
   - Specify the word limit (e.g., "NO MORE THAN THREE WORDS")

Format your response in EXACTLY two sections separated by the marker "---ANSWERS---":

SECTION 1 (before the marker): The questions only. Clearly numbered, with instructions for each question type. Use proper spacing between sections. Do NOT include any answers here.

SECTION 2 (after the marker): The complete answer key with:
- The correct answer for each question
- A brief explanation referencing the relevant part of the passage

Do NOT include the passage in your response — only the questions and answers.`;

export async function generateQuestions(
  article: Article
): Promise<IELTSQuestions> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: USER_PROMPT(article) }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parts = text.split("---ANSWERS---");
  const questions = parts[0]?.trim() || text;
  const answerKey = parts[1]?.trim() || "Answer key not available";

  return {
    passage: article.content,
    questions,
    answerKey,
  };
}

// Generate IELTS Writing Task 2 prompt from an article
export async function generateWritingPrompt(
  article: Article
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: `You create IELTS Writing Task 2 prompts. The prompt should be inspired by the article's theme but should be a general opinion/discussion question, not about the article itself. Use clear, simple English.`,
    messages: [
      {
        role: "user",
        content: `Based on the theme of this article, create ONE IELTS Writing Task 2 prompt.

ARTICLE: "${article.title}"
TOPIC: ${article.content.slice(0, 300)}

Format:
- Start with a 1-2 sentence context statement
- Then the question (e.g., "To what extent do you agree or disagree?")
- Add: "Write at least 250 words."
- Keep it to ONE prompt only.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

// Evaluate user answers against the answer key
export async function evaluateAnswers(
  questions: string,
  answerKey: string,
  userAnswers: string,
  userName: string
): Promise<{ score: string; feedback: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `You are a warm, encouraging IELTS tutor providing feedback on a student's reading practice answers. Be specific about what they got right and wrong, reference the passage, and give practical tips for improvement. Address the student by name.`,
    messages: [
      {
        role: "user",
        content: `Student name: ${userName}

QUESTIONS:
${questions}

CORRECT ANSWERS:
${answerKey}

STUDENT'S ANSWERS:
${userAnswers}

Please provide:
1. SCORE: X/Y correct (as a simple fraction)
2. DETAILED FEEDBACK for each question:
   - Whether they got it right or wrong
   - If wrong, explain the correct answer with reference to the passage
   - Tips for approaching this question type
3. OVERALL ASSESSMENT: A brief encouraging summary with 1-2 specific study tips

Keep the tone warm and motivating. Use simple, clear English.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract score from the response
  const scoreMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
  const score = scoreMatch ? `${scoreMatch[1]}/${scoreMatch[2]}` : "See feedback";

  return { score, feedback: text };
}

// Evaluate IELTS writing submission
export async function evaluateWriting(
  prompt: string,
  userEssay: string,
  userName: string
): Promise<{ score: string; feedback: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `You are an IELTS Writing Task 2 examiner. Score using the 4 official criteria: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Each 0-9. Give an overall band score. Be encouraging but honest. Use simple English for feedback.`,
    messages: [
      {
        role: "user",
        content: `Student: ${userName}

WRITING PROMPT:
${prompt}

STUDENT'S ESSAY:
${userEssay}

Provide:
1. BAND SCORE: X.X/9 (overall)
2. CRITERIA SCORES (brief, one line each)
3. STRENGTHS (2-3 specific things done well)
4. AREAS TO IMPROVE (2-3 specific tips with examples from their essay)
5. OVERALL COMMENT (encouraging, 2-3 sentences)

Word count: ${userEssay.split(/\s+/).length} words.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const scoreMatch = text.match(/(\d+\.?\d?)\s*\/\s*9/);
  const score = scoreMatch ? `${scoreMatch[1]}/9` : "See feedback";

  return { score, feedback: text };
}
