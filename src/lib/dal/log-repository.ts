import { prisma } from '@/lib/prisma';

export class LogRepository {
    static async getAuditLogs() {
        return prisma.auditLog.findMany({
            where: {},
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true }
                }
            }
        });
    }
}
