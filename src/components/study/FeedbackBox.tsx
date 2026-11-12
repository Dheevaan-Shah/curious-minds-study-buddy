import { useState } from "react";
import { MessageCircleHeart, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Something broke" },
  { value: "content", label: "Wrong answer" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

export function FeedbackBox({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("idea");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 3) return;
    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      message: text.slice(0, 2000),
      category,
      name: name.trim() ? name.trim().slice(0, 80) : null,
      context: context ? context.slice(0, 200) : null,
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send your feedback. Please try again.");
      return;
    }
    toast.success("Thanks! Your feedback was sent.");
    setMessage("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ink" className="fixed bottom-5 right-5 z-40 h-12 rounded-full px-5 shadow-ink" aria-label="Send feedback">
          <MessageCircleHeart /> Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[1.5px] border-ink shadow-ink sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Tell us what you think</DialogTitle>
          <DialogDescription>Ideas, problems, a wrong answer — anything that would make Study Buddy better.</DialogDescription>
        </DialogHeader>
        <form onSubmit={send} className="space-y-4">
          <div role="radiogroup" aria-label="Feedback type" className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={category === c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "rounded-full border-[1.5px] px-3 py-1.5 text-sm font-medium transition-colors",
                  category === c.value ? "border-ink bg-ink text-primary-foreground" : "border-border hover:border-ink",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <Textarea
            aria-label="Your feedback"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            required
            placeholder="What should we know?"
            className="min-h-32 border-[1.5px] bg-card"
          />
          <Input
            aria-label="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Your name (optional)"
            className="border-[1.5px] bg-card"
          />
          <Button type="submit" variant="ink" size="lg" className="w-full" disabled={sending || message.trim().length < 3}>
            <Send /> {sending ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
