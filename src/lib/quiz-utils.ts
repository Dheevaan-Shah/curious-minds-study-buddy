import type { Difficulty, Grade, QuizQuestion, Subject } from "./study-config";

export type AnsweredQuestion = {
  question: string;
  concept: string;
  options: string[];
  correctIndex: number;
  chosenIndex: number;
  usedHint: boolean;
};

export type Attempt = {
  id: string;
  date: string;
  subject: Subject;
  grade: Grade;
  topic: string;
  difficulty: Difficulty;
  correct: number;
  total: number;
  hintsUsed: number;
  questions: AnsweredQuestion[];
};

/** Shuffle a question's options so the right answer isn't always in the same spot. */
export function shuffleQuestion(q: QuizQuestion, random: () => number = Math.random): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i]!;
    order[i] = order[j]!;
    order[j] = tmp;
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]!),
    correctIndex: order.indexOf(q.correctIndex),
  };
}

export function scoreAnswers(questions: AnsweredQuestion[]) {
  const total = questions.length;
  const correct = questions.filter((q) => q.chosenIndex === q.correctIndex).length;
  const hintsUsed = questions.filter((q) => q.usedHint).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, hintsUsed, percent };
}

export function percentOf(a: Pick<Attempt, "correct" | "total">): number {
  return a.total === 0 ? 0 : Math.round((a.correct / a.total) * 100);
}

export type GroupStat = {
  key: string;
  subject: Subject;
  topic: string;
  attempts: number;
  averagePercent: number;
  bestPercent: number;
};

/** Average and best score per subject + topic, weakest first. */
export function topicStats(attempts: Attempt[]): GroupStat[] {
  const groups = new Map<string, { subject: Subject; topic: string; items: Attempt[] }>();
  for (const a of attempts) {
    const key = `${a.subject}::${a.topic.trim().toLowerCase()}`;
    const g = groups.get(key) ?? { subject: a.subject, topic: a.topic.trim(), items: [] };
    g.items.push(a);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => {
      const totalCorrect = g.items.reduce((s, a) => s + a.correct, 0);
      const totalQs = g.items.reduce((s, a) => s + a.total, 0);
      return {
        key,
        subject: g.subject,
        topic: g.topic,
        attempts: g.items.length,
        averagePercent: totalQs === 0 ? 0 : Math.round((totalCorrect / totalQs) * 100),
        bestPercent: Math.max(...g.items.map(percentOf)),
      };
    })
    .sort((a, b) => a.averagePercent - b.averagePercent);
}

/** Overall percentage per subject across all its questions. */
export function subjectAverages(attempts: Attempt[]): Partial<Record<Subject, number>> {
  const out: Partial<Record<Subject, number>> = {};
  const sums = new Map<Subject, { c: number; t: number }>();
  for (const a of attempts) {
    const s = sums.get(a.subject) ?? { c: 0, t: 0 };
    s.c += a.correct;
    s.t += a.total;
    sums.set(a.subject, s);
  }
  for (const [subject, s] of sums) out[subject] = s.t === 0 ? 0 : Math.round((s.c / s.t) * 100);
  return out;
}

const STORAGE_KEY = "study-buddy:attempts";

export function loadAttempts(): Attempt[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Attempt[]) : [];
  } catch {
    return [];
  }
}

export function saveAttempts(attempts: Attempt[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
}

/** Compact, most-recent-first history sent to the AI for feedback. */
export function toFeedbackPayload(attempts: Attempt[], limit = 15) {
  return [...attempts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map((a) => ({
      subject: a.subject,
      grade: a.grade,
      topic: a.topic.slice(0, 120),
      difficulty: a.difficulty,
      correct: a.correct,
      total: a.total,
      hintsUsed: a.hintsUsed,
      date: a.date.slice(0, 40),
      questions: a.questions.slice(0, 20).map((q) => ({
        question: q.question.slice(0, 600),
        concept: q.concept.slice(0, 80),
        chosen: (q.options[q.chosenIndex] ?? "").slice(0, 300),
        correctAnswer: (q.options[q.correctIndex] ?? "").slice(0, 300),
        isCorrect: q.chosenIndex === q.correctIndex,
        usedHint: q.usedHint,
      })),
    }));
}
