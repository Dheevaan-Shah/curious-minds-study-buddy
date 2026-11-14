import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lightbulb, Loader2, LogOut, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteFeedback,
  generateSuggestions,
  getAdminStatus,
  listFeedback,
  setFeedbackStatus,
  setSuggestionStatus,
  type AdminFeedback,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Feedback inbox — Study Buddy admin" },
      { name: "description", content: "Read student feedback and review AI-suggested fixes." },
      { property: "og:title", content: "Feedback inbox — Study Buddy admin" },
      { property: "og:description", content: "Read student feedback and review AI-suggested fixes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  idea: "Idea",
  bug: "Something broke",
  content: "Wrong answer",
  other: "Other",
};

const STATUS_LABEL: Record<AdminFeedback["status"], string> = {
  new: "New",
  reviewed: "Reviewed",
  done: "Done",
};

function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const statusQuery = useQuery({ queryKey: ["admin-status"], queryFn: () => getAdminStatus() });
  const feedbackQuery = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: () => listFeedback(),
    enabled: statusQuery.data?.isAdmin === true,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });

  const suggest = useMutation({
    mutationFn: (feedbackId: string) => generateSuggestions({ data: { feedbackId } }),
    onSuccess: (r) => {
      if (!r.ok) toast.error(r.error ?? "Couldn't think of solutions. Try again.");
      else toast.success("Solutions ready.");
      refresh();
    },
    onError: () => toast.error("Couldn't think of solutions. Try again."),
  });

  const suggestionStatus = useMutation({
    mutationFn: (v: { id: string; status: "accepted" | "rejected" }) => setSuggestionStatus({ data: v }),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't save that choice."),
  });

  const feedbackStatus = useMutation({
    mutationFn: (v: { id: string; status: AdminFeedback["status"] }) => setFeedbackStatus({ data: v }),
    onSuccess: refresh,
    onError: () => toast.error("Couldn't update the feedback."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFeedback({ data: { id } }),
    onSuccess: () => {
      toast.success("Feedback deleted.");
      refresh();
    },
    onError: () => toast.error("Couldn't delete the feedback."),
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  if (statusQuery.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!statusQuery.data?.isAdmin) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="sheet w-full max-w-sm space-y-4 p-6 text-center sm:p-8">
          <h1 className="text-2xl font-bold">Admins only</h1>
          <p className="text-sm text-muted-foreground">
            This account isn't an admin, so it can't read student feedback.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Back to Study Buddy</Link>
            </Button>
            <Button variant="ink" onClick={signOut}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const items = feedbackQuery.data ?? [];

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-lg font-bold">
            Study Buddy<span className="text-muted-foreground">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="label-mono inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
            >
              <RefreshCw className="size-3" /> Refresh
            </button>
            <button
              type="button"
              onClick={signOut}
              className="label-mono inline-flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
            >
              <LogOut className="size-3" /> Sign out
            </button>
          </div>
        </div>

        <header className="mt-6">
          <h1 className="text-3xl font-bold sm:text-4xl">Feedback inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "message" : "messages"} from students. Ask the AI for possible fixes,
            then accept or reject each one.
          </p>
        </header>

        {feedbackQuery.isPending && (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!feedbackQuery.isPending && items.length === 0 && (
          <div className="sheet mt-6 p-8 text-center text-sm text-muted-foreground">
            No feedback yet. When students send some, it will show up here.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {items.map((f) => (
            <FeedbackCard
              key={f.id}
              feedback={f}
              busy={suggest.isPending && suggest.variables === f.id}
              onSuggest={() => suggest.mutate(f.id)}
              onSuggestionStatus={(id, status) => suggestionStatus.mutate({ id, status })}
              onStatus={(status) => feedbackStatus.mutate({ id: f.id, status })}
              onDelete={() => remove.mutate(f.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackCard({
  feedback: f,
  busy,
  onSuggest,
  onSuggestionStatus,
  onStatus,
  onDelete,
}: {
  feedback: AdminFeedback;
  busy: boolean;
  onSuggest: () => void;
  onSuggestionStatus: (id: string, status: "accepted" | "rejected") => void;
  onStatus: (status: AdminFeedback["status"]) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = f.suggestions.filter((s) => s.status === "pending");
  const decided = f.suggestions.filter((s) => s.status !== "pending");

  return (
    <article className="sheet animate-rise overflow-hidden">
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border-[1.5px] border-ink bg-card px-2.5 py-0.5 text-xs font-medium">
            {CATEGORY_LABEL[f.category] ?? f.category}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              f.status === "new" ? "bg-ink text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {STATUS_LABEL[f.status]}
          </span>
          <span className="label-mono ml-auto">
            {new Date(f.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
            {f.name ? ` · ${f.name}` : ""}
          </span>
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{f.message}</p>
        {f.context && <p className="label-mono mt-2">Where: {f.context}</p>}

        {/* AI suggestions */}
        <div className="mt-4 space-y-2">
          {f.suggestions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-lg border-[1.5px] p-3",
                s.status === "accepted" && "border-success bg-success-soft",
                s.status === "rejected" && "border-danger bg-danger-soft opacity-60",
                s.status === "pending" && "border-border bg-card",
              )}
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                  <p className="label-mono mt-1">Effort: {s.effort}</p>
                </div>
                {s.status === "pending" ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label="Accept suggestion"
                      onClick={() => onSuggestionStatus(s.id, "accepted")}
                      className="grid size-8 place-items-center rounded-full border-[1.5px] border-success text-success transition-transform hover:scale-110"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Reject suggestion"
                      onClick={() => onSuggestionStatus(s.id, "rejected")}
                      className="grid size-8 place-items-center rounded-full border-[1.5px] border-danger text-danger transition-transform hover:scale-110"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <span className="label-mono shrink-0">{s.status === "accepted" ? "Accepted" : "Rejected"}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="ink" size="sm" onClick={onSuggest} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {busy
              ? "Thinking…"
              : f.suggestions.length === 0
                ? "Suggest fixes"
                : pending.length > 0
                  ? "Rethink fixes"
                  : "Suggest again"}
          </Button>
          {f.status !== "reviewed" && (
            <Button variant="outline" size="sm" onClick={() => onStatus("reviewed")}>
              Mark reviewed
            </Button>
          )}
          {f.status !== "done" && (
            <Button variant="outline" size="sm" onClick={() => onStatus("done")}>
              Mark done
            </Button>
          )}
          {decided.length > 0 && pending.length === 0 && (
            <span className="label-mono">All suggestions decided</span>
          )}
          {confirmDelete ? (
            <span className="ml-auto inline-flex items-center gap-2 text-xs">
              Sure?
              <button type="button" className="font-semibold text-danger underline" onClick={onDelete}>
                Delete
              </button>
              <button type="button" className="underline" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label="Delete feedback"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
