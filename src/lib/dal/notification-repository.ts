import { prisma } from '@/lib/prisma';

export class NotificationRepository {
    static async getNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async markAsRead(id: string, ) {
        return prisma.notification.update({
            where: { id },
            data: { read: true }
        });
    }
}
