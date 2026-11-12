import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getFeedback } from "@/lib/study.functions";
import { toFeedbackPayload, type Attempt } from "@/lib/quiz-utils";
import type { Feedback } from "@/lib/study-config";

export function useFeedback() {
  const fetchFeedback = useServerFn(getFeedback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function run(attempts: Attempt[]) {
    if (attempts.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFeedback({ data: { attempts: toFeedbackPayload(attempts) } });
      if (res.ok) setFeedback(res.data);
      else setError(res.error);
    } catch {
      setError("Couldn't get feedback. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, feedback, run, reset: () => setFeedback(null) };
}
