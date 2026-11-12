import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ListChecks, Pencil, TrendingUp } from "lucide-react";
import { SetupWizard, type WizardStep } from "@/components/study/SetupWizard";
import { LearnPanel } from "@/components/study/LearnPanel";
import { QuizPanel } from "@/components/study/QuizPanel";
import { ProgressPanel } from "@/components/study/ProgressPanel";
import { loadAttempts, saveAttempts, type Attempt } from "@/lib/quiz-utils";
import { subjectLabel, type Difficulty, type StudySetup, type Subject } from "@/lib/study-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Study Buddy — Maths, Science & Computer Science, grades 8–10" },
      {
        name: "description",
        content:
          "Get tricky concepts explained simply, take quizzes with smart hints, and see what to work on next.",
      },
      { property: "og:title", content: "Study Buddy — learn, quiz, improve" },
      {
        property: "og:description",
        content: "Simple explanations, hint-powered quizzes and feedback for grade 8–10 students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "learn" | "quiz" | "progress";

const MODES: { value: Tab; label: string; blurb: string; icon: typeof BookOpen }[] = [
  { value: "learn", label: "Learn", blurb: "Explained simply", icon: BookOpen },
  { value: "quiz", label: "Quiz", blurb: "Test yourself", icon: ListChecks },
  { value: "progress", label: "Progress", blurb: "Scores & feedback", icon: TrendingUp },
];

function Index() {
  const [setup, setSetup] = useState<StudySetup | null>(null);
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [tab, setTab] = useState<Tab>("learn");
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    setAttempts(loadAttempts());
  }, []);

  function addAttempt(a: Attempt) {
    setAttempts((prev) => {
      const next = [...prev, a];
      saveAttempts(next);
      return next;
    });
  }

  function practise(subject: Subject, topic: string, d: Difficulty) {
    setSetup((s) => (s ? { ...s, subject, topic } : s));
    setDifficulty(d);
    setTab("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (wizardStep !== null || !setup) {
    return (
      <SetupWizard
        key={wizardStep ?? 0}
        initial={setup ?? {}}
        startStep={wizardStep ?? 0}
        onDone={(s) => {
          setSetup(s);
          setWizardStep(null);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh" data-subject={setup.subject}>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-bold">
            Study Buddy<span className="text-tint">.</span>
          </div>
          <button
            type="button"
            onClick={() => setWizardStep(0)}
            className="label-mono underline-offset-4 hover:text-foreground hover:underline"
          >
            Start over
          </button>
        </div>

        {/* What we're studying */}
        <section className="sheet animate-rise mt-6 overflow-hidden">
          <div className="bg-tint-soft px-5 pb-6 pt-5 sm:px-7">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWizardStep(0)}
                className="group inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-sm font-medium transition-transform hover:-translate-y-0.5"
              >
                <span className="size-2 rounded-full bg-tint" />
                {subjectLabel(setup.subject)}
                <Pencil className="size-3 opacity-40 group-hover:opacity-100" />
              </button>
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="group inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-card px-3 py-1 text-sm font-medium transition-transform hover:-translate-y-0.5"
              >
                Grade {setup.grade}
                <Pencil className="size-3 opacity-40 group-hover:opacity-100" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setWizardStep(2)}
              className="group mt-4 flex items-start gap-2 text-left"
            >
              <h1 className="text-3xl font-bold leading-tight sm:text-5xl">{setup.topic}</h1>
              <Pencil className="mt-2 size-4 shrink-0 opacity-30 group-hover:opacity-100 sm:mt-4" />
            </button>
          </div>
        </section>

        {/* Modes */}
        <nav role="tablist" aria-label="Study modes" className="mt-6 grid grid-cols-3 gap-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="tab"
              aria-selected={tab === m.value}
              aria-checked={tab === m.value}
              onClick={() => setTab(m.value)}
              className="tile gap-1 p-3 sm:p-4"
            >
              <m.icon className="size-5 text-tint" />
              <span className="mt-1 flex items-center gap-1.5 font-display text-base font-semibold sm:text-lg">
                {m.label}
                {m.value === "progress" && attempts.length > 0 && (
                  <span className="rounded-full bg-ink px-1.5 font-mono text-[0.65rem] text-primary-foreground">
                    {attempts.length}
                  </span>
                )}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">{m.blurb}</span>
            </button>
          ))}
        </nav>

        <div role="tabpanel" className="mt-6">
          <div hidden={tab !== "learn"}>
            <LearnPanel setup={setup} onQuizMe={() => setTab("quiz")} />
          </div>
          <div hidden={tab !== "quiz"}>
            <QuizPanel
              setup={setup}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              onAttemptSaved={addAttempt}
              onPractise={practise}
            />
          </div>
          {tab === "progress" && (
            <div className="animate-step">
              <ProgressPanel
                attempts={attempts}
                onClear={() => {
                  saveAttempts([]);
                  setAttempts([]);
                }}
                onPractise={practise}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
