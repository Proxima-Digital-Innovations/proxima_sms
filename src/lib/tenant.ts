import { prisma } from './prisma';
import { notFound } from 'next/navigation';

export async function getSchoolContext(name: string) {
  const school = await prisma.systemProfile.findFirst({
    where: { name },
  });

  if (!school) {
    return null;
  }

  // License Check
  const now = new Date();
  const isExpired = school.expiresAt ? school.expiresAt < now : false;
  const isSuspended = school.licenseStatus === 'SUSPENDED';

  return {
    ...school,
    isAccessible: !isExpired && !isSuspended,
    error: isSuspended ? 'Your school account has been suspended.' : isExpired ? 'Your license has expired. Please renew.' : null
  };
}
