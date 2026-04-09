'use client';

import { useEffect, useRef, useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { useAuth } from './useAuth';

const HEARTBEAT_INTERVAL = 60 * 1000; // 1 minute
const AFK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

export function useActivityTracker() {
  const { user } = useAuth();
  const [isAfk, setIsAfk] = useState(false);
  const lastActivityTime = useRef<number>(Date.now());
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      lastActivityTime.current = Date.now();
      if (isAfk) {
        setIsAfk(false);
        // Instant heartbeat when returning from AFK
        authApi.heartbeat().catch(console.error);
      }
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel', 'contextmenu'];
    events.forEach(event => document.addEventListener(event, handleActivity));

    // Monitor AFK status
    const afkCheckInterval = setInterval(() => {
      if (Date.now() - lastActivityTime.current > AFK_TIMEOUT) {
        if (!isAfk) setIsAfk(true);
      }
    }, 30000); // Check every 30 seconds

    // Periodic Heartbeat
    heartbeatTimer.current = setInterval(() => {
      // Only send heartbeat if not AFK
      if (Date.now() - lastActivityTime.current < AFK_TIMEOUT) {
        authApi.heartbeat().catch(console.error);
      }
    }, HEARTBEAT_INTERVAL);

    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      clearInterval(afkCheckInterval);
    };
  }, [user, isAfk]);

  return { isAfk };
}
