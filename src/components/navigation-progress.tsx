'use client';

import { useEffect, useState } from 'react';
import { useNavigationLoader } from '@/context/navigation-loader-context';

export function NavigationProgress() {
  const { isNavigating } = useNavigationLoader();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isNavigating) {
      setProgress(25);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const increment = Math.max(1, (92 - prev) / 7);
          return Math.min(prev + increment, 92);
        });
      }, 100);
    } else if (progress > 0) {
      setProgress(100);
      const timer = setTimeout(() => {
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }

    return () => clearInterval(interval);
  }, [isNavigating, progress]);

  if (!isNavigating && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3.5px] z-[99999] pointer-events-none overflow-hidden bg-primary/20"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-primary to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.85)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
