// How long the app may sit untouched before it asks for the PIN again. Pure functions, so they can be tested without a browser.

export const DEFAULT_IDLE_LOCK_MINUTES = 5;
const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

/** The idle time in milliseconds. `configured` is VITE_IDLE_LOCK_MINUTES; anything that is not a sensible number gives the default. */
export function idleLockMs(configured?: string | number | null): number {
  const minutes = Number(configured);
  const ok = Number.isFinite(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES;
  return (ok ? minutes : DEFAULT_IDLE_LOCK_MINUTES) * 60 * 1000;
}

/** True once nothing has happened for `idleMs`. A clock that moved backwards is never "idle". */
export function isIdle(lastActivityAt: number, now: number, idleMs: number): boolean {
  const elapsed = now - lastActivityAt;
  return elapsed >= 0 && elapsed >= idleMs;
}
