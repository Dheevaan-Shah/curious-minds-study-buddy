import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, CloudOff, Flame, Lightbulb, MessageSquareText, RotateCcw, Sparkles, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { generateQuiz } from "@/lib/study.functions";
import { clampQuizLength, scoreAnswers, type AnsweredQuestion, type Attempt } from "@/lib/quiz-utils";
import { isPersonalBest } from "@/lib/gamification";
import { rewardQuiz, type QuizReward } from "@/lib/game-store";
import { addToBank, bankKey, loadBank, pickFromBank, saveBank } from "@/lib/quiz-bank";
import { readCssHex } from "@/lib/css-color";
import {
  DIFFICULTIES,
  QUIZ_LENGTH,
  TIME_LIMITS,
  subjectLabel,
  type Difficulty,
  type QuizQuestion,
  type StudySetup,
  type Subject,
  type TimeLimit,
} from "@/lib/study-config";
import { ErrorNote, Thinking } from "./ErrorNote";
import { FeedbackView } from "./FeedbackView";
import { useFeedback } from "./useFeedback";

type Running = {
  setup: StudySetup;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  timeLimit: TimeLimit;
  offline: boolean;
  index: number;
  selected: number | null;
  locked: boolean;
  timedOut: boolean;
  hintShown: boolean;
  answers: AnsweredQuestion[];
};

type Finished = { attempt: Attempt; personalBest: boolean; reward: QuizReward };

const LETTERS = ["A", "B", "C", "D"];
const AUTO_ADVANCE_MS = 3000;

const DIFFICULTY_LINES: Record<Difficulty, string> = {
  easy: "Warm up with the basics",
  medium: "Use the idea in a few steps",
  hard: "Tricky, multi-step challenges",
};

/** Countdown bar + seconds left. Calls onExpire once when time runs out; freezes when paused. */
function Countdown({ seconds, paused, onExpire }: { seconds: number; paused: boolean; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (paused) return;
    const end = Date.now() + left * 1000;
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 200);
    const done = setTimeout(() => expire.current(), left * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
    // Only restart when pausing/resuming; `left` is the starting point at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent" aria-hidden>
        <div
          className="animate-countdown h-full rounded-full bg-tint"
          style={{ animationDuration: `${seconds}s`, animationPlayState: paused ? "paused" : "running" }}
        />
      </div>
      <span
        className={cn("inline-flex w-12 items-center justify-end gap-1 font-mono text-sm tabular-nums", left <= 3 && !paused && "text-danger")}
        aria-label={`${left} seconds left`}
      >
        <Timer className="size-3.5" />
        {left}s
      </span>
    </div>
  );
}

function celebrate(el: HTMLElement | null, big: boolean) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let cancelled = false;
  void import("canvas-confetti").then(({ default: confetti }) => {
    if (cancelled) return;
    const colors = ["--tint", "--success", "--maths", "--science", "--cs"].map((v) => readCssHex(v, el ?? undefined));
    const base = { colors, disableForReducedMotion: true, scalar: 0.9, ticks: 220 };
    confetti({ ...base, particleCount: big ? 140 : 70, spread: 80, origin: { y: 0.3 } });
    if (big) {
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } }), 250);
      setTimeout(() => !cancelled && confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } }), 400);
    }
  });
  return () => {
    cancelled = true;
  };
}

export function QuizPanel({
  setup,
  difficulty,
  attempts,
  onDifficultyChange,
  onAttemptSaved,
  onPractise,
}: {
  setup: StudySetup;
  difficulty: Difficulty;
  attempts: Attempt[];
  onDifficultyChange: (d: Difficulty) => void;
  onAttemptSaved: (attempt: Attempt) => void;
  onPractise: (subject: Subject, topic: string, difficulty: Difficulty) => void;
}) {
  const makeQuiz = useServerFn(generateQuiz);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Running | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [count, setCount] = useState<number>(QUIZ_LENGTH.default);
  const [countText, setCountText] = useState(String(QUIZ_LENGTH.default));
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(0);
  const resultsRef = useRef<HTMLElement>(null);
  const fb = useFeedback();
  const hasTopic = setup.topic.trim().length > 0;

  function setLength(n: number) {
    const v = clampQuizLength(n);
    setCount(v);
    setCountText(String(v));
  }

  function begin(topicSetup: StudySetup, questions: QuizQuestion[], offline: boolean) {
    setRun({
      setup: topicSetup,
      difficulty,
      questions,
      timeLimit,
      offline,
      index: 0,
      selected: null,
      locked: false,
      timedOut: false,
      hintShown: false,
      answers: [],
    });
  }

  async function start() {
    setLoading(true);
    setError(null);
    setFinished(null);
    fb.reset();
    setRun(null);
    const topicSetup = { ...setup, topic: setup.topic.trim() };
    const key = bankKey(topicSetup, difficulty);
    // If AI generation fails, practise from questions saved on this device earlier.
    const fallback = (message: string) => {
      const saved = pickFromBank(loadBank(), key, count);
      if (saved.length) begin(topicSetup, saved, true);
      else setError(message);
    };
    try {
      const res = await makeQuiz({ data: { ...topicSetup, difficulty, count } });
      if (res.ok) {
        saveBank(addToBank(loadBank(), key, res.data));
        begin(topicSetup, res.data, false);
      } else fallback(res.error);
    } catch {
      fallback("Couldn't make a quiz. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function lock(timedOut: boolean) {
    setRun((r) => {
      if (!r || r.locked) return r;
      if (!timedOut && r.selected === null) return r;
      const q = r.questions[r.index]!;
      return {
        ...r,
        locked: true,
        timedOut,
        answers: [
          ...r.answers,
          {
            question: q.question,
            concept: q.concept,
            options: q.options,
            correctIndex: q.correctIndex,
            chosenIndex: r.selected ?? -1,
            usedHint: r.hintShown,
          },
        ],
      };
    });
  }

  function next() {
    if (!run) return;
    if (run.index + 1 < run.questions.length) {
      setRun({ ...run, index: run.index + 1, selected: null, locked: false, timedOut: false, hintShown: false });
      return;
    }
    const s = scoreAnswers(run.answers);
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      subject: run.setup.subject,
      grade: run.setup.grade,
      topic: run.setup.topic,
      difficulty: run.difficulty,
      correct: s.correct,
      total: s.total,
      hintsUsed: s.hintsUsed,
      questions: run.answers,
    };
    const personalBest = isPersonalBest(attempts, attempt);
    const reward = rewardQuiz(attempt);
    onAttemptSaved(attempt);
    setFinished({ attempt, personalBest, reward });
    setRun(null);
  }

  // When time ran out, move on automatically after a short look at the answer.
  const nextRef = useRef(next);
  nextRef.current = next;
  useEffect(() => {
    if (!run?.locked || !run.timedOut) return;
    const t = setTimeout(() => nextRef.current(), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [run?.locked, run?.timedOut, run?.index]);

  useEffect(() => {
    if (!finished) return;
    const { correct, total } = finished.attempt;
    return celebrate(resultsRef.current, finished.personalBest || (total > 0 && correct === total));
  }, [finished]);

  // ---------- Results ----------
  if (finished) {
    const { attempt: done, personalBest, reward } = finished;
    const s = scoreAnswers(done.questions);
    const badges = [
      personalBest && { icon: "🏆", label: "Personal best" },
      s.total > 0 && s.correct === s.total && { icon: "⭐", label: "Perfect score" },
      { icon: "🎉", label: "Quiz completed" },
    ].filter(Boolean) as { icon: string; label: string }[];
    return (
      <div className="space-y-5">
        <section ref={resultsRef} className="sheet animate-rise p-5 sm:p-7">
          <div className="label-mono">
            {subjectLabel(done.subject)} · {done.topic} · {done.difficulty}
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="font-display text-6xl font-bold leading-none">
              {s.correct}
              <span className="text-3xl text-muted-foreground">/{s.total}</span>
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap gap-1.5">
                {badges.map((b, i) => (
                  <span
                    key={b.label}
                    style={{ animationDelay: `${150 + i * 120}ms` }}
                    className="animate-rise inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-card px-2.5 py-1 text-sm font-medium"
                  >
                    <span aria-hidden>{b.icon}</span>
                    {b.label}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 text-sm text-muted-foreground">
                {s.percent}% · {s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"} used
              </div>
              <div className="mt-1 text-sm font-medium" aria-live="polite">
                <span className="font-mono">+{reward.coins} 🪙</span>
                <span className="text-muted-foreground">
                  {" "}· {reward.streak}-day streak (+{reward.boostPercent}% coins)
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {done.questions.map((q, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${q.chosenIndex === q.correctIndex ? "bg-success" : "bg-danger"}`}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {done.questions.map((q, i) => {
              const ok = q.chosenIndex === q.correctIndex;
              return (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm ${ok ? "bg-success text-primary-foreground" : "bg-danger text-primary-foreground"}`}>
                    {ok ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <span>
                    <span className="font-medium">{q.concept}</span>
                    {!ok && (
                      <span className="block text-muted-foreground">
                        {q.chosenIndex < 0 && "Ran out of time · "}Answer: {q.options[q.correctIndex]}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="ink" size="lg" disabled={fb.loading} onClick={() => fb.run([done])}>
              <MessageSquareText /> Get feedback on this quiz
            </Button>
            <Button variant="paper" size="lg" onClick={start} disabled={loading || !hasTopic}>
              <RotateCcw /> New quiz
            </Button>
          </div>
        </section>
        {loading && <Thinking label="Writing your questions…" />}
        {error && <ErrorNote message={error} />}
        {fb.loading && <Thinking label="Looking over your answers…" />}
        {fb.error && <ErrorNote message={fb.error} />}
        {fb.feedback && !fb.loading && <FeedbackView feedback={fb.feedback} onPractise={onPractise} />}
      </div>
    );
  }

  // ---------- Running quiz ----------
  if (run) {
    const q = run.questions[run.index]!;
    const isCorrect = run.locked && run.selected === q.correctIndex;
    let streak = 0;
    for (let i = run.answers.length - 1; i >= 0; i--) {
      const a = run.answers[i]!;
      if (a.chosenIndex !== a.correctIndex) break;
      streak++;
    }
    const verdict = run.timedOut
      ? isCorrect
        ? "Time's up — but you picked the right one!"
        : "Time's up!"
      : isCorrect
        ? "Correct!"
        : "Not quite.";
    return (
      <section
        className={cn(
          "sheet animate-step space-y-5 p-5 sm:p-8",
          run.locked && (isCorrect ? "flash-success" : "flash-danger"),
        )}
        key={run.index}
      >
        {run.timeLimit > 0 && (
          <Countdown seconds={run.timeLimit} paused={run.locked} onExpire={() => lock(true)} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-mono">
            Question {run.index + 1} of {run.questions.length} · {run.difficulty}
          </span>
          <div className="flex items-center gap-2">
            {run.offline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <CloudOff className="size-3.5" /> Practising from offline bank
              </span>
            )}
            {streak >= 2 && (
              <span className="animate-rise inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
                <Flame className="size-3.5" /> {streak} in a row
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1" aria-hidden>
          {run.questions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i < run.answers.length
                  ? run.answers[i]!.chosenIndex === run.answers[i]!.correctIndex
                    ? "bg-success"
                    : "bg-danger"
                  : i === run.index
                    ? "bg-ink"
                    : "bg-accent",
              )}
            />
          ))}
        </div>

        <h3 className="whitespace-pre-wrap text-xl font-semibold leading-snug sm:text-2xl">{q.question}</h3>

        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            let state = "idle";
            if (run.locked) {
              if (i === q.correctIndex) state = run.selected === q.correctIndex ? "correct" : "reveal";
              else if (i === run.selected) state = "wrong";
              else state = "muted";
            } else if (i === run.selected) state = "selected";
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={run.selected === i}
                disabled={run.locked}
                data-state={state}
                onClick={() => setRun({ ...run, selected: i })}
                className="option-card"
              >
                <span className="font-mono text-sm font-medium">
                  {state === "correct" || state === "reveal" ? (
                    <Check className="size-4 text-success" />
                  ) : state === "wrong" ? (
                    <X className="size-4 text-danger" />
                  ) : (
                    LETTERS[i]
                  )}
                </span>
                <span className="whitespace-pre-wrap">{opt}</span>
              </button>
            );
          })}
        </div>

        {run.hintShown && (
          <div className="flex gap-2 rounded-md bg-muted p-3 text-sm animate-rise">
            <Lightbulb className="mt-0.5 size-4 shrink-0" />
            <span>
              <span className="font-semibold">Hint: </span>
              {q.hint}
            </span>
          </div>
        )}

        {run.locked && (
          <div
            className={cn(
              "animate-rise rounded-md border-[1.5px] p-4 text-sm",
              isCorrect ? "border-success bg-success-soft" : "border-danger bg-danger-soft",
            )}
          >
            <div
              className={cn(
                "mb-1 flex items-center gap-1.5 font-display text-base font-semibold",
                isCorrect ? "text-success" : "text-danger",
              )}
            >
              {run.timedOut ? <Timer className="size-4" /> : isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
              {verdict}
            </div>
            <p>{q.explanation}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {!run.locked ? (
            <>
              <Button
                variant="paper"
                disabled={run.hintShown}
                onClick={() => setRun({ ...run, hintShown: true })}
              >
                <Lightbulb /> {run.hintShown ? "Hint shown" : "Show hint"}
              </Button>
              <Button variant="ink" disabled={run.selected === null} onClick={() => lock(false)}>
                Check answer
              </Button>
            </>
          ) : (
            <>
              {run.timedOut && <span className="label-mono">Moving on in a moment…</span>}
              <Button variant="ink" className="sm:ml-auto" onClick={next}>
                {run.index + 1 < run.questions.length ? "Next question" : "See my score"} <ArrowRight />
              </Button>
            </>
          )}
        </div>
      </section>
    );
  }

  // ---------- Start ----------
  return (
    <div className="space-y-6">
      <div>
        <div className="label-mono mb-2">Pick a difficulty</div>
        <div role="radiogroup" aria-label="Quiz difficulty" className="grid grid-cols-3 gap-3">
          {DIFFICULTIES.map((d, i) => (
            <button
              key={d.value}
              type="button"
              role="radio"
              aria-checked={difficulty === d.value}
              onClick={() => onDifficultyChange(d.value)}
              className="tile items-center p-4 text-center"
            >
              <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((n) => (
                  <span key={n} className={cn("h-3 w-1.5 rounded-full", n <= i ? "bg-tint" : "bg-accent")} />
                ))}
              </span>
              <span className="font-display text-lg font-semibold">{d.label}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{DIFFICULTY_LINES[d.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="label-mono mb-2">How many questions</div>
          <div className="space-y-4 rounded-md border-[1.5px] border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <Slider
                min={QUIZ_LENGTH.min}
                max={QUIZ_LENGTH.max}
                step={1}
                value={[count]}
                onValueChange={([v]) => v !== undefined && setLength(v)}
                aria-label="Number of questions"
                className="flex-1"
              />
              <Input
                type="number"
                inputMode="numeric"
                min={QUIZ_LENGTH.min}
                max={QUIZ_LENGTH.max}
                value={countText}
                aria-label="Type the number of questions"
                onChange={(e) => {
                  setCountText(e.target.value);
                  const n = Number(e.target.value);
                  if (e.target.value !== "" && Number.isFinite(n)) setCount(clampQuizLength(n));
                }}
                onBlur={() => setCountText(String(count))}
                className="h-10 w-16 border-[1.5px] border-ink bg-card text-center font-mono text-base"
              />
            </div>
            <div role="radiogroup" aria-label="Quick quiz lengths" className="flex gap-2">
              {QUIZ_LENGTH.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={count === p}
                  onClick={() => setLength(p)}
                  className="choice min-h-8 flex-1 px-2 py-1"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="label-mono mb-2">Time per question</div>
          <div role="radiogroup" aria-label="Time per question" className="grid grid-cols-3 gap-2 rounded-md border-[1.5px] border-border bg-card p-4">
            {TIME_LIMITS.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={timeLimit === t}
                onClick={() => setTimeLimit(t)}
                className={cn("choice min-h-8 px-2 py-1", t === 0 && "col-span-3")}
              >
                {t === 0 ? "No limit" : `${t}s`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button variant="ink" size="xl" className="w-full" disabled={!hasTopic || loading} onClick={start}>
        <Sparkles /> Generate {count}-question quiz
      </Button>
      {!hasTopic && <p className="text-center text-sm text-muted-foreground">Type a topic above to start.</p>}
      {loading && <Thinking label="Writing your questions…" />}
      {error && <ErrorNote message={error} />}
    </div>
  );
}
