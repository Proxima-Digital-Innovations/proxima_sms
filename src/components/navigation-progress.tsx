'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { FancifulLoader } from '@/components/dashboard/fanciful-loader';

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBar />
    </Suspense>
  );
}

function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFancifulLoader, setShowFancifulLoader] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackRef = useRef<NodeJS.Timeout | null>(null);

  // When pathname or searchParams change, navigation finished
  useEffect(() => {
    if (isNavigating) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsNavigating(false);
        setShowFancifulLoader(false);
        setNavigatingTarget(null);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isNavigating) {
      setProgress(25);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const increment = Math.max(1, (92 - prev) / 8);
          return Math.min(prev + increment, 92);
        });
      }, 120);
    }

    return () => clearInterval(interval);
  }, [isNavigating]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;

      if (!anchor) return;

      const href = anchor.getAttribute('href');
      // Only internal routes
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || anchor.target === '_blank') {
        return;
      }

      // Check if it's the exact same url
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl || href === window.location.pathname) {
        return;
      }

      // Try to determine link title or label for the loading message
      const linkLabel = 
        anchor.getAttribute('title') || 
        anchor.querySelector('span')?.textContent?.trim() || 
        anchor.textContent?.trim() || 
        '';

      const cleanLabel = linkLabel.length > 0 && linkLabel.length < 35 ? linkLabel : null;
      setNavigatingTarget(cleanLabel);

      // Trigger navigation progress
      setIsNavigating(true);
      setProgress(15);

      // Show the fanciful entertainer after 100ms so instantaneous switches don't flash unnecessarily
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setShowFancifulLoader(true);
      }, 100);

      // Safety timeout: auto dismiss after 8s if navigation was canceled or stalled
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      fallbackRef.current = setTimeout(() => {
        setIsNavigating(false);
        setShowFancifulLoader(false);
        setNavigatingTarget(null);
        setProgress(0);
      }, 8000);
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
    };
  }, []);

  return (
    <>
      {/* Top neon shimmer progress bar */}
      {(isNavigating || progress > 0) && (
        <div
          className="fixed top-0 left-0 right-0 h-[3.5px] z-[99999] pointer-events-none overflow-hidden bg-primary/20"
          aria-hidden="true"
        >
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-primary to-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.85)] transition-all duration-250 ease-out"
            style={{
              width: `${progress}%`,
              opacity: progress === 100 ? 0 : 1,
            }}
          />
        </div>
      )}

      {/* Fanciful Entertaining Spinner Overlay */}
      <AnimatePresence>
        {showFancifulLoader && (
          <FancifulLoader 
            mode="fullscreen" 
            navigatingTo={navigatingTarget} 
          />
        )}
      </AnimatePresence>
    </>
  );
}
