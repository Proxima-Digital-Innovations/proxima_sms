
import { prisma } from '@/lib/prisma';
import { LoginLayout } from '@/components/auth/login-layout';
import { LoginForm } from '@/components/auth/login-form';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

interface TenantLoginPageProps {
  params: Promise<{
    school: string;
  }>;
}

export default async function TenantRootPage({ params }: TenantLoginPageProps) {
  const { school: schoolSlug } = await params;

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    notFound();
  }

  return (
    <LoginLayout
      schoolName={school.name}
      logo={school.logoUrl || undefined}
      tagline="Academic Portal"
    >
      <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
        <LoginForm schoolSlug={schoolSlug} />
      </Suspense>
    </LoginLayout>
  );
}
