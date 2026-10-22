'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyParentDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex justify-center items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium text-sm animate-pulse">Loading Parent Portal...</p>
      </div>
    </div>
  );
}
