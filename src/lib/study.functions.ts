import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateJson } from "./ai.server";
import { shuffleQuestion } from "./quiz-utils";
import {
  DIFFICULTY_VALUES,
  QUIZ_LENGTH,
  SUBJECT_VALUES,
  subjectLabel,
  type AiResult,
  type Explanation,
  type Feedback,
  type Flashcard,
  type QuizQuestion,
} from "./study-config";

const setupSchema = z.object({
  subject: z.enum(SUBJECT_VALUES),
  grade: z.union([z.literal(8), z.literal(9), z.literal(10)]),
  topic: z.string().trim().min(1).max(120),
});

const STYLE = `Write in plain text only: no markdown, no LaTeX. Write maths with simple symbols (x², √, ×, ÷, ≤, π). For code, use short Python snippets on their own lines.`;

// ---------- Explain ----------

const explanationSchema = z.object({
  title: z.string(),
  simpleExplanation: z.array(z.string()),
  analogy: z.string(),
  keyPoints: z.array(z.string()),
  example: z.object({ problem: z.string(), solution: z.string() }),
  commonMistake: z.string(),
  checkYourself: z.string(),
});

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;

export const explainTopic = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    setupSchema.extend({ confusion: z.string().trim().max(500).optional() }).parse(data),
  )
  .handler(async ({ data }): Promise<AiResult<Explanation>> => {
    const subject = subjectLabel(data.subject);
    return generateJson({
      schemaName: "explanation",
      instructions: `You are a friendly tutor for grades 8–10. Explain the topic with one real-world analogy, short paragraphs, simple language.
You are Study Buddy, a patient, friendly tutor for grade ${data.grade} students (about ${data.grade + 5} years old) studying ${subject}.
Explain difficult concepts in simple language a grade ${data.grade} student understands. Use short sentences. Define any technical word the first time you use it.
- title: a short, friendly title for the concept.
- simpleExplanation: 2-4 short paragraphs building from the basic idea to the full idea.
- analogy: one everyday comparison that makes the idea click.
- keyPoints: 3-5 short facts or rules to remember.
- example: a worked example suited to grade ${data.grade}, with a step-by-step solution (put each step on a new line).
- commonMistake: one mistake students often make and how to avoid it.
- checkYourself: one quick question the student can try in their head (do not give the answer).
If the topic is not part of ${subject}, gently explain the closest relevant ${subject} idea instead.
${STYLE}`,
      input: `Topic: ${data.topic}${data.confusion ? `\nWhat confuses me: ${data.confusion}` : ""}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "simpleExplanation", "analogy", "keyPoints", "example", "commonMistake", "checkYourself"],
        properties: {
          title: str,
          simpleExplanation: strArr,
          analogy: str,
          keyPoints: strArr,
          example: {
            type: "object",
            additionalProperties: false,
            required: ["problem", "solution"],
            properties: { problem: str, solution: str },
          },
          commonMistake: str,
          checkYourself: str,
        },
      },
      parse: (v) => explanationSchema.parse(v),
    });
  });

// ---------- Quiz ----------

const questionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  hint: z.string(),
  explanation: z.string(),
  concept: z.string(),
});

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    setupSchema
      .extend({
        difficulty: z.enum(DIFFICULTY_VALUES),
        count: z.number().int().min(QUIZ_LENGTH.min).max(QUIZ_LENGTH.max).default(QUIZ_LENGTH.default),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<AiResult<QuizQuestion[]>> => {
    const subject = subjectLabel(data.subject);
    const result = await generateJson({
      schemaName: "quiz",
      effort: "medium",
      instructions: `You are a quiz generator for grades 8–10. Return only valid JSON in the required format, no prose.
You write multiple-choice quizzes for grade ${data.grade} ${subject} students.
Write exactly ${data.count} question${data.count === 1 ? "" : "s"} at ${data.difficulty.toUpperCase()} difficulty.
Difficulty guide:
- easy: recall and basic understanding of one idea.
- medium: apply the idea in one or two steps.
- hard: multi-step reasoning, tricky but fair distractors, edge cases.
Rules for every question:
- Exactly 4 options and exactly one correct answer. Do not prefix options with letters or numbers.
- Wrong options must be believable and based on common student misconceptions.
- correctIndex: the 0-based position of the correct option. Double-check it is truly correct.
- hint: a helpful nudge toward the right idea or first step. It must NOT give away the answer, must NOT name or eliminate specific options, and must NOT just repeat the question.
- explanation: 1-3 simple sentences on why the correct answer is right.
- concept: the skill tested, in 2-5 words.
Cover different parts of the topic; do not repeat the same idea.
If the topic is not part of ${subject}, use the closest relevant ${subject} topic instead.
${STYLE}`,
      input: `Topic: ${data.topic}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["questions"],
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["question", "options", "correctIndex", "hint", "explanation", "concept"],
              properties: {
                question: str,
                options: strArr,
                correctIndex: { type: "integer" },
                hint: str,
                explanation: str,
                concept: str,
              },
            },
          },
        },
      },
      parse: (v) => z.object({ questions: z.array(questionSchema).min(1) }).parse(v).questions,
    });
    if (!result.ok) return result;
    return { ok: true, data: result.data.slice(0, data.count).map((q) => shuffleQuestion(q)) };
  });

// ---------- Feedback ----------

const attemptSummarySchema = z.object({
  subject: z.enum(SUBJECT_VALUES),
  grade: z.number().int().min(8).max(10),
  topic: z.string().max(120),
  difficulty: z.enum(DIFFICULTY_VALUES),
  correct: z.number().int().min(0),
  total: z.number().int().min(1).max(20),
  hintsUsed: z.number().int().min(0),
  date: z.string().max(40),
  questions: z
    .array(
      z.object({
        question: z.string().max(600),
        concept: z.string().max(80),
        chosen: z.string().max(300),
        correctAnswer: z.string().max(300),
        isCorrect: z.boolean(),
        usedHint: z.boolean(),
      }),
    )
    .max(20),
});

export type AttemptSummary = z.infer<typeof attemptSummarySchema>;

const feedbackSchema = z.object({
  overall: z.string(),
  strengths: z.array(z.string()),
  areasToDevelop: z.array(z.object({ area: z.string(), why: z.string(), howToImprove: z.string() })),
  nextSteps: z.array(z.string()),
  suggestedTopics: z.array(
    z.object({ subject: z.enum(SUBJECT_VALUES), topic: z.string(), difficulty: z.enum(DIFFICULTY_VALUES) }),
  ),
});

export const getFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ attempts: z.array(attemptSummarySchema).min(1).max(15) }).parse(data),
  )
  .handler(async ({ data }): Promise<AiResult<Feedback>> => {
    return generateJson({
      schemaName: "feedback",
      instructions: `You are Study Buddy, a warm but honest tutor reviewing a grade 8-10 student's quiz answers in Mathematics, Science and Computer Science.
Study every answer. Look for patterns: which concepts they get wrong, the kind of wrong option they pick (what misconception it suggests), how they do at each difficulty, and whether they rely on hints.
Talk directly to the student ("you"), in simple language.
- overall: 2-3 sentences summarising how they are doing, with their actual scores.
- strengths: 2-4 specific things they do well (name concepts).
- areasToDevelop: 2-4 items. area = the concept or skill; why = evidence from their answers (mention the mistake pattern); howToImprove = concrete practice they can do.
- nextSteps: 3 short, actionable steps for this week.
- suggestedTopics: 2-3 topics to practise next, with the subject and a sensible difficulty (move up after strong scores, stay or move down after weak ones).
If there is little data, say so kindly and still give useful advice.
${STYLE}`,
      input: `Quiz history (most recent first):\n${JSON.stringify(data.attempts)}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["overall", "strengths", "areasToDevelop", "nextSteps", "suggestedTopics"],
        properties: {
          overall: str,
          strengths: strArr,
          areasToDevelop: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["area", "why", "howToImprove"],
              properties: { area: str, why: str, howToImprove: str },
            },
          },
          nextSteps: strArr,
          suggestedTopics: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["subject", "topic", "difficulty"],
              properties: {
                subject: { type: "string", enum: SUBJECT_VALUES },
                topic: str,
                difficulty: { type: "string", enum: DIFFICULTY_VALUES },
              },
            },
          },
        },
      },
      parse: (v) => feedbackSchema.parse(v),
    });
  });

// ---------- Flashcards ----------

const flashcardSchema = z.object({ front: z.string(), back: z.string(), concept: z.string() });

export const generateFlashcards = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => setupSchema.parse(data))
  .handler(async ({ data }): Promise<AiResult<Flashcard[]>> => {
    const subject = subjectLabel(data.subject);
    const result = await generateJson({
      schemaName: "flashcards",
      instructions: `You are a friendly tutor for grades 8–10 making revision flashcards for grade ${data.grade} ${subject}.
Write exactly 10 flashcards covering different key ideas of the topic, from basic to harder.
- front: a short question, term or prompt (max 20 words).
- back: a clear, simple answer or explanation (1-3 short sentences).
- concept: the idea tested, in 2-5 words.
If the topic is not part of ${subject}, use the closest relevant ${subject} topic instead.
${STYLE}`,
      input: `Topic: ${data.topic}`,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["cards"],
        properties: {
          cards: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["front", "back", "concept"],
              properties: { front: str, back: str, concept: str },
            },
          },
        },
      },
      parse: (v) => z.object({ cards: z.array(flashcardSchema).min(1) }).parse(v).cards.slice(0, 12),
    });
    return result;
  });
