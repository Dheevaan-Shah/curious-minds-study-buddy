import { useEffect } from "react";
import { createLocalStore } from "./local-store";
import { EMPTY_PROFILE, coinsForQuiz, dayKey, equippedAccent, recordStreak, type Profile } from "./gamification";
import type { Attempt } from "./quiz-utils";

function normalizeProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== "object") return EMPTY_PROFILE;
  const r = raw as Partial<Profile>;
  return {
    coins: typeof r.coins === "number" && r.coins >= 0 ? Math.floor(r.coins) : 0,
    streak:
      r.streak && typeof r.streak.count === "number"
        ? { lastDate: typeof r.streak.lastDate === "string" ? r.streak.lastDate : null, count: r.streak.count }
        : EMPTY_PROFILE.streak,
    owned: Array.isArray(r.owned) ? r.owned.filter((x): x is string => typeof x === "string") : [],
    equippedAccent: typeof r.equippedAccent === "string" ? r.equippedAccent : null,
    equippedIcon: typeof r.equippedIcon === "string" ? r.equippedIcon : null,
  };
}

export const profileStore = createLocalStore<Profile>("study-buddy:profile", EMPTY_PROFILE, normalizeProfile);

/** Award coins and update the streak for a finished quiz. Returns coins earned. */
export function rewardQuiz(attempt: Pick<Attempt, "correct" | "total" | "difficulty">): number {
  const earned = coinsForQuiz(attempt.correct, attempt.total, attempt.difficulty);
  profileStore.set((p) => ({ ...p, coins: p.coins + earned, streak: recordStreak(p.streak, dayKey(new Date())) }));
  return earned;
}

/** Mirror the equipped accent onto <html data-accent> so CSS can retint the app. */
export function useApplyAccent() {
  const profile = profileStore.useValue();
  useEffect(() => {
    const accent = equippedAccent(profileStore.get());
    if (accent) document.documentElement.dataset["accent"] = accent;
    else delete document.documentElement.dataset["accent"];
  }, [profile]);
}
