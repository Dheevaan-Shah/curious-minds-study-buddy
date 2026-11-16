import { describe, expect, it } from "vitest";
import { GRADES, QUIZ_LENGTH, SUBJECT_VALUES, TIME_LIMITS, TOPIC_SUGGESTIONS, type QuizQuestion } from "./study-config";
import { searchTopics } from "./topic-search";
import { addToBank, bankKey, pickFromBank } from "./quiz-bank";
import { COOLDOWN_MS, INITIAL_GUARD, isCoolingDown, notePlay, type GuardState } from "./focus-guard";
import { clampQuizLength, type Attempt } from "./quiz-utils";
import { isPersonalBest } from "./gamification";

describe("topic library", () => {
  it("has 24 topics for every subject and grade (216 total)", () => {
    let total = 0;
    for (const s of SUBJECT_VALUES)
      for (const g of GRADES) {
        expect(TOPIC_SUGGESTIONS[s][g]).toHaveLength(24);
        total += TOPIC_SUGGESTIONS[s][g].length;
      }
    expect(total).toBe(216);
  });

  it("suggests a library topic when the typed text matches it", () => {
    const first = TOPIC_SUGGESTIONS.math[9][0]!;
    const typed = first.name.slice(0, 4);
    const results = searchTopics("math", 9, typed);
    expect(results.map((r) => r.name)).toContain(first.name);
    expect(results[0]!.grade).toBe(9);
  });

  it("suggests nothing for an empty search", () => {
    expect(searchTopics("science", 8, "  ")).toEqual([]);
  });
});

describe("quiz length and timer options", () => {
  it("allows 1 to 25 questions, default 5, presets 5/10/20", () => {
    expect([QUIZ_LENGTH.min, QUIZ_LENGTH.max, QUIZ_LENGTH.default]).toEqual([1, 25, 5]);
    expect([...QUIZ_LENGTH.presets]).toEqual([5, 10, 20]);
  });
  it("keeps typed lengths inside 1–25", () => {
    expect(clampQuizLength(0)).toBe(1);
    expect(clampQuizLength(40)).toBe(25);
    expect(clampQuizLength(12)).toBe(12);
    expect(clampQuizLength(Number.NaN)).toBe(5);
  });
  it("offers no limit, 5, 10, 15 and 30 seconds per question", () => {
    expect([...TIME_LIMITS]).toEqual([0, 5, 10, 15, 30]);
  });
});

describe("personal best badge", () => {
  const base = { id: "", date: "", grade: 9 as const, difficulty: "easy" as const, hintsUsed: 0, questions: [] };
  const prev: Attempt[] = [{ ...base, subject: "math", topic: "Algebra", correct: 3, total: 5 }];
  it("shows when beating an earlier score on the same topic", () => {
    expect(isPersonalBest(prev, { subject: "math", topic: "algebra ", correct: 4, total: 5 })).toBe(true);
  });
  it("does not show when only matching it, or on a first try", () => {
    expect(isPersonalBest(prev, { subject: "math", topic: "Algebra", correct: 3, total: 5 })).toBe(false);
    expect(isPersonalBest([], { subject: "math", topic: "Algebra", correct: 5, total: 5 })).toBe(false);
  });
});

describe("offline question bank", () => {
  const q = (text: string): QuizQuestion => ({ question: text, options: ["a", "b", "c", "d"], correctIndex: 2, hint: "", explanation: "", concept: "" });
  const key = bankKey({ subject: "cs", grade: 10, topic: " Binary " }, "hard");

  it("saves quizzes per subject, grade, difficulty and topic without duplicates", () => {
    let bank = addToBank({}, key, [q("one"), q("two")]);
    bank = addToBank(bank, key, [q("Two"), q("three")]);
    expect(bank[key]!.map((x) => x.question)).toEqual(["three", "one", "two"]);
    expect(key).toBe(bankKey({ subject: "cs", grade: 10, topic: "binary" }, "hard"));
  });

  it("keeps at most 50 questions per set", () => {
    const many = Array.from({ length: 60 }, (_, i) => q(`q${i}`));
    expect(addToBank({}, key, many)[key]).toHaveLength(50);
  });

  it("serves up to the requested number of saved questions with the right answer kept", () => {
    const bank = addToBank({}, key, [q("one"), q("two"), q("three")]);
    const picked = pickFromBank(bank, key, 2);
    expect(picked).toHaveLength(2);
    for (const p of picked) expect(p.options[p.correctIndex]).toBe("c");
    expect(pickFromBank(bank, "missing", 5)).toEqual([]);
  });
});

describe("bubble focus guard", () => {
  function play(s: GuardState, from: number, ms: number): GuardState {
    for (let t = from; t <= from + ms; t += 100) s = notePlay(s, t);
    return s;
  }
  it("turns bubble interaction off for exactly 5 minutes after 20 s of continuous play", () => {
    const s = play(INITIAL_GUARD, 0, 20_000);
    expect(isCoolingDown(s, 20_000)).toBe(true);
    expect(isCoolingDown(s, 20_000 + COOLDOWN_MS - 1)).toBe(true);
    expect(isCoolingDown(s, 20_000 + COOLDOWN_MS)).toBe(false);
    expect(COOLDOWN_MS).toBe(5 * 60_000);
  });
  it("does not trigger for short play broken up by pauses", () => {
    let s = play(INITIAL_GUARD, 0, 15_000);
    s = play(s, 18_000, 15_000); // 3 s pause resets the count
    expect(isCoolingDown(s, 33_000)).toBe(false);
  });
});
