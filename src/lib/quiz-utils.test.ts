import { describe, expect, it } from "vitest";
import { scoreAnswers, shuffleQuestion, topicStats, type Attempt } from "./quiz-utils";
import { DIFFICULTY_VALUES, GRADES, SUBJECT_VALUES } from "./study-config";

describe("study options", () => {
  it("offers grades 8, 9 and 10", () => {
    expect([...GRADES]).toEqual([8, 9, 10]);
  });
  it("offers easy, medium and hard quizzes", () => {
    expect(DIFFICULTY_VALUES).toEqual(["easy", "medium", "hard"]);
  });
  it("offers maths, science and computer science", () => {
    expect(SUBJECT_VALUES).toEqual(["math", "science", "cs"]);
  });
});

describe("scoreAnswers", () => {
  it("counts correct answers, hints and percent", () => {
    const q = (chosen: number, hint: boolean) => ({
      question: "q", concept: "c", options: ["a", "b", "c", "d"], correctIndex: 1, chosenIndex: chosen, usedHint: hint,
    });
    expect(scoreAnswers([q(1, false), q(1, true), q(0, true), q(2, false)])).toEqual({
      correct: 2, total: 4, hintsUsed: 2, percent: 50,
    });
  });
});

describe("shuffleQuestion", () => {
  it("keeps the same correct answer text after shuffling", () => {
    const q = { question: "2+2", options: ["4", "3", "5", "22"], correctIndex: 0, hint: "", explanation: "", concept: "" };
    const seq = [0.9, 0.1, 0.5];
    let i = 0;
    const out = shuffleQuestion(q, () => seq[i++ % seq.length]!);
    expect(out.options[out.correctIndex]).toBe("4");
    expect([...out.options].sort()).toEqual([...q.options].sort());
  });
});

describe("topicStats", () => {
  const base = { grade: 8 as const, difficulty: "easy" as const, hintsUsed: 0, questions: [], date: "2026-01-01" };
  it("averages by topic across quizzes and lists the weakest first", () => {
    const attempts: Attempt[] = [
      { ...base, id: "1", subject: "math", topic: "Algebra", correct: 5, total: 5 },
      { ...base, id: "2", subject: "math", topic: "algebra ", correct: 3, total: 5 },
      { ...base, id: "3", subject: "science", topic: "Cells", correct: 1, total: 5 },
    ];
    const stats = topicStats(attempts);
    expect(stats.map((s) => [s.topic, s.averagePercent, s.bestPercent, s.attempts])).toEqual([
      ["Cells", 20, 20, 1],
      ["Algebra", 80, 100, 2],
    ]);
  });
});
