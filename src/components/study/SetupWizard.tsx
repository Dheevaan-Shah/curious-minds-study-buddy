import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Atom, Calculator, Code2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GRADES,
  SUBJECTS,
  TOPIC_SUGGESTIONS,
  type Grade,
  type StudySetup,
  type Subject,
} from "@/lib/study-config";
import { cn } from "@/lib/utils";

export type WizardStep = 0 | 1 | 2;

const SUBJECT_INFO: Record<Subject, { icon: typeof Calculator; tagline: string }> = {
  math: { icon: Calculator, tagline: "Numbers, shapes, patterns and equations" },
  science: { icon: Atom, tagline: "How living things, matter and energy work" },
  cs: { icon: Code2, tagline: "Code, data and how computers think" },
};

const GRADE_LINES: Record<Grade, string> = {
  8: "Building the foundations",
  9: "Stepping it up",
  10: "Exam-ready thinking",
};

const QUESTIONS = ["What do you want to study?", "Which grade are you in?", "What topic should we tackle?"];

export function SetupWizard({
  initial,
  startStep = 0,
  onDone,
}: {
  initial: Partial<StudySetup>;
  startStep?: WizardStep;
  onDone: (setup: StudySetup) => void;
}) {
  const [step, setStep] = useState<WizardStep>(startStep);
  const [subject, setSubject] = useState<Subject | null>(initial.subject ?? null);
  const [grade, setGrade] = useState<Grade | null>(initial.grade ?? null);
  const [topic, setTopic] = useState(initial.topic ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    if (step === 2) inputRef.current?.focus();
  }, [step]);

  function pickAndAdvance(fn: () => void, nextStep: WizardStep) {
    fn();
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => setStep(nextStep), 260);
  }

  const suggestions = useMemo(() => {
    if (!subject || !grade) return [];
    const list = TOPIC_SUGGESTIONS[subject][grade];
    const q = topic.trim().toLowerCase();
    if (!q) return list;
    const matches = list.filter((t) => `${t.name} ${t.blurb}`.toLowerCase().includes(q));
    return matches;
  }, [subject, grade, topic]);

  function surprise() {
    if (!subject || !grade) return;
    const list = TOPIC_SUGGESTIONS[subject][grade].filter((t) => t.name !== topic);
    const pick = list[Math.floor(Math.random() * list.length)];
    if (pick) setTopic(pick.name);
  }

  function finish() {
    if (subject && grade && topic.trim()) onDone({ subject, grade, topic: topic.trim() });
  }

  const canNext = step === 0 ? !!subject : step === 1 ? !!grade : topic.trim().length > 0;

  return (
    <div className="flex min-h-dvh flex-col" data-subject={subject ?? undefined}>
      {/* Top bar */}
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 pt-5 sm:px-6">
        <div className="font-display text-lg font-bold">
          Study Buddy<span className="text-tint">.</span>
        </div>
        <div className="flex items-center gap-2" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-ink" : i < step ? "w-2 bg-ink" : "w-2 bg-accent",
              )}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div key={step} className="animate-step">
          <div className="label-mono mb-3">Question {step + 1} of 3 · required</div>
          <h1 className="mb-8 text-4xl font-bold leading-[1.05] sm:text-6xl">{QUESTIONS[step]}</h1>

          {step === 0 && (
            <div role="radiogroup" aria-label="Subject" className="grid gap-4 sm:grid-cols-3">
              {SUBJECTS.map((s) => {
                const Info = SUBJECT_INFO[s.value];
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={subject === s.value}
                    data-subject={s.value}
                    onClick={() => pickAndAdvance(() => setSubject(s.value), 1)}
                    className="tile min-h-36 sm:min-h-52"
                  >
                    <span className="flex size-11 items-center justify-center rounded-md bg-tint-soft text-tint">
                      <Info.icon className="size-6" />
                    </span>
                    <span className="mt-auto font-display text-xl font-semibold">{s.label}</span>
                    <span className="text-sm text-muted-foreground">{Info.tagline}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div role="radiogroup" aria-label="Grade" className="grid grid-cols-3 gap-3 sm:gap-4">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={grade === g}
                  aria-label={`Grade ${g}`}
                  onClick={() => pickAndAdvance(() => setGrade(g), 2)}
                  className="tile items-center text-center sm:min-h-52"
                >
                  <span className="label-mono">Grade</span>
                  <span className="font-display text-6xl font-bold leading-none sm:text-8xl">{g}</span>
                  <span className="hidden text-sm text-muted-foreground sm:block">{GRADE_LINES[g]}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  finish();
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <Input
                  ref={inputRef}
                  aria-label="Topic"
                  value={topic}
                  maxLength={120}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Type any topic, or pick one below"
                  className="h-14 flex-1 border-[1.5px] border-ink bg-card px-4 text-lg shadow-ink-sm focus-visible:ring-2 focus-visible:ring-tint"
                />
                <Button type="button" variant="paper" className="h-14" onClick={surprise}>
                  <Shuffle /> Surprise me
                </Button>
              </form>

              <div>
                <div className="label-mono mb-3">
                  {topic.trim() && suggestions.length === 0
                    ? "No match in our list — that's fine, we can still teach it"
                    : `Popular in grade ${grade}`}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestions.map((t, i) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setTopic(t.name)}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={cn(
                        "animate-rise rounded-md border-[1.5px] bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-ink hover:bg-tint-soft",
                        topic === t.name ? "border-tint bg-tint-soft ring-2 ring-tint" : "border-border",
                      )}
                    >
                      <div className="font-medium">{t.name}</div>
                      <div className="text-sm text-muted-foreground">{t.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => (s > 0 ? ((s - 1) as WizardStep) : s))}
            disabled={step === 0}
          >
            <ArrowLeft /> Back
          </Button>
          {step < 2 ? (
            <Button
              variant="ink"
              size="lg"
              disabled={!canNext}
              onClick={() => setStep((s) => (s + 1) as WizardStep)}
            >
              Next <ArrowRight />
            </Button>
          ) : (
            <Button variant="ink" size="lg" disabled={!canNext} onClick={finish}>
              Let's study <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
