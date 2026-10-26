'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationLoaderContextType {
  isNavigating: boolean;
  navigatingTarget: string | null;
  navigatingPath: string | null;
  startNavigation: (href: string, label?: string) => void;
  finishNavigation: () => void;
}

const NavigationLoaderContext = createContext<NavigationLoaderContextType>({
  isNavigating: false,
  navigatingTarget: null,
  navigatingPath: null,
  startNavigation: () => {},
  finishNavigation: () => {},
});

function NavigationLoaderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
  const [navigatingPath, setNavigatingPath] = useState<string | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const finishNavigation = useCallback(() => {
    setIsNavigating(false);
    setNavigatingTarget(null);
    setNavigatingPath(null);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
  }, []);

  const startNavigation = useCallback((href: string, label?: string) => {
    const currentUrl = window.location.pathname + window.location.search;
    if (href === currentUrl || href === window.location.pathname) {
      return;
    }
    setIsNavigating(true);
    setNavigatingPath(href);
    if (label) setNavigatingTarget(label);

    // Safety timeout: automatically finish after 9 seconds so it never gets permanently stuck
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      finishNavigation();
    }, 9000);
  }, [finishNavigation]);

  // When pathname and searchParams actually change, give React a brief tick to mount the new children
  useEffect(() => {
    if (isNavigating) {
      const timer = setTimeout(() => {
        finishNavigation();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams, finishNavigation]);

  // Global click interceptor for internal links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a') as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || anchor.target === '_blank') {
        return;
      }

      // Check if it's the current path
      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl || href === window.location.pathname) {
        return;
      }

      const label = 
        anchor.getAttribute('title') || 
        anchor.querySelector('span')?.textContent?.trim() || 
        anchor.textContent?.trim() || 
        undefined;

      const cleanLabel = label && label.length > 0 && label.length < 40 ? label : undefined;
      startNavigation(href, cleanLabel);
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [startNavigation]);

  return (
    <NavigationLoaderContext.Provider
      value={{
        isNavigating,
        navigatingTarget,
        navigatingPath,
        startNavigation,
        finishNavigation,
      }}
    >
      {children}
    </NavigationLoaderContext.Provider>
  );
}

export function NavigationLoaderProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <NavigationLoaderInner>{children}</NavigationLoaderInner>
    </Suspense>
  );
}

export function useNavigationLoader() {
  return useContext(NavigationLoaderContext);
}
