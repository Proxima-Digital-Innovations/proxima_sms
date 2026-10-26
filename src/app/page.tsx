import { LoginLayout } from '@/components/auth/login-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PlatformLoginPage() {
  return (
    <LoginLayout
      schoolName="Proxima SMS"
      tagline="Centralized Institutional Portal"
    >
      <div className="space-y-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
          <LoginForm />
        </Suspense>

        <div className="pt-4 border-t border-border">
          <Link 
            href="/super-admin" 
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors block text-center tracking-wider uppercase"
          >
            Platform Administrator
          </Link>
        </div>
      </div>
    </LoginLayout>
  );
}
