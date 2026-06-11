import { headers } from 'next/headers';
import { prisma } from './prisma';

/**
 * Retrieves the current school ID from request headers (injected by middleware)
 */
export async function getSchoolId() {
  const headerList = await headers();
  const subdomain = headerList.get('x-tenant-subdomain');
  
  if (!subdomain) return null;

  const school = await prisma.school.findUnique({
    where: { subdomain },
    select: { id: true }
  });

  return school?.id || null;
}

/**
 * Ensures a school context exists, or throws an error.
 * Use this in Server Actions to guarantee tenant isolation.
 */
export async function requireSchoolId() {
  const id = await getSchoolId();
  if (!id) {
    throw new Error('Tenant context missing. Please ensure you are accessing via a school subdomain.');
  }
  return id;
}
