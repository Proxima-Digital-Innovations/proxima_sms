'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/hooks/use-toast';
import { ShieldAlert, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { LicenseStatus } from '@/lib/license-utils';
import { Button } from '@/components/ui/button';

interface LicenseProviderProps {
  children: React.ReactNode;
  status: LicenseStatus;
  message: string;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  expiryWarningMessage?: string | null;
  formattedExpiryDate?: string | null;
}

export function LicenseProvider({ 
  children, 
  status, 
  message,
  isExpiringSoon = false,
  daysUntilExpiry = null,
  expiryWarningMessage = null,
  formattedExpiryDate = null
}: LicenseProviderProps) {
  const isReadOnly = status !== 'ACTIVE';
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!isReadOnly) return;

    // Intercept native form submits when read-only
    const handleFormSubmit = (e: SubmitEvent) => {
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

    return () => {
      window.removeEventListener('submit', handleFormSubmit, { capture: true });
    };
  }, [isReadOnly, message]);

  // Determine which banner to show
  const showReadOnlyBanner = isReadOnly;
  const showExpiringSoonBanner = !isReadOnly && isExpiringSoon && !isDismissed;
  const isBannerVisible = showReadOnlyBanner || showExpiringSoonBanner;

  return (
    <>
      {showReadOnlyBanner && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-background text-foreground px-4 py-2 flex flex-wrap items-center justify-between shadow-lg border-b border-amber-500/30 gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-bold text-amber-500 tracking-wide text-xs uppercase sm:text-sm">SUBSCRIPTION ALERT:</span>
            <span className="text-xs sm:text-sm">{message} System is in read-only mode until renewed.</span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
            <Link href="/dashboard/system/license">
              Activate / Renew <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
      )}

      {showExpiringSoonBanner && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-amber-500/10 dark:bg-amber-950/40 text-foreground px-4 py-2 flex flex-wrap items-center justify-between shadow-sm border-b border-amber-500/30 gap-2 backdrop-blur-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-amber-600 dark:text-amber-400 tracking-wide text-xs uppercase sm:text-sm">SUBSCRIPTION NOTICE:</span>
            <span className="text-xs sm:text-sm">
              {expiryWarningMessage || `Your enterprise subscription expires in ${daysUntilExpiry} days (${formattedExpiryDate}). Please renew early to prevent operational interruptions.`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm">
              <Link href="/dashboard/system/license">
                Renew Now <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss notice for this session"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <div className={isBannerVisible ? "pt-11" : ""}>
        {children}
      </div>
    </>
  );
}
