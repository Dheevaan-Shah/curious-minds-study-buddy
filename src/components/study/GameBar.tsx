import { useState } from "react";
import { Lock, Sparkles, Store, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { profileStore, useApplyAccent } from "@/lib/game-store";
import {
  SHOP_ITEMS,
  currentStreak,
  dayKey,
  purchase,
  recordsBySubject,
  streakBoostPercent,
  streakIcon,
  toggleEquip,
  type ShopItem,
} from "@/lib/gamification";
import { SUBJECTS } from "@/lib/study-config";
import type { Attempt } from "@/lib/quiz-utils";

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-card px-2.5 font-mono text-sm font-semibold tabular-nums transition-transform hover:-translate-y-0.5";

/** Streak + coins chips, and the Rewards Shop / Progress & Records windows. */
export function GameBar({ attempts }: { attempts: Attempt[] }) {
  useApplyAccent();
  const profile = profileStore.useValue();
  const [open, setOpen] = useState<"shop" | "records" | null>(null);
  const streak = currentStreak(profile.streak, dayKey(new Date()));
  const boost = streakBoostPercent(streak);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span
          className={chip}
          title={streak ? `${streak}-day study streak — +${boost}% coins on every quiz` : "Finish a quiz today to start a streak"}
          aria-label={`${streak} day streak`}
        >
          <span aria-hidden className={cn(!streak && "grayscale")}>{streakIcon(profile)}</span>
          {streak}
        </span>
        <button type="button" className={chip} onClick={() => setOpen("shop")} aria-label={`${profile.coins} coins — open the rewards shop`}>
          <span aria-hidden>🪙</span>
          {profile.coins}
          <Store className="size-3.5 opacity-60" />
        </button>
        <button type="button" className={cn(chip, "px-2")} onClick={() => setOpen("records")} aria-label="Progress and records">
          <Trophy className="size-4" />
        </button>
      </div>

      <Dialog open={open === "shop"} onOpenChange={(o) => setOpen(o ? "shop" : null)}>
        <DialogContent className="max-h-[88dvh] max-w-xl overflow-y-auto border-[1.5px] border-ink bg-card">
          <ShopContent streak={streak} boost={boost} />
        </DialogContent>
      </Dialog>

      <Dialog open={open === "records"} onOpenChange={(o) => setOpen(o ? "records" : null)}>
        <DialogContent className="max-h-[88dvh] max-w-xl overflow-y-auto border-[1.5px] border-ink bg-card">
          <RecordsContent attempts={attempts} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShopContent({ streak, boost }: { streak: number; boost: number }) {
  const profile = profileStore.useValue();
  const accents = SHOP_ITEMS.filter((i) => i.kind === "accent" && !i.legendary);
  const icons = SHOP_ITEMS.filter((i) => i.kind === "icon");
  const legendary = SHOP_ITEMS.filter((i) => i.kind === "accent" && i.legendary);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Rewards Shop</DialogTitle>
        <DialogDescription>
          You have <span className="font-mono font-semibold text-foreground">🪙 {profile.coins}</span>.{" "}
          {streak > 0 ? `Your ${streak}-day streak gives +${boost}% coins on every quiz.` : "Quiz on days in a row for +10% coins per day."}
        </DialogDescription>
      </DialogHeader>
      <ShopSection title="Theme colours" items={accents} />
      <ShopSection title="Streak icons" items={icons} />
      <ShopSection title="Legendary" items={legendary} wide />
    </>
  );
}

function ShopSection({ title, items, wide }: { title: string; items: ShopItem[]; wide?: boolean }) {
  return (
    <section>
      <div className="label-mono mb-2">{title}</div>
      <div className={cn("grid gap-2", wide ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4")}>
        {items.map((item) => (
          <ShopCard key={item.id} item={item} wide={!!wide} />
        ))}
      </div>
    </section>
  );
}

function ShopCard({ item, wide }: { item: ShopItem; wide?: boolean }) {
  const profile = profileStore.useValue();
  const owned = profile.owned.includes(item.id);
  const equipped = profile.equippedAccent === item.id || profile.equippedIcon === item.id;
  const short = item.price - profile.coins;

  function act() {
    if (owned) return profileStore.set((p) => toggleEquip(p, item.id));
    const res = purchase(profile, item.id);
    if (res.ok) profileStore.set(toggleEquip(res.profile, item.id));
  }

  const swatch =
    item.kind === "icon" ? (
      <span className="text-2xl leading-none" aria-hidden>{item.icon}</span>
    ) : item.accent === "rainbow" ? (
      <span className="rainbow-swatch size-8 rounded-full border-[1.5px] border-ink" aria-hidden />
    ) : (
      <span
        className="size-8 rounded-full border-[1.5px] border-ink"
        style={{ background: `var(--accent-${item.accent})` }}
        aria-hidden
      />
    );

  return (
    <div
      className={cn(
        "flex gap-2 rounded-md border-[1.5px] p-3",
        wide ? "flex-row items-center" : "flex-col items-start",
        equipped ? "border-ink shadow-ink-sm" : "border-border",
      )}
    >
      {swatch}
      <div className={cn("min-w-0", wide && "flex-1")}>
        <div className="flex items-center gap-1 text-sm font-semibold">
          {item.label}
          {wide && <Sparkles className="size-3.5 text-tint" />}
        </div>
        {wide && <div className="text-xs text-muted-foreground">The whole app slowly glides through every colour.</div>}
        <div className="font-mono text-xs text-muted-foreground">{owned ? "Owned" : `🪙 ${item.price.toLocaleString()}`}</div>
      </div>
      <Button
        size="sm"
        variant={equipped ? "ink" : "paper"}
        className={cn("h-8", !wide && "w-full")}
        disabled={!owned && short > 0}
        onClick={act}
        title={!owned && short > 0 ? `${short.toLocaleString()} more coins needed` : undefined}
      >
        {owned ? (equipped ? "Equipped" : "Equip") : short > 0 ? <><Lock /> {short.toLocaleString()} more</> : "Buy"}
      </Button>
    </div>
  );
}

function RecordsContent({ attempts }: { attempts: Attempt[] }) {
  const records = recordsBySubject(attempts);
  const any = Object.values(records).some((l) => l && l.length > 0);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Progress & Records</DialogTitle>
        <DialogDescription>Your best score on every topic you've quizzed, saved on this device.</DialogDescription>
      </DialogHeader>
      {!any && <p className="py-6 text-center text-sm text-muted-foreground">Finish a quiz to set your first record.</p>}
      {SUBJECTS.map((s) => {
        const list = records[s.value];
        if (!list?.length) return null;
        return (
          <section key={s.value} data-subject={s.value}>
            <div className="mb-2 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-tint" />
              <span className="font-display font-semibold">{s.label}</span>
            </div>
            <ul className="space-y-2">
              {list.map((r) => (
                <li key={r.topic} className="rounded-md border-[1.5px] border-border p-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{r.topic}</span>
                    <span className="shrink-0 font-mono">
                      Best: {r.best.correct}/{r.best.total}
                      {r.percent === 100 && " ⭐"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent">
                    <div className="h-full rounded-full bg-tint" style={{ width: `${r.percent}%` }} />
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
                    {r.percent}% · {r.attempts} attempt{r.attempts === 1 ? "" : "s"} · grade {r.best.grade} · {r.best.difficulty}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
