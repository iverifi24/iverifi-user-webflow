import { useEffect, useRef, useCallback, useState } from "react";

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 2 minutes (testing)
const WARNING_BEFORE_MS = 60 * 1000;          // show warning 1 minute before logout

export function useInactivityLogout(onLogout: () => void) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs to avoid stale closures
  const showWarningRef = useRef(false);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const clearAllTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    showWarningRef.current = false;
    setShowWarning(false);

    // After (INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS) of inactivity → show warning
    warningTimerRef.current = setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      setSecondsLeft(60);

      // Countdown tick
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      // Auto-logout after warning period
      logoutTimerRef.current = setTimeout(() => {
        onLogoutRef.current();
      }, WARNING_BEFORE_MS);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearAllTimers]);

  // Set up activity listeners once — use ref so handleActivity never captures stale state
  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    const handleActivity = () => {
      // Only reset while warning is not yet showing
      if (!showWarningRef.current) {
        resetTimers();
      }
    };

    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimers(); // Start the initial timer

    return () => {
      clearAllTimers();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  const logoutNow = useCallback(() => {
    clearAllTimers();
    showWarningRef.current = false;
    setShowWarning(false);
    onLogoutRef.current();
  }, [clearAllTimers]);

  return { showWarning, secondsLeft, stayLoggedIn, logoutNow };
}
