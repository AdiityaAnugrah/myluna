import { useRef, useEffect } from 'react';

/**
 * Tracks how long a user is ACTIVE on a form.
 * It only counts seconds where the user has moved the mouse or pressed a key
 * in the last 10 minutes.
 */
export function useFormTimer() {
  const activeSeconds = useRef(0);
  const lastActivityAt = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityAt.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      // If the user interacted in the last 10 minutes, count this second
      if (now - lastActivityAt.current < tenMinutes) {
        activeSeconds.current += 1;
      }
    }, 1000);

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getDurationSeconds = (): number => {
    return activeSeconds.current;
  };

  return { getDurationSeconds };
}
