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
      { name: "Integers & number lines", blurb: "Positive and negative numbers" },
      { name: "Fractions & decimals", blurb: "Parts of a whole, made simple" },
      { name: "Angles & lines", blurb: "Parallel lines, transversals and turns" },
      { name: "Algebraic expressions", blurb: "Letters standing in for numbers" },
      { name: "Square & cube roots", blurb: "Undoing powers" },
      { name: "Simple interest", blurb: "How money grows over time" },
    ],
    9: [
      { name: "Polynomials", blurb: "Expanding and factorising" },
      { name: "Coordinate geometry", blurb: "Points, slopes and straight lines" },
      { name: "Simultaneous equations", blurb: "Two equations, two unknowns" },
      { name: "Probability", blurb: "Chances and possible outcomes" },
      { name: "Triangles & congruence", blurb: "When shapes match exactly" },
      { name: "Number systems", blurb: "Rational, irrational numbers and surds" },
      { name: "Quadrilaterals", blurb: "Parallelograms, rhombuses and trapeziums" },
      { name: "Surface areas & volumes", blurb: "Cones, spheres and cylinders" },
      { name: "Linear inequalities", blurb: "Greater than, less than, solved" },
      { name: "Heron's formula", blurb: "Triangle area from its sides" },
      { name: "Constructions", blurb: "Compass and ruler geometry" },
      { name: "Introduction to Euclid's geometry", blurb: "Axioms, proofs and postulates" },
    ],
    10: [
      { name: "Quadratic equations", blurb: "Factorise, use the formula, graph" },
      { name: "Trigonometry", blurb: "sin, cos and tan in triangles" },
      { name: "Arithmetic progressions", blurb: "Patterns with a common difference" },
      { name: "Circles & tangents", blurb: "Angles, chords and tangents" },
      { name: "Statistics", blurb: "Grouped data and averages" },
      { name: "Similar triangles", blurb: "Scale factors and proportions" },
      { name: "Real numbers", blurb: "HCF, LCM and prime factorisation" },
      { name: "Pair of linear equations", blurb: "Graphs, substitution and elimination" },
      { name: "Heights & distances", blurb: "Trigonometry in the real world" },
      { name: "Probability with cards & dice", blurb: "Counting favourable outcomes" },
      { name: "Coordinate geometry: distance & section", blurb: "Formulas between points" },
      { name: "Areas related to circles", blurb: "Sectors, segments and rings" },
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
      { name: "Friction", blurb: "The force that resists motion" },
      { name: "Metals & non-metals", blurb: "Properties and everyday uses" },
      { name: "Combustion & flame", blurb: "How things burn" },
      { name: "Reproduction in animals", blurb: "How life continues" },
      { name: "Stars & the solar system", blurb: "Our neighbourhood in space" },
      { name: "Conservation of plants & animals", blurb: "Protecting living things" },
    ],
    9: [
      { name: "Atoms & molecules", blurb: "What everything is made of" },
      { name: "Newton's laws of motion", blurb: "Why things move the way they do" },
      { name: "Tissues", blurb: "Cells working as a team" },
      { name: "Work, energy & power", blurb: "Energy in action" },
      { name: "Gravitation", blurb: "Why apples fall and planets orbit" },
      { name: "States of matter", blurb: "Solids, liquids and gases" },
      { name: "Structure of the atom", blurb: "Protons, neutrons and electrons" },
      { name: "The fundamental unit of life", blurb: "Inside the cell" },
      { name: "Sound waves", blurb: "How sound travels and echoes" },
      { name: "Natural resources", blurb: "Air, water and soil cycles" },
      { name: "Improvement in food resources", blurb: "Crops, farming and yields" },
      { name: "Why do we fall ill?", blurb: "Diseases and how to prevent them" },
    ],
    10: [
      { name: "Electricity", blurb: "Current, voltage and resistance" },
      { name: "Acids, bases & salts", blurb: "pH and neutralisation" },
      { name: "Heredity & evolution", blurb: "Genes and inherited traits" },
      { name: "Life processes", blurb: "Breathing, digestion, transport" },
      { name: "Refraction & lenses", blurb: "How lenses bend light" },
      { name: "Periodic table", blurb: "Patterns in the elements" },
      { name: "Magnetic effects of current", blurb: "Electromagnets and motors" },
      { name: "Carbon & its compounds", blurb: "The chemistry of life" },
      { name: "Control & coordination", blurb: "Nerves, hormones and reflexes" },
      { name: "How do organisms reproduce?", blurb: "From cells to new life" },
      { name: "Our environment", blurb: "Ecosystems and food chains" },
      { name: "Metals & non-metals: reactions", blurb: "Reactivity series and corrosion" },
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
      { name: "Input & output devices", blurb: "Keyboards to printers" },
      { name: "Introduction to HTML", blurb: "Building your first web page" },
      { name: "Operating systems", blurb: "The manager inside your computer" },
      { name: "Scratch programming", blurb: "Coding with blocks" },
      { name: "File management", blurb: "Folders, formats and storage" },
      { name: "Email & communication tools", blurb: "Sending messages that work" },
    ],
    9: [
      { name: "Python variables & data types", blurb: "Storing information in code" },
      { name: "Loops in Python", blurb: "Repeat without rewriting" },
      { name: "Boolean logic & gates", blurb: "AND, OR and NOT" },
      { name: "If-else conditions", blurb: "Making decisions in code" },
      { name: "How the internet works", blurb: "Packets, IP addresses and DNS" },
      { name: "Data representation", blurb: "Text, images and sound as bits" },
      { name: "Strings in Python", blurb: "Working with text in code" },
      { name: "HTML & CSS basics", blurb: "Structure and style for web pages" },
      { name: "Cyber ethics", blurb: "Doing the right thing online" },
      { name: "Number systems: hex & octal", blurb: "Beyond binary" },
      { name: "Intro to AI", blurb: "How machines learn" },
      { name: "Cloud computing", blurb: "Your files, everywhere" },
    ],
    10: [
      { name: "Functions in Python", blurb: "Reusable blocks of code" },
      { name: "Sorting & searching", blurb: "Bubble sort, binary search and more" },
      { name: "Databases & SQL", blurb: "Asking questions of data" },
      { name: "Lists & dictionaries", blurb: "Organising data in Python" },
      { name: "Cybersecurity basics", blurb: "Passwords, phishing, encryption" },
      { name: "Algorithm efficiency", blurb: "How fast is your code?" },
      { name: "File handling in Python", blurb: "Read and write files with code" },
      { name: "Object-oriented programming", blurb: "Classes and objects" },
      { name: "Web technologies", blurb: "How browsers and servers talk" },
      { name: "Networking protocols", blurb: "HTTP, TCP/IP and friends" },
      { name: "Tuples & sets in Python", blurb: "More ways to group data" },
      { name: "Emerging technologies", blurb: "AI, IoT and blockchain basics" },
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
