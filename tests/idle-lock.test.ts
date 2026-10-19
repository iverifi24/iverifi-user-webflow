// Tests for the idle lock timing (src/lib/idle-lock.ts). Run: npm run test:idle
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_IDLE_LOCK_MINUTES, idleLockMs, isIdle } from "../src/lib/idle-lock.ts";

const MIN = 60 * 1000;

test("the app locks after 5 minutes by default", () => {
  assert.equal(DEFAULT_IDLE_LOCK_MINUTES, 5);
  assert.equal(idleLockMs(undefined), 5 * MIN);
  assert.equal(idleLockMs(""), 5 * MIN);
  assert.equal(idleLockMs(null), 5 * MIN);
});

test("the time can be changed in settings, and nonsense falls back to the default", () => {
  assert.equal(idleLockMs("10"), 10 * MIN);
  assert.equal(idleLockMs(2), 2 * MIN);
  for (const bad of ["abc", "0", "-5", "0.5", "1000", "NaN"]) assert.equal(idleLockMs(bad), 5 * MIN, bad);
});

test("idle only once the full time has passed", () => {
  const t0 = 1_000_000;
  assert.equal(isIdle(t0, t0 + 5 * MIN - 1, 5 * MIN), false);
  assert.equal(isIdle(t0, t0 + 5 * MIN, 5 * MIN), true);
  assert.equal(isIdle(t0, t0 + 30 * MIN, 5 * MIN), true, "a laptop that slept for half an hour is locked when it wakes");
});

test("a clock that moved backwards is never idle", () => {
  assert.equal(isIdle(2_000_000, 1_000_000, 5 * MIN), false);
});
