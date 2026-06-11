'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, Mail } from 'lucide-react';
import { Suspense } from 'react';

function LicenseExpiredContent() {
  const searchParams = useSearchParams();
  const schoolName = searchParams.get('school') || 'This school';

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md bg-neutral-900 border-rose-500/30">
        <CardContent className="pt-10 pb-8 px-8 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-10 h-10 text-rose-500" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">License Expired</h1>
            <p className="text-neutral-400 leading-relaxed">
              The Proxima Hub license for <strong className="text-white">{schoolName}</strong> has expired or been suspended.
            </p>
          </div>

          <div className="bg-black/50 border border-white/5 p-4 rounded-xl">
            <p className="text-sm text-neutral-400">
              Please contact the Super Admin or billing department to renew the license and restore access to the platform.
            </p>
          </div>

          <button className="w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" /> Contact Support
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LicenseExpiredPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /></div>}>
      <LicenseExpiredContent />
    </Suspense>
  );
}
