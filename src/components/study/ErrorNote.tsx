import { AlertCircle } from "lucide-react";

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border-[1.5px] border-dashed border-ink bg-muted p-3 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground" aria-live="polite">
      <span className="flex gap-1">
        <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:-0.3s]" />
        <span className="size-2 animate-bounce rounded-full bg-ink [animation-delay:-0.15s]" />
        <span className="size-2 animate-bounce rounded-full bg-ink" />
      </span>
      {label}
    </div>
  );
}
