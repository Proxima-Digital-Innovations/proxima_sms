'use server';

import { auth } from '@/auth';

type AllowedRole = 'ADMIN' | 'SLT' | 'HOD' | 'TEACHER' | 'ACCOUNTANT' | 'EXAM_OFFICER' | 'PARENT';

interface SessionUser {
  id: string;
  email: string;
  role: AllowedRole;
  isSuperAdmin: boolean;
}

/**
 * Retrieves the current authenticated session user.
 * Throws if no session exists, preventing unauthenticated access.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Authentication required. Please log in.');
  }
  return session.user as unknown as SessionUser;
}

/**
 * Requires the user to be a Super Admin (platform owner).
 * Use for hub-level operations (manage tenants, licenses, global config).
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (!user.isSuperAdmin) {
    throw new Error('Access denied. Super Admin privileges required.');
  }
  return user;
}

/**
 * Requires the user to have one of the specified roles.
 */
export async function requireRole(allowedRoles: AllowedRole[]): Promise<SessionUser> {
  const user = await requireAuth();

  // Super admins bypass role checks
  if (user.isSuperAdmin) return user;

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}.`);
  }

  return user;
}

/**
 * Requires the user to be an administrator (ADMIN or SLT).
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(['ADMIN', 'SLT']);
}

/**
 * Requires the user to have finance access (ADMIN, SLT, or ACCOUNTANT).
 */
export async function requireFinanceAccess(): Promise<SessionUser> {
  return requireRole(['ADMIN', 'SLT', 'ACCOUNTANT']);
}

/**
 * Requires the user to have academic staff access (ADMIN, SLT, HOD, TEACHER, EXAM_OFFICER).
 */
export async function requireStaffAccess(): Promise<SessionUser> {
  return requireRole(['ADMIN', 'SLT', 'HOD', 'TEACHER', 'EXAM_OFFICER']);
}
