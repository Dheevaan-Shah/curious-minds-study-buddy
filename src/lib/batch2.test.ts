import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE,
  RAINBOW_PRICE,
  SHOP_ITEMS,
  coinsForQuiz,
  currentStreak,
  purchase,
  recordStreak,
  recordsBySubject,
  streakBoostPercent,
  toggleEquip,
} from "./gamification";
import { flashcardsFromBank, bankKey } from "./quiz-bank";
import type { Attempt } from "./quiz-utils";

const attempt = (topic: string, correct: number, total: number, subject: Attempt["subject"] = "math"): Attempt => ({
  id: `${topic}-${correct}-${total}`,
  date: "2026-11-17T10:00:00.000Z",
  subject,
  grade: 9,
  topic,
  difficulty: "medium",
  correct,
  total,
  hintsUsed: 0,
  questions: [],
});

describe("coins", () => {
  it("pays 10 per correct answer times the difficulty (easy ×1, medium ×1.5, hard ×2)", () => {
    expect(coinsForQuiz(4, 5, "easy")).toBe(40);
    expect(coinsForQuiz(4, 5, "medium")).toBe(60);
    expect(coinsForQuiz(4, 5, "hard")).toBe(80);
  });

  it("pays more for longer quizzes at the same score", () => {
    expect(coinsForQuiz(20, 20, "easy")).toBeGreaterThan(coinsForQuiz(5, 5, "easy"));
  });

  it("adds +10% per streak day with no cap", () => {
    expect(coinsForQuiz(10, 10, "easy", 1)).toBe(110);
    expect(coinsForQuiz(10, 10, "easy", 10)).toBe(200);
    expect(coinsForQuiz(10, 10, "easy", 20)).toBe(300);
    expect(coinsForQuiz(10, 10, "easy", 50)).toBe(600);
    expect(streakBoostPercent(10)).toBe(100);
  });
});

describe("streak", () => {
  it("adds a day on consecutive days and resets to 1 after a skipped day", () => {
    let s = recordStreak({ lastDate: null, count: 0 }, "2026-11-15");
    expect(s.count).toBe(1);
    s = recordStreak(s, "2026-11-15");
    expect(s.count).toBe(1);
    s = recordStreak(s, "2026-11-16");
    expect(s.count).toBe(2);
    s = recordStreak(s, "2026-11-18");
    expect(s.count).toBe(1);
  });

  it("shows 0 once a whole day has been missed", () => {
    const s = { lastDate: "2026-11-15", count: 4 };
    expect(currentStreak(s, "2026-11-16")).toBe(4);
    expect(currentStreak(s, "2026-11-17")).toBe(0);
  });
});

describe("shop", () => {
  it("sells Rainbow Mode for 9,999 coins", () => {
    expect(RAINBOW_PRICE).toBe(9999);
    expect(SHOP_ITEMS.find((i) => i.id === "accent-rainbow")?.price).toBe(9999);
  });

  it("has the eight colours and eight icons", () => {
    expect(SHOP_ITEMS.filter((i) => i.kind === "accent" && !i.legendary)).toHaveLength(8);
    expect(SHOP_ITEMS.filter((i) => i.kind === "icon")).toHaveLength(8);
  });

  it("only sells when you have enough coins, and only once", () => {
    expect(purchase({ ...EMPTY_PROFILE, coins: 9998 }, "accent-rainbow")).toEqual({ ok: false, reason: "coins" });
    const res = purchase({ ...EMPTY_PROFILE, coins: 10000 }, "accent-rainbow");
    expect(res.ok && res.profile.coins).toBe(1);
    if (res.ok) expect(purchase({ ...res.profile, coins: 99999 }, "accent-rainbow")).toEqual({ ok: false, reason: "owned" });
  });

  it("can't equip an item you don't own", () => {
    expect(toggleEquip(EMPTY_PROFILE, "icon-crown").equippedIcon).toBeNull();
    expect(toggleEquip({ ...EMPTY_PROFILE, owned: ["icon-crown"] }, "icon-crown").equippedIcon).toBe("icon-crown");
  });
});

describe("records", () => {
  it("keeps the best score per topic, grouped by subject", () => {
    const r = recordsBySubject([attempt("Fractions", 2, 5), attempt("fractions ", 5, 5), attempt("Atoms", 3, 4, "science")]);
    expect(r.math).toHaveLength(1);
    expect(r.math![0]!.best.correct).toBe(5);
    expect(r.math![0]!.attempts).toBe(2);
    expect(r.science![0]!.percent).toBe(75);
  });
});

describe("offline flashcards", () => {
  it("turns saved quiz questions for the topic into cards", () => {
    const setup = { subject: "math" as const, grade: 9 as const, topic: "Fractions" };
    const q = { question: "1/2 + 1/4?", options: ["3/4", "1", "2/6", "1/8"], correctIndex: 0, hint: "", explanation: "Common denominator.", concept: "Adding fractions" };
    const cards = flashcardsFromBank({ [bankKey(setup, "easy")]: [q], [bankKey(setup, "hard")]: [q] }, setup);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.back).toContain("3/4");
  });
});
