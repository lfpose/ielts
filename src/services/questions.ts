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
All questions must be answerable solely from the passage provided.`;

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

Format your response in exactly two sections separated by "---ANSWERS---":

SECTION 1: The questions (clearly numbered and formatted, with instructions for each question type)
SECTION 2: The answer key with brief explanations

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
