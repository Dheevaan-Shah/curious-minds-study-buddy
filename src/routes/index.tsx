import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ListChecks, TrendingUp } from "lucide-react";
import { SetupPanel } from "@/components/study/SetupPanel";
import { LearnPanel } from "@/components/study/LearnPanel";
import { QuizPanel } from "@/components/study/QuizPanel";
import { ProgressPanel } from "@/components/study/ProgressPanel";
import { loadAttempts, saveAttempts, type Attempt } from "@/lib/quiz-utils";
import type { Difficulty, StudySetup, Subject } from "@/lib/study-config";
import { cn } from "@/lib/utils";

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

const TABS: { value: Tab; label: string; icon: typeof BookOpen }[] = [
  { value: "learn", label: "Learn", icon: BookOpen },
  { value: "quiz", label: "Quiz", icon: ListChecks },
  { value: "progress", label: "Progress", icon: TrendingUp },
];

function Index() {
  const [setup, setSetup] = useState<StudySetup>({ subject: "math", grade: 8, topic: "" });
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
    setSetup((s) => ({ ...s, subject, topic }));
    setDifficulty(d);
    setTab("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
        <header className="mb-8">
          <div className="label-mono">Grades 8 – 10 · Maths · Science · Computer Science</div>
          <h1 className="mt-2 text-4xl font-bold leading-none sm:text-5xl">
            Study Buddy<span className="text-muted-foreground">.</span>
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Hard ideas, explained simply. Then quiz yourself and find out what to work on.
          </p>
        </header>

        <SetupPanel setup={setup} onChange={setSetup} />

        <nav
          role="tablist"
          aria-label="Study modes"
          className="mt-8 mb-5 grid grid-cols-3 gap-1 rounded-md border-[1.5px] border-ink bg-card p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-sm py-2.5 text-sm font-semibold transition-colors",
                tab === t.value ? "bg-ink text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
              {t.value === "progress" && attempts.length > 0 && (
                <span className="font-mono text-xs opacity-70">{attempts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div role="tabpanel">
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
            <ProgressPanel
              attempts={attempts}
              onClear={() => {
                saveAttempts([]);
                setAttempts([]);
              }}
              onPractise={practise}
            />
          )}
        </div>
      </div>
    </div>
  );
}
