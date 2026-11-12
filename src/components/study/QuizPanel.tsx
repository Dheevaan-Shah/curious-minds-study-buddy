import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Lightbulb, MessageSquareText, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateQuiz } from "@/lib/study.functions";
import { scoreAnswers, type AnsweredQuestion, type Attempt } from "@/lib/quiz-utils";
import {
  DIFFICULTIES,
  subjectLabel,
  type Difficulty,
  type QuizQuestion,
  type StudySetup,
  type Subject,
} from "@/lib/study-config";
import { ChoiceGroup } from "./ChoiceGroup";
import { ErrorNote, Thinking } from "./ErrorNote";
import { FeedbackView } from "./FeedbackView";
import { useFeedback } from "./useFeedback";

type Running = {
  setup: StudySetup;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  index: number;
  selected: number | null;
  locked: boolean;
  hintShown: boolean;
  answers: AnsweredQuestion[];
};

const LETTERS = ["A", "B", "C", "D"];

export function QuizPanel({
  setup,
  difficulty,
  onDifficultyChange,
  onAttemptSaved,
  onPractise,
}: {
  setup: StudySetup;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onAttemptSaved: (attempt: Attempt) => void;
  onPractise: (subject: Subject, topic: string, difficulty: Difficulty) => void;
}) {
  const makeQuiz = useServerFn(generateQuiz);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Running | null>(null);
  const [finished, setFinished] = useState<Attempt | null>(null);
  const fb = useFeedback();
  const hasTopic = setup.topic.trim().length > 0;

  async function start() {
    setLoading(true);
    setError(null);
    setFinished(null);
    fb.reset();
    setRun(null);
    const topicSetup = { ...setup, topic: setup.topic.trim() };
    try {
      const res = await makeQuiz({ data: { ...topicSetup, difficulty } });
      if (res.ok) {
        setRun({
          setup: topicSetup,
          difficulty,
          questions: res.data,
          index: 0,
          selected: null,
          locked: false,
          hintShown: false,
          answers: [],
        });
      } else setError(res.error);
    } catch {
      setError("Couldn't make a quiz. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function check() {
    if (!run || run.selected === null) return;
    const q = run.questions[run.index]!;
    setRun({
      ...run,
      locked: true,
      answers: [
        ...run.answers,
        {
          question: q.question,
          concept: q.concept,
          options: q.options,
          correctIndex: q.correctIndex,
          chosenIndex: run.selected,
          usedHint: run.hintShown,
        },
      ],
    });
  }

  function next() {
    if (!run) return;
    if (run.index + 1 < run.questions.length) {
      setRun({ ...run, index: run.index + 1, selected: null, locked: false, hintShown: false });
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
    onAttemptSaved(attempt);
    setFinished(attempt);
    setRun(null);
  }

  // ---------- Results ----------
  if (finished) {
    const s = scoreAnswers(finished.questions);
    return (
      <div className="space-y-5">
        <section className="sheet animate-rise p-5 sm:p-7">
          <div className="label-mono">
            {subjectLabel(finished.subject)} · {finished.topic} · {finished.difficulty}
          </div>
          <div className="mt-3 flex items-end gap-4">
            <div className="font-display text-6xl font-bold leading-none">
              {s.correct}
              <span className="text-3xl text-muted-foreground">/{s.total}</span>
            </div>
            <div className="pb-1 text-sm text-muted-foreground">
              {s.percent}% · {s.hintsUsed} hint{s.hintsUsed === 1 ? "" : "s"} used
            </div>
          </div>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {finished.questions.map((q, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${q.chosenIndex === q.correctIndex ? "bg-ink" : "bg-accent"}`}
              />
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {finished.questions.map((q, i) => {
              const ok = q.chosenIndex === q.correctIndex;
              return (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm ${ok ? "bg-ink text-primary-foreground" : "border border-dashed border-ink"}`}>
                    {ok ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <span>
                    <span className="font-medium">{q.concept}</span>
                    {!ok && (
                      <span className="block text-muted-foreground">
                        Answer: {q.options[q.correctIndex]}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="ink" size="lg" disabled={fb.loading} onClick={() => fb.run([finished])}>
              <MessageSquareText /> Get feedback on this quiz
            </Button>
            <Button variant="paper" size="lg" onClick={start} disabled={loading || !hasTopic}>
              <RotateCcw /> New quiz
            </Button>
          </div>
        </section>
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
    return (
      <section className="sheet animate-rise space-y-5 p-5 sm:p-7" key={run.index}>
        <div className="flex items-center justify-between">
          <span className="label-mono">
            Question {run.index + 1} of {run.questions.length}
          </span>
          <span className="label-mono">{run.difficulty}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {run.questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= run.index ? "bg-ink" : "bg-accent"}`} />
          ))}
        </div>

        <h3 className="whitespace-pre-wrap text-xl font-semibold leading-snug">{q.question}</h3>

        <div className="space-y-2" role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            let state = "idle";
            if (run.locked) {
              if (i === q.correctIndex) state = "correct";
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
                <span className="font-mono text-sm font-medium">{LETTERS[i]}</span>
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
          <div className="rounded-md border-[1.5px] border-ink p-4 text-sm animate-rise">
            <div className="mb-1 font-display text-base font-semibold">
              {isCorrect ? "Correct!" : "Not quite."}
            </div>
            <p>{q.explanation}</p>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {!run.locked ? (
            <>
              <Button
                variant="paper"
                disabled={run.hintShown}
                onClick={() => setRun({ ...run, hintShown: true })}
              >
                <Lightbulb /> {run.hintShown ? "Hint shown" : "Show hint"}
              </Button>
              <Button variant="ink" disabled={run.selected === null} onClick={check}>
                Check answer
              </Button>
            </>
          ) : (
            <Button variant="ink" className="sm:ml-auto" onClick={next}>
              {run.index + 1 < run.questions.length ? "Next question" : "See my score"} <ArrowRight />
            </Button>
          )}
        </div>
      </section>
    );
  }

  // ---------- Start ----------
  return (
    <div className="space-y-5">
      <ChoiceGroup
        label="Quiz difficulty"
        options={DIFFICULTIES}
        value={difficulty}
        onChange={onDifficultyChange}
      />
      <Button variant="ink" size="xl" className="w-full" disabled={!hasTopic || loading} onClick={start}>
        <Sparkles /> Generate quiz
      </Button>
      {!hasTopic && <p className="text-center text-sm text-muted-foreground">Type a topic above to start.</p>}
      {loading && <Thinking label="Writing your questions…" />}
      {error && <ErrorNote message={error} />}
    </div>
  );
}
