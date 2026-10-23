'use server';

import { prisma } from '@/lib/prisma';

export async function getNotifications(userId: string) {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return { success: true, data: notifications };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getUnreadNotificationCount(userId: string) {
    try {
        const count = await prisma.notification.count({
            where: { userId, read: false },
        });
        return { success: true, count };
    } catch (error: any) {
        return { success: false, count: 0, error: error.message };
    }
}

export async function markNotificationAsRead(id: string) {
    try {
        await prisma.notification.update({
            where: { id },
            data: { read: true }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendNotification(data: { userId: string, title: string, message: string, type: string, link?: string }) {
    try {
        await prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                body: data.message,
                type: data.type
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
