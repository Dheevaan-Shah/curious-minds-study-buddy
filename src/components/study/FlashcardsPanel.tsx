import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CloudOff, Layers, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { generateFlashcards } from "@/lib/study.functions";
import { flashcardsFromBank, loadBank } from "@/lib/quiz-bank";
import type { Flashcard, StudySetup } from "@/lib/study-config";
import { ErrorNote, Thinking } from "./ErrorNote";

type Mark = "got" | "review";
type Deck = { cards: Flashcard[]; offline: boolean; index: number; flipped: boolean; marks: Mark[] };

export function FlashcardsPanel({ setup, active }: { setup: StudySetup; active: boolean }) {
  const make = useServerFn(generateFlashcards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const hasTopic = setup.topic.trim().length > 0;

  async function start() {
    setLoading(true);
    setError(null);
    setDeck(null);
    const topicSetup = { ...setup, topic: setup.topic.trim() };
    const fallback = (message: string) => {
      const saved = flashcardsFromBank(loadBank(), topicSetup);
      if (saved.length) setDeck({ cards: saved, offline: true, index: 0, flipped: false, marks: [] });
      else setError(message);
    };
    try {
      const res = await make({ data: topicSetup });
      if (res.ok) setDeck({ cards: res.data, offline: false, index: 0, flipped: false, marks: [] });
      else fallback(res.error);
    } catch {
      fallback("Couldn't make flashcards. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const flip = useCallback(() => setDeck((d) => (d && d.index < d.cards.length ? { ...d, flipped: !d.flipped } : d)), []);

  function mark(m: Mark) {
    setDeck((d) => (d ? { ...d, marks: [...d.marks, m], index: d.index + 1, flipped: false } : d));
  }

  function restart(cards: Flashcard[]) {
    setDeck((d) => (d ? { ...d, cards, index: 0, flipped: false, marks: [] } : d));
  }

  // Space flips the card while this mode is open (not while typing).
  useEffect(() => {
    if (!active || !deck) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "Space" || t?.closest("input, textarea, button, [role=dialog]")) return;
      e.preventDefault();
      flip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, deck, flip]);

  // ---------- Summary ----------
  if (deck && deck.index >= deck.cards.length) {
    const got = deck.marks.filter((m) => m === "got").length;
    const review = deck.cards.filter((_, i) => deck.marks[i] === "review");
    return (
      <section className="sheet animate-rise space-y-5 p-5 sm:p-7">
        <div className="label-mono">Deck finished</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border-[1.5px] border-success bg-success-soft p-4">
            <div className="font-display text-4xl font-bold text-success">{got}</div>
            <div className="text-sm">cards mastered</div>
          </div>
          <div className="rounded-md border-[1.5px] border-warn bg-warn-soft p-4">
            <div className="font-display text-4xl font-bold text-warn">{review.length}</div>
            <div className="text-sm">to review</div>
          </div>
        </div>
        {review.length > 0 && (
          <ul className="space-y-2">
            {review.map((c, i) => (
              <li key={i} className="rounded-md border-[1.5px] border-border p-3 text-sm">
                <div className="font-medium">{c.front}</div>
                <div className="text-muted-foreground">{c.back}</div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="ink" size="lg" onClick={() => restart(deck.cards)}>
            <RotateCcw /> Restart deck
          </Button>
          {review.length > 0 && (
            <Button variant="paper" size="lg" onClick={() => restart(review)}>
              <RefreshCw /> Review {review.length} again
            </Button>
          )}
          <Button variant="paper" size="lg" onClick={start} disabled={loading}>
            <Sparkles /> New deck
          </Button>
        </div>
        {loading && <Thinking label="Making fresh flashcards…" />}
        {error && <ErrorNote message={error} />}
      </section>
    );
  }

  // ---------- Playing ----------
  if (deck) {
    const card = deck.cards[deck.index]!;
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label-mono">
            Card {deck.index + 1} of {deck.cards.length}
          </span>
          {deck.offline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <CloudOff className="size-3.5" /> From your saved questions
            </span>
          )}
        </div>
        <div className="flex gap-1" aria-hidden>
          {deck.cards.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < deck.marks.length ? (deck.marks[i] === "got" ? "bg-success" : "bg-warn") : i === deck.index ? "bg-ink" : "bg-accent",
              )}
            />
          ))}
        </div>

        <div className="flip-scene">
          <button
            type="button"
            onClick={flip}
            data-flipped={deck.flipped}
            aria-label={deck.flipped ? "Show the question" : "Flip to see the answer"}
            className="flip-card block h-72 w-full text-left sm:h-80"
            key={deck.index}
          >
            <div className="flip-face sheet flex flex-col p-6 sm:p-8">
              <span className="label-mono">{card.concept}</span>
              <span className="my-auto font-display text-2xl font-semibold leading-snug sm:text-3xl">{card.front}</span>
              <span className="text-xs text-muted-foreground">Tap or press space to flip</span>
            </div>
            <div className="flip-face flip-back sheet overflow-hidden">
              <div className="flex size-full flex-col bg-tint-soft p-6 sm:p-8">
                <span className="label-mono">Answer</span>
                <span className="my-auto overflow-y-auto text-lg leading-relaxed sm:text-xl">{card.back}</span>
              </div>
            </div>
          </button>
        </div>

        <div className={cn("grid grid-cols-2 gap-3 transition-opacity", !deck.flipped && "pointer-events-none opacity-0")} aria-hidden={!deck.flipped}>
          <button
            type="button"
            tabIndex={deck.flipped ? 0 : -1}
            onClick={() => mark("review")}
            className="flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-warn bg-warn-soft font-semibold text-warn transition-transform hover:-translate-y-0.5"
          >
            <RefreshCw className="size-4" /> Review again
          </button>
          <button
            type="button"
            tabIndex={deck.flipped ? 0 : -1}
            onClick={() => mark("got")}
            className="flex h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-success bg-success-soft font-semibold text-success transition-transform hover:-translate-y-0.5"
          >
            <Check className="size-4" /> Got it
          </button>
        </div>
      </section>
    );
  }

  // ---------- Start ----------
  return (
    <div className="space-y-4">
      <div className="sheet flex flex-col items-start gap-3 p-5 sm:p-7">
        <Layers className="size-6 text-tint" />
        <h2 className="font-display text-2xl font-bold">Flashcards</h2>
        <p className="text-sm text-muted-foreground">
          Ten quick cards on <span className="font-medium text-foreground">{setup.topic || "your topic"}</span>. Flip each one,
          then mark it “Got it” or “Review again”.
        </p>
        <Button variant="ink" size="lg" onClick={start} disabled={!hasTopic || loading}>
          <Sparkles /> Make flashcards
        </Button>
      </div>
      {loading && <Thinking label="Making your flashcards…" />}
      {error && <ErrorNote message={error} />}
    </div>
  );
}
