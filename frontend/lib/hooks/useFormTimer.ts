import { useRef, useEffect } from 'react';

/**
 * Tracks how long a form has been open.
 * Returns a function that returns elapsed seconds since mount.
 */
export function useFormTimer() {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const getDurationSeconds = (): number => {
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  };

  return { getDurationSeconds };
}
