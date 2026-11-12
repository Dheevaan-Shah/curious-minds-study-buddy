// Shared, browser-safe constants and types for Study Buddy.

export const SUBJECTS = [
  { value: "math", label: "Mathematics" },
  { value: "science", label: "Science" },
  { value: "cs", label: "Computer Science" },
] as const;

export const GRADES = [8, 9, 10] as const;

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

export const QUIZ_LENGTH = 5;

export type Subject = (typeof SUBJECTS)[number]["value"];
export type Grade = (typeof GRADES)[number];
export type Difficulty = (typeof DIFFICULTIES)[number]["value"];

export const SUBJECT_VALUES = SUBJECTS.map((s) => s.value) as [Subject, ...Subject[]];
export const DIFFICULTY_VALUES = DIFFICULTIES.map((d) => d.value) as [Difficulty, ...Difficulty[]];

export function subjectLabel(subject: Subject): string {
  return SUBJECTS.find((s) => s.value === subject)?.label ?? subject;
}

export const TOPIC_SUGGESTIONS: Record<Subject, Record<Grade, string[]>> = {
  math: {
    8: ["Linear equations", "Pythagoras' theorem", "Exponents", "Ratios & proportions"],
    9: ["Quadratic expressions", "Coordinate geometry", "Simultaneous equations", "Probability"],
    10: ["Quadratic equations", "Trigonometry", "Arithmetic progressions", "Circles"],
  },
  science: {
    8: ["Cells", "Force and pressure", "Chemical reactions", "Light and reflection"],
    9: ["Atoms and molecules", "Newton's laws of motion", "Tissues", "Work and energy"],
    10: ["Electricity", "Acids, bases and salts", "Heredity", "Life processes"],
  },
  cs: {
    8: ["Binary numbers", "Algorithms & flowcharts", "Computer networks", "Spreadsheets"],
    9: ["Python variables & loops", "Boolean logic", "Internet safety", "Data types"],
    10: ["Functions in Python", "Sorting algorithms", "Databases & SQL", "Cybersecurity basics"],
  },
};

export type StudySetup = { subject: Subject; grade: Grade; topic: string };

export type Explanation = {
  title: string;
  simpleExplanation: string[];
  analogy: string;
  keyPoints: string[];
  example: { problem: string; solution: string };
  commonMistake: string;
  checkYourself: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  concept: string;
};

export type Feedback = {
  overall: string;
  strengths: string[];
  areasToDevelop: { area: string; why: string; howToImprove: string }[];
  nextSteps: string[];
  suggestedTopics: { subject: Subject; topic: string; difficulty: Difficulty }[];
};

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };
