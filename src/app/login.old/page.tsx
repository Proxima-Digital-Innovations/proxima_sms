import { LoginForm } from '@/components/auth/login-form';
import { LoginLayout } from '@/components/auth/login-layout';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function RootLoginPage() {
  return (
    <LoginLayout
      schoolName="School Hub Platform"
      tagline="Central Administration Portal"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
        <LoginForm />
      </Suspense>
    </LoginLayout>
  );
}
