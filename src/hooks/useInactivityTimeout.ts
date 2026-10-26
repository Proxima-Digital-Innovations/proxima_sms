'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useInactivityTimeout(onInactive: () => void, timeout: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onInactiveRef = useRef(onInactive);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    lastActivityRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      onInactiveRef.current();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'mouseup',
      'keydown',
      'keyup',
      'touchstart',
      'touchmove',
      'touchend',
      'scroll',
      'wheel',
      'pointerdown'
    ];

    const handleActivity = () => {
      // Throttle resetting the timer to at most once every 1000ms
      const now = Date.now();
      if (now - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // Set initial timer
    resetTimer();

    // Add passive event listeners for high performance
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [resetTimer]);
}
