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

export type TopicSuggestion = { name: string; blurb: string };

export const TOPIC_SUGGESTIONS: Record<Subject, Record<Grade, TopicSuggestion[]>> = {
  math: {
    8: [
      { name: "Linear equations", blurb: "Solve for x, step by step" },
      { name: "Pythagoras' theorem", blurb: "Right triangles and a² + b² = c²" },
      { name: "Exponents & powers", blurb: "The laws of indices made easy" },
      { name: "Ratios & percentages", blurb: "Discounts, scales and sharing" },
      { name: "Area & volume", blurb: "Prisms, cylinders and more" },
      { name: "Data handling", blurb: "Mean, median, mode and graphs" },
    ],
    9: [
      { name: "Polynomials", blurb: "Expanding and factorising" },
      { name: "Coordinate geometry", blurb: "Points, slopes and straight lines" },
      { name: "Simultaneous equations", blurb: "Two equations, two unknowns" },
      { name: "Probability", blurb: "Chances and possible outcomes" },
      { name: "Triangles & congruence", blurb: "When shapes match exactly" },
      { name: "Number systems", blurb: "Rational, irrational numbers and surds" },
    ],
    10: [
      { name: "Quadratic equations", blurb: "Factorise, use the formula, graph" },
      { name: "Trigonometry", blurb: "sin, cos and tan in triangles" },
      { name: "Arithmetic progressions", blurb: "Patterns with a common difference" },
      { name: "Circles & tangents", blurb: "Angles, chords and tangents" },
      { name: "Statistics", blurb: "Grouped data and averages" },
      { name: "Similar triangles", blurb: "Scale factors and proportions" },
    ],
  },
  science: {
    8: [
      { name: "Cells", blurb: "The building blocks of life" },
      { name: "Force & pressure", blurb: "Pushes, pulls and squeezes" },
      { name: "Chemical reactions", blurb: "How substances change" },
      { name: "Light & reflection", blurb: "Mirrors and how we see" },
      { name: "Sound", blurb: "Vibrations, pitch and loudness" },
      { name: "Microorganisms", blurb: "Tiny friends and foes" },
    ],
    9: [
      { name: "Atoms & molecules", blurb: "What everything is made of" },
      { name: "Newton's laws of motion", blurb: "Why things move the way they do" },
      { name: "Tissues", blurb: "Cells working as a team" },
      { name: "Work, energy & power", blurb: "Energy in action" },
      { name: "Gravitation", blurb: "Why apples fall and planets orbit" },
      { name: "States of matter", blurb: "Solids, liquids and gases" },
    ],
    10: [
      { name: "Electricity", blurb: "Current, voltage and resistance" },
      { name: "Acids, bases & salts", blurb: "pH and neutralisation" },
      { name: "Heredity & evolution", blurb: "Genes and inherited traits" },
      { name: "Life processes", blurb: "Breathing, digestion, transport" },
      { name: "Refraction & lenses", blurb: "How lenses bend light" },
      { name: "Periodic table", blurb: "Patterns in the elements" },
    ],
  },
  cs: {
    8: [
      { name: "Binary numbers", blurb: "How computers count with 0 and 1" },
      { name: "Algorithms & flowcharts", blurb: "Step-by-step problem solving" },
      { name: "Computer networks", blurb: "How devices talk to each other" },
      { name: "Hardware & software", blurb: "The parts of a computer" },
      { name: "Spreadsheet formulas", blurb: "Make cells do the maths" },
      { name: "Online safety", blurb: "Staying safe on the internet" },
    ],
    9: [
      { name: "Python variables & data types", blurb: "Storing information in code" },
      { name: "Loops in Python", blurb: "Repeat without rewriting" },
      { name: "Boolean logic & gates", blurb: "AND, OR and NOT" },
      { name: "If-else conditions", blurb: "Making decisions in code" },
      { name: "How the internet works", blurb: "Packets, IP addresses and DNS" },
      { name: "Data representation", blurb: "Text, images and sound as bits" },
    ],
    10: [
      { name: "Functions in Python", blurb: "Reusable blocks of code" },
      { name: "Sorting & searching", blurb: "Bubble sort, binary search and more" },
      { name: "Databases & SQL", blurb: "Asking questions of data" },
      { name: "Lists & dictionaries", blurb: "Organising data in Python" },
      { name: "Cybersecurity basics", blurb: "Passwords, phishing, encryption" },
      { name: "Algorithm efficiency", blurb: "How fast is your code?" },
    ],
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
