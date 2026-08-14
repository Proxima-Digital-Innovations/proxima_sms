'use client';

import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { ShieldAlert } from 'lucide-react';
import { LicenseStatus } from '@/lib/license-utils';

interface LicenseProviderProps {
  children: React.ReactNode;
  status: LicenseStatus;
  message: string;
}

export function LicenseProvider({ children, status, message }: LicenseProviderProps) {
  const isReadOnly = status !== 'ACTIVE';

  useEffect(() => {
    if (!isReadOnly) return;

    // Intercept all native form submits
    const handleFormSubmit = (e: SubmitEvent) => {
      // Allow if it's the license update form
      const target = e.target as HTMLFormElement;
      if (target?.action?.includes('/license')) return;
      
      e.preventDefault();
      e.stopPropagation();
      toast({ 
        variant: "destructive", 
        title: "System is in Read-Only Mode", 
        description: message
      });
    };

    window.addEventListener('submit', handleFormSubmit, { capture: true });

    // Intercept fetch requests (Next.js Server Actions and APIs)
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const resource = args[0];
      const config = args[1] || {};
      
      const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
      const method = config.method || (resource instanceof Request ? resource.method : 'GET');

      // Allow GET requests and allow the license update API
      if (method.toUpperCase() === 'GET' || url.includes('/api/license/update')) {
        return originalFetch.apply(this, args);
      }

      // Block all other mutations
      toast({ 
        variant: "destructive", 
        title: "System is in Read-Only Mode", 
        description: message
      });
      
      return new Response(JSON.stringify({ error: message }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    return () => {
      window.removeEventListener('submit', handleFormSubmit, { capture: true });
      window.fetch = originalFetch;
    };
  }, [isReadOnly, message]);

  return (
    <>
      {isReadOnly && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-center shadow-lg border-b border-amber-500/30">
          <ShieldAlert className="w-4 h-4 mr-2 text-amber-500" />
          <span className="font-bold mr-2 text-amber-500 tracking-wide text-sm">SUBSCRIPTION ALERT:</span>
          <span className="text-sm font-medium">{message} Your system is in read-only mode until renewed.</span>
        </div>
      )}
      <div className={isReadOnly ? "pt-11" : ""}>
        {children}
      </div>
    </>
  );
}
