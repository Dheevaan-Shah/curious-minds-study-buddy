// "Cache as you play": every AI quiz is saved on the device so quizzes still work offline
// or when AI generation fails.
import { shuffleQuestion } from "./quiz-utils";
import type { Difficulty, QuizQuestion, StudySetup } from "./study-config";

export const BANK_KEY = "study-buddy:quiz-bank";
export const BANK_LIMIT_PER_SET = 50;

export type QuizBank = Record<string, QuizQuestion[]>;

export function bankKey(setup: StudySetup, difficulty: Difficulty): string {
  return `${setup.subject}|${setup.grade}|${difficulty}|${setup.topic.trim().toLowerCase()}`;
}

const norm = (q: QuizQuestion) => q.question.trim().toLowerCase();

/** Add new questions (newest first), skipping duplicates, keeping at most `limit` per set. */
export function addToBank(bank: QuizBank, key: string, questions: QuizQuestion[], limit = BANK_LIMIT_PER_SET): QuizBank {
  const existing = bank[key] ?? [];
  const seen = new Set(existing.map(norm));
  const fresh: QuizQuestion[] = [];
  for (const q of questions) {
    const k = norm(q);
    if (seen.has(k)) continue;
    seen.add(k);
    fresh.push(q);
  }
  return { ...bank, [key]: [...fresh, ...existing].slice(0, limit) };
}

/** Up to `count` random saved questions for a set, with options re-shuffled. */
export function pickFromBank(bank: QuizBank, key: string, count: number, random: () => number = Math.random): QuizQuestion[] {
  const list = [...(bank[key] ?? [])];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list.slice(0, Math.max(0, count)).map((q) => shuffleQuestion(q, random));
}

function isQuestion(q: unknown): q is QuizQuestion {
  if (!q || typeof q !== "object") return false;
  const r = q as QuizQuestion;
  return (
    typeof r.question === "string" &&
    Array.isArray(r.options) &&
    r.options.length === 4 &&
    Number.isInteger(r.correctIndex) &&
    r.correctIndex >= 0 &&
    r.correctIndex < 4
  );
}

export function loadBank(): QuizBank {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(BANK_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const out: QuizBank = {};
    for (const [k, v] of Object.entries(parsed)) if (Array.isArray(v)) out[k] = v.filter(isQuestion);
    return out;
  } catch {
    return {};
  }
}

export function saveBank(bank: QuizBank): void {
  try {
    window.localStorage.setItem(BANK_KEY, JSON.stringify(bank));
  } catch {
    /* storage full — the bank just stops growing */
  }
}
