import { prisma } from '@/lib/prisma';
import { LoginLayout } from '@/components/auth/login-layout';
import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default async function LoginPage() {
  // Fetch system details server-side (Single Tenant) with safe fallback
  const school = await prisma.systemProfile.findFirst().catch(() => null);

  const schoolName = school?.name || 'School Management Portal';
  const logo = school?.logoUrl || undefined;

  return (
    <LoginLayout
      schoolName={schoolName}
      logo={logo}
      tagline="Academic & Administrative Portal"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
        <LoginForm />
      </Suspense>
    </LoginLayout>
  );
}
