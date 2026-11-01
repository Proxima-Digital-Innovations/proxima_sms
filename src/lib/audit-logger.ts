import { prisma } from '@/lib/prisma';

export interface LogSecurityEventOptions {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, any> | string;
  userId?: string | null;
}

/**
 * Enterprise Audit Logger for recording security-critical events
 * (Role changes, password resets, failed attempts, privilege escalations, financial operations)
 */
export async function logSecurityEvent({
  action,
  entity,
  entityId,
  details,
  userId,
}: LogSecurityEventOptions): Promise<void> {
  try {
    const detailsString = typeof details === 'object' ? JSON.stringify(details) : details || null;

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        details: detailsString,
        userId: userId || null,
      },
    });
  } catch (err) {
    // Audit logging should never bring down the primary transaction, but must log warning
    console.error('[AuditLogger] Failed to record security event:', err);
  }
}
