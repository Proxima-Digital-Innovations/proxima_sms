import { headers } from 'next/headers';
import { prisma } from './prisma';

/**
 * Retrieves the current school ID from request headers (injected by middleware)
 */
export async function getSchoolId() {
  const headerList = await headers();
  const slug = headerList.get('x-tenant-slug');
  
  if (!slug) return null;

  const school = await prisma.systemProfile.findFirst({
    where: { name: slug },
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
    throw new Error('Tenant context missing. Please ensure you are accessing via a school slug.');
  }
  return id;
}
