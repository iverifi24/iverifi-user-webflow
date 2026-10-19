import { useEffect, useRef } from "react";
import { idleLockMs, isIdle } from "@/lib/idle-lock";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll", "wheel", "click"] as const;
const CHECK_EVERY_MS = 10 * 1000;

/**
 * Calls `onLock` (show the PIN screen) once the person has not touched the app for 5 minutes (VITE_IDLE_LOCK_MINUTES).
 *
 * `enabled` should be true only while the app is open and unlocked for someone who has a PIN. When it turns false (the PIN
 * screen is up) the timer stops, and when it turns true again (unlocked) the idle time starts from zero.
 *
 * Time is compared with timestamps, not one long timer: browsers slow timers in background tabs and they stop while a
 * computer sleeps, so a long timer could fire late. A short check against the clock cannot.
 */
export function useInactivityLock(enabled: boolean, onLock: () => void) {
  const lastActivity = useRef(Date.now());
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (!enabled) return;
    const limit = idleLockMs(import.meta.env.VITE_IDLE_LOCK_MINUTES);
    lastActivity.current = Date.now();

    const mark = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const timer = setInterval(() => {
      if (isIdle(lastActivity.current, Date.now(), limit)) {
        lastActivity.current = Date.now(); // not again straight away; the PIN screen turns `enabled` off
        onLockRef.current();
      }
    }, CHECK_EVERY_MS);

    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [enabled]);
}
