import { MessageSquareText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { percentOf, subjectAverages, topicStats, type Attempt } from "@/lib/quiz-utils";
import { SUBJECTS, subjectLabel, type Difficulty, type Subject } from "@/lib/study-config";
import { ErrorNote, Thinking } from "./ErrorNote";
import { FeedbackView } from "./FeedbackView";
import { useFeedback } from "./useFeedback";

export function ProgressPanel({
  attempts,
  onClear,
  onPractise,
}: {
  attempts: Attempt[];
  onClear: () => void;
  onPractise: (subject: Subject, topic: string, difficulty: Difficulty) => void;
}) {
  const fb = useFeedback();

  if (attempts.length === 0) {
    return (
      <div className="rounded-md border-[1.5px] border-dashed border-border bg-card p-8 text-center">
        <h3 className="text-lg font-semibold">No quiz scores yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Take a quiz and your scores will appear here, along with feedback on what to work on.
        </p>
      </div>
    );
  }

  const bySubject = subjectAverages(attempts);
  const topics = topicStats(attempts);
  const recent = [...attempts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const totalQs = attempts.reduce((s, a) => s + a.total, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Quizzes", value: attempts.length },
          { label: "Questions", value: totalQs },
          { label: "Average", value: `${totalQs ? Math.round((totalCorrect / totalQs) * 100) : 0}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-md border-[1.5px] border-ink bg-card p-3">
            <div className="label-mono">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="sheet p-5 space-y-3">
        <h3 className="label-mono">By subject</h3>
        {SUBJECTS.map((s) => {
          const pct = bySubject[s.value];
          return (
            <div key={s.value} data-subject={s.value}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{s.label}</span>
                <span className="font-mono text-muted-foreground">{pct === undefined ? "—" : `${pct}%`}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-tint transition-all" style={{ width: `${pct ?? 0}%` }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="sheet p-5">
        <h3 className="label-mono mb-3">Topics · weakest first</h3>
        <ul className="divide-y divide-border">
          {topics.map((t) => (
            <li key={t.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{t.topic}</div>
                <div className="text-xs text-muted-foreground">
                  {subjectLabel(t.subject)} · {t.attempts} quiz{t.attempts === 1 ? "" : "zes"} · best {t.bestPercent}%
                </div>
              </div>
              <span className="font-display text-lg font-bold">{t.averagePercent}%</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet p-5">
        <h3 className="label-mono mb-3">Recent quizzes</h3>
        <ul className="space-y-2">
          {recent.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate">{a.topic}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(a.date).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · Grade {a.grade} · {a.difficulty}
                </div>
              </div>
              <span className="shrink-0 font-mono">
                {a.correct}/{a.total} <span className="text-muted-foreground">({percentOf(a)}%)</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Button variant="ink" size="xl" className="w-full" disabled={fb.loading} onClick={() => fb.run(attempts)}>
        <MessageSquareText /> Get feedback & what to develop
      </Button>
      {fb.loading && <Thinking label="Looking for patterns in your answers…" />}
      {fb.error && <ErrorNote message={fb.error} />}
      {fb.feedback && !fb.loading && <FeedbackView feedback={fb.feedback} onPractise={onPractise} />}

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            if (window.confirm("Delete all saved quiz scores on this device?")) {
              fb.reset();
              onClear();
            }
          }}
        >
          <Trash2 /> Clear my scores
        </Button>
      </div>
    </div>
  );
}
