'use server';

import { prisma } from '@/lib/prisma';

export async function getDashboardStats(role: string, userId: string) {
    try {
        const stats = {
            studentsCount: await prisma.student.count({ where: { status: 'ACTIVE' } }),
            teachersCount: await prisma.user.count({ where: { role: 'TEACHER' } }),
            classesCount: await prisma.class.count(),
            announcements: await prisma.announcement.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
        };
        return { success: true, data: stats };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
