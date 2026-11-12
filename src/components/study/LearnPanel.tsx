import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lightbulb, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { explainTopic } from "@/lib/study.functions";
import { subjectLabel, type Explanation, type StudySetup } from "@/lib/study-config";
import { ErrorNote, Thinking } from "./ErrorNote";

export function LearnPanel({ setup, onQuizMe }: { setup: StudySetup; onQuizMe: () => void }) {
  const explain = useServerFn(explainTopic);
  const [confusion, setConfusion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Explanation | null>(null);
  const hasTopic = setup.topic.trim().length > 0;

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await explain({
        data: { ...setup, topic: setup.topic.trim(), ...(confusion.trim() ? { confusion: confusion.trim() } : {}) },
      });
      if (res.ok) setResult(res.data);
      else setError(res.error);
    } catch {
      setError("Couldn't get an explanation. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="confusion" className="label-mono block">
          What confuses you? (optional)
        </label>
        <Textarea
          id="confusion"
          value={confusion}
          maxLength={500}
          onChange={(e) => setConfusion(e.target.value)}
          placeholder="e.g. I don't get why we flip the sign when dividing by a negative"
          className="min-h-20 border-[1.5px] bg-card"
        />
      </div>
      <Button variant="ink" size="xl" className="w-full" disabled={!hasTopic || loading} onClick={run}>
        <Sparkles /> {result ? "Explain again" : "Explain it simply"}
      </Button>
      {!hasTopic && <p className="text-center text-sm text-muted-foreground">Type a topic above to start.</p>}

      {loading && <Thinking label="Thinking of the simplest way to explain this…" />}
      {error && <ErrorNote message={error} />}

      {result && !loading && (
        <article className="sheet animate-rise space-y-6 p-5 sm:p-7">
          <header className="space-y-1">
            <div className="label-mono">
              {subjectLabel(setup.subject)} · Grade {setup.grade}
            </div>
            <h3 className="text-2xl font-bold leading-tight">{result.title}</h3>
          </header>

          <div className="space-y-3 leading-relaxed">
            {result.simpleExplanation.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div className="rounded-md bg-muted p-4">
            <div className="label-mono mb-1">Think of it like this</div>
            <p className="leading-relaxed">{result.analogy}</p>
          </div>

          <div>
            <div className="label-mono mb-2">Remember</div>
            <ul className="space-y-2">
              {result.keyPoints.map((k, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm bg-ink font-mono text-[0.65rem] text-primary-foreground">
                    {i + 1}
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border-[1.5px] border-ink p-4">
            <div className="label-mono mb-1">Worked example</div>
            <p className="font-medium">{result.example.problem}</p>
            <pre className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground">
              {result.example.solution}
            </pre>
          </div>

          <div className="border-l-[3px] border-ink pl-4">
            <div className="label-mono mb-1">Watch out</div>
            <p>{result.commonMistake}</p>
          </div>

          <div className="flex flex-col gap-3 rounded-md bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Lightbulb className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">
                <span className="font-semibold">Check yourself: </span>
                {result.checkYourself}
              </p>
            </div>
            <Button variant="paper" onClick={onQuizMe} className="shrink-0">
              Quiz me on this
            </Button>
          </div>
        </article>
      )}
    </div>
  );
}
