import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { themeStore, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light mode", icon: Sun },
  { value: "dark", label: "Dark mode", icon: Moon },
  { value: "system", label: "Match my device", icon: Monitor },
];

export function ThemeToggle() {
  const choice = themeStore.useValue();
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-full border-[1.5px] border-ink bg-card p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={choice === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => themeStore.set(o.value)}
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-colors",
            choice === o.value ? "bg-ink text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <o.icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
