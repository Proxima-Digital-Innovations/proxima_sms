'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function DynamicPageTitle() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    // e.g., /kings-college/dashboard/inventory/items
    const segments = pathname.split('/').filter(Boolean);
    
    // Default title
    let pageName = 'Dashboard';

    if (segments.length > 2) {
      // Find the segments after 'dashboard'
      const dashboardIndex = segments.indexOf('dashboard');
      if (dashboardIndex !== -1 && dashboardIndex < segments.length - 1) {
        const formatSegment = (s: string) => {
            if ((s.length >= 24 && s.length <= 36 && !s.includes('-') && !s.includes(' ')) || 
                (s.length === 36 && s.split('-').length === 5)) {
                return 'Details';
            }
            return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        };

        const relevantSegments = segments.slice(dashboardIndex + 1);
        // Format the segments
        pageName = relevantSegments
          .map(formatSegment)
          .reverse()
          .join(' - ');
      }
    }

    document.title = `${pageName} | Proxima SMS`;
  }, [pathname]);

  return null;
}

export function DynamicTitle({ breadcrumbs }: { breadcrumbs: { label: string, href: string }[] }) {
  // A simple fallback if they want to render breadcrumbs or just use it as a title setter
  useEffect(() => {
    if (breadcrumbs && breadcrumbs.length > 0) {
      const pageName = breadcrumbs[breadcrumbs.length - 1].label;
      document.title = `${pageName} | Proxima SMS`;
    }
  }, [breadcrumbs]);

  return null;
}
