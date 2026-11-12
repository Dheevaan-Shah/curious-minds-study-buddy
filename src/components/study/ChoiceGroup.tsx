import { cn } from "@/lib/utils";

type Option<T> = { value: T; label: string };

export function ChoiceGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="label-mono" id={`lbl-${label}`}>
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`lbl-${label}`}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className="choice"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
