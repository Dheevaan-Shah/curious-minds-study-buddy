// Pure rules for streaks, coins, rewards and personal bests (browser-safe, no storage).
import type { Attempt } from "./quiz-utils";
import type { Difficulty, Subject } from "./study-config";

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { easy: 1, medium: 1.5, hard: 2 };
export const COINS_PER_CORRECT = 10;
/** Each day of streak adds this much extra (0.1 = +10%), with no cap. */
export const STREAK_BOOST_PER_DAY = 0.1;

/** Extra coin percentage for a streak: +10% per day, no cap. */
export function streakBoostPercent(streakDays: number): number {
  return Math.max(0, Math.floor(streakDays)) * STREAK_BOOST_PER_DAY * 100;
}

/**
 * Coins for finishing a quiz: 10 per correct answer (so score % and quiz length both count),
 * times the difficulty multiplier, plus +10% per streak day (no cap). Always at least 1.
 */
export function coinsForQuiz(correct: number, total: number, difficulty: Difficulty, streakDays = 0): number {
  if (total <= 0) return 0;
  const days = Math.max(0, Math.floor(streakDays));
  const base = Math.max(0, Math.min(correct, total)) * COINS_PER_CORRECT * DIFFICULTY_MULTIPLIER[difficulty];
  return Math.max(1, Math.round((base * (10 + days)) / 10));
}

export type Streak = { lastDate: string | null; count: number };

/** Local calendar date as YYYY-MM-DD. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay!, am! - 1, ad!);
  const tb = Date.UTC(by!, bm! - 1, bd!);
  return Math.round((tb - ta) / 86_400_000);
}

/** Record a finished quiz on `today`: same day keeps the streak, next day adds 1, a skipped day resets to 1. */
export function recordStreak(streak: Streak, today: string): Streak {
  if (!streak.lastDate) return { lastDate: today, count: 1 };
  const gap = daysBetween(streak.lastDate, today);
  if (gap <= 0) return { lastDate: streak.lastDate, count: Math.max(1, streak.count) };
  if (gap === 1) return { lastDate: today, count: streak.count + 1 };
  return { lastDate: today, count: 1 };
}

/** Streak to show today: still alive if the last quiz was today or yesterday, otherwise 0. */
export function currentStreak(streak: Streak, today: string): number {
  if (!streak.lastDate) return 0;
  const gap = daysBetween(streak.lastDate, today);
  return gap <= 1 ? streak.count : 0;
}

export type Accent = "emerald" | "royal" | "rose" | "violet" | "amber" | "navy" | "mint" | "crimson" | "rainbow";
export type ShopItem =
  | { id: string; kind: "accent"; label: string; price: number; accent: Accent; legendary?: boolean }
  | { id: string; kind: "icon"; label: string; price: number; icon: string };

export const RAINBOW_PRICE = 9999;

export const SHOP_ITEMS: ShopItem[] = [
  { id: "accent-emerald", kind: "accent", label: "Emerald", price: 200, accent: "emerald" },
  { id: "accent-royal", kind: "accent", label: "Royal Blue", price: 200, accent: "royal" },
  { id: "accent-rose", kind: "accent", label: "Rose", price: 200, accent: "rose" },
  { id: "accent-violet", kind: "accent", label: "Violet", price: 200, accent: "violet" },
  { id: "accent-amber", kind: "accent", label: "Sunset Amber", price: 250, accent: "amber" },
  { id: "accent-navy", kind: "accent", label: "Midnight Navy", price: 250, accent: "navy" },
  { id: "accent-mint", kind: "accent", label: "Mint", price: 250, accent: "mint" },
  { id: "accent-crimson", kind: "accent", label: "Crimson", price: 300, accent: "crimson" },
  { id: "icon-lightning", kind: "icon", label: "Lightning", price: 120, icon: "⚡" },
  { id: "icon-brain", kind: "icon", label: "Brain", price: 120, icon: "🧠" },
  { id: "icon-target", kind: "icon", label: "Target", price: 120, icon: "🎯" },
  { id: "icon-rocket", kind: "icon", label: "Rocket", price: 150, icon: "🚀" },
  { id: "icon-beaker", kind: "icon", label: "Beaker", price: 150, icon: "🧪" },
  { id: "icon-saturn", kind: "icon", label: "Saturn", price: 200, icon: "🪐" },
  { id: "icon-diamond", kind: "icon", label: "Diamond", price: 250, icon: "💎" },
  { id: "icon-crown", kind: "icon", label: "Crown", price: 300, icon: "👑" },
  { id: "accent-rainbow", kind: "accent", label: "Rainbow Mode", price: RAINBOW_PRICE, accent: "rainbow", legendary: true },
];

export const DEFAULT_STREAK_ICON = "🔥";

export type Profile = {
  coins: number;
  streak: Streak;
  owned: string[];
  equippedAccent: string | null;
  equippedIcon: string | null;
};

export const EMPTY_PROFILE: Profile = {
  coins: 0,
  streak: { lastDate: null, count: 0 },
  owned: [],
  equippedAccent: null,
  equippedIcon: null,
};

export type PurchaseResult = { ok: true; profile: Profile } | { ok: false; reason: "owned" | "coins" | "unknown" };

export function purchase(profile: Profile, itemId: string): PurchaseResult {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (profile.owned.includes(itemId)) return { ok: false, reason: "owned" };
  if (profile.coins < item.price) return { ok: false, reason: "coins" };
  return { ok: true, profile: { ...profile, coins: profile.coins - item.price, owned: [...profile.owned, itemId] } };
}

/** Equip an owned item (or unequip if already equipped). Unowned items are ignored. */
export function toggleEquip(profile: Profile, itemId: string): Profile {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item || !profile.owned.includes(itemId)) return profile;
  if (item.kind === "accent")
    return { ...profile, equippedAccent: profile.equippedAccent === itemId ? null : itemId };
  return { ...profile, equippedIcon: profile.equippedIcon === itemId ? null : itemId };
}

export function streakIcon(profile: Profile): string {
  const item = SHOP_ITEMS.find((i) => i.id === profile.equippedIcon);
  return item?.kind === "icon" ? item.icon : DEFAULT_STREAK_ICON;
}

export function equippedAccent(profile: Profile): Accent | null {
  const item = SHOP_ITEMS.find((i) => i.id === profile.equippedAccent);
  return item?.kind === "accent" ? item.accent : null;
}

const topicKey = (subject: Subject, topic: string) => `${subject}::${topic.trim().toLowerCase()}`;

/** Best attempt (by percentage, then most questions) for a subject + topic. */
export function bestAttempt(attempts: Attempt[], subject: Subject, topic: string): Attempt | null {
  const key = topicKey(subject, topic);
  let best: Attempt | null = null;
  for (const a of attempts) {
    if (topicKey(a.subject, a.topic) !== key || a.total === 0) continue;
    if (!best) { best = a; continue; }
    const pa = a.correct / a.total, pb = best.correct / best.total;
    if (pa > pb || (pa === pb && a.total > best.total)) best = a;
  }
  return best;
}

/** True when `attempt` beats every earlier score on the same subject + topic (needs at least one earlier try). */
export function isPersonalBest(previous: Attempt[], attempt: Pick<Attempt, "subject" | "topic" | "correct" | "total">): boolean {
  const prev = bestAttempt(previous, attempt.subject, attempt.topic);
  if (!prev || attempt.total === 0) return false;
  return attempt.correct / attempt.total > prev.correct / prev.total;
}

export type TopicRecord = { topic: string; best: Attempt; attempts: number; percent: number };

/** Best score per topic, grouped by subject, highest first (for the Progress & Records view). */
export function recordsBySubject(attempts: Attempt[]): Partial<Record<Subject, TopicRecord[]>> {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (a.total === 0) continue;
    const k = topicKey(a.subject, a.topic);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const out: Partial<Record<Subject, TopicRecord[]>> = {};
  for (const items of groups.values()) {
    const first = items[0]!;
    const best = bestAttempt(items, first.subject, first.topic)!;
    const rec: TopicRecord = {
      topic: best.topic.trim(),
      best,
      attempts: items.length,
      percent: Math.round((best.correct / best.total) * 100),
    };
    (out[first.subject] ??= []).push(rec);
  }
  for (const list of Object.values(out)) list!.sort((a, b) => b.percent - a.percent || a.topic.localeCompare(b.topic));
  return out;
}
