
import { LoginLayout } from '@/components/auth/login-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PlatformLoginPage() {
  return (
    <LoginLayout
      schoolName="Proxima SMS"
      tagline="Centralized Management System"
    >
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
          <LoginForm />
        </Suspense>

        <div className="pt-4 border-t border-slate-100">
           <Link href="/super-admin" className="text-xs font-bold text-muted-foreground hover:text-slate-900 transition-colors block text-center uppercase tracking-widest">
             Platform Administrator
           </Link>
        </div>
      </div>
    </LoginLayout>
  );
}
