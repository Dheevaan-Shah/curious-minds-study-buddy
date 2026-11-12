import { ArrowUpRight, Check, Target } from "lucide-react";
import { DIFFICULTIES, subjectLabel, type Feedback, type Subject, type Difficulty } from "@/lib/study-config";

export function FeedbackView({
  feedback,
  onPractise,
}: {
  feedback: Feedback;
  onPractise?: (subject: Subject, topic: string, difficulty: Difficulty) => void;
}) {
  return (
    <article className="sheet animate-rise space-y-6 p-5 sm:p-7">
      <header className="space-y-2">
        <div className="label-mono">Study Buddy's feedback</div>
        <p className="text-lg leading-relaxed">{feedback.overall}</p>
      </header>

      {feedback.strengths.length > 0 && (
        <section>
          <h4 className="label-mono mb-2">What you're doing well</h4>
          <ul className="space-y-2">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className="label-mono mb-3">Areas to develop</h4>
        <div className="space-y-3">
          {feedback.areasToDevelop.map((a, i) => (
            <div key={i} className="rounded-md border-[1.5px] border-ink p-4">
              <div className="flex items-center gap-2 font-display text-base font-semibold">
                <Target className="size-4" /> {a.area}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{a.why}</p>
              <p className="mt-2 text-sm">
                <span className="font-semibold">Try this: </span>
                {a.howToImprove}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md bg-muted p-4">
        <h4 className="label-mono mb-2">Your next steps</h4>
        <ol className="space-y-2">
          {feedback.nextSteps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-sm font-medium">{String(i + 1).padStart(2, "0")}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      {feedback.suggestedTopics.length > 0 && (
        <section>
          <h4 className="label-mono mb-2">Practise next</h4>
          <div className="flex flex-wrap gap-2">
            {feedback.suggestedTopics.map((t, i) => (
              <button
                key={i}
                type="button"
                disabled={!onPractise}
                onClick={() => onPractise?.(t.subject, t.topic, t.difficulty)}
                className="group inline-flex items-center gap-2 rounded-md border-[1.5px] border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-ink disabled:cursor-default"
              >
                <span>
                  <span className="font-medium">{t.topic}</span>
                  <span className="block text-xs text-muted-foreground">
                    {subjectLabel(t.subject)} · {DIFFICULTIES.find((d) => d.value === t.difficulty)?.label}
                  </span>
                </span>
                {onPractise && <ArrowUpRight className="size-4 opacity-50 group-hover:opacity-100" />}
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
