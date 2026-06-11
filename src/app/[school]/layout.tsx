import { ReactNode } from 'react';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function SchoolLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ school: string }>
}) {
  const { school: schoolSlug } = await params;

  const schoolData = await prisma.school.findFirst({
    where: {
      OR: [
        { subdomain: schoolSlug },
        { slug: schoolSlug }
      ]
    }
  });

  if (!schoolData) {
    redirect('/404');
  }

  const isExpired = new Date() > schoolData.expiresAt;
  const isSuspended = schoolData.licenseStatus === 'SUSPENDED';
  const isLicenseExpiredStatus = schoolData.licenseStatus === 'EXPIRED';

  if (isExpired || isSuspended || isLicenseExpiredStatus) {
    redirect(`/license-expired?school=${schoolData.name}`);
  }

  return <>{children}</>;
}
