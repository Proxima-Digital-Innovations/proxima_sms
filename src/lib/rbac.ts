import { prisma } from '@/lib/prisma';

export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage';
export type Resource = 'inventory' | 'attendance' | 'grades' | 'students' | 'staff' | 'kiosk' | 'finance' | 'settings' | 'communication' | 'academics';

export async function hasPermission(userId: string, action: Action, resource: Resource): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accessRoles: {
        include: {
          permissions: true
        }
      },
      permissions: true
    }
  });

  if (!user) return false;

  // SYSTEM ROLES: SUPER_ADMIN bypasses all checks
  if (user.role === 'SUPER_ADMIN') return true;

  // 1. Check direct overrides on the User
  for (const perm of user.permissions) {
    if (perm.resource === resource && (perm.action === action || perm.action === 'manage')) {
      return true;
    }
  }

  // 2. Check permissions inherited from AccessRoles
  for (const role of user.accessRoles) {
    for (const perm of role.permissions) {
      if (perm.resource === resource && (perm.action === action || perm.action === 'manage')) {
        return true;
      }
    }
  }

  return false;
}

export async function requirePermission(userId: string, action: Action, resource: Resource) {
  const isAllowed = await hasPermission(userId, action, resource);
  if (!isAllowed) {
    throw new Error(`Unauthorized: Requires '${action}' permission on '${resource}'`);
  }
}
