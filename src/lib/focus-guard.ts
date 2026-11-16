// Keeps the floating background bubbles from becoming a distraction.
export const PLAY_LIMIT_MS = 20_000; // 20 s of continuous bubble play…
export const COOLDOWN_MS = 5 * 60_000; // …switches cursor interaction off for a flat 5 minutes
export const PLAY_GAP_MS = 1_500; // a pause longer than this ends a "continuous" play session

export type GuardState = { playMs: number; lastPlayAt: number | null; cooldownUntil: number };
export const INITIAL_GUARD: GuardState = { playMs: 0, lastPlayAt: null, cooldownUntil: 0 };

/** Cooldown is purely clock-based: nothing the student does ends it early. */
export function isCoolingDown(s: GuardState, now: number): boolean {
  return now < s.cooldownUntil;
}

/** Record that the student is playing with the bubbles at `now`. */
export function notePlay(s: GuardState, now: number): GuardState {
  if (isCoolingDown(s, now)) return s;
  const continuous = s.lastPlayAt !== null && now - s.lastPlayAt <= PLAY_GAP_MS;
  const playMs = continuous ? s.playMs + (now - s.lastPlayAt!) : 0;
  if (playMs >= PLAY_LIMIT_MS) return { playMs: 0, lastPlayAt: null, cooldownUntil: now + COOLDOWN_MS };
  return { playMs, lastPlayAt: now, cooldownUntil: s.cooldownUntil };
}
