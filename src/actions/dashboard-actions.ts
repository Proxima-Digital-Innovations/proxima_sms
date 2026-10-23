'use server';

import { prisma } from '@/lib/prisma';

export async function getDashboardStats(role: string, userId: string) {
    try {
        if (role === 'TEACHER') {
            const [pendingPlans, approvedPlans, rejectedPlans] = await Promise.all([
                prisma.lessonNote.count({ where: { teacherId: userId, status: 'SUBMITTED' } }),
                prisma.lessonNote.count({ where: { teacherId: userId, status: 'APPROVED' } }),
                prisma.lessonNote.count({ where: { teacherId: userId, status: { in: ['REJECTED', 'DRAFT'] } } }),
            ]);
            return {
                success: true,
                data: { pendingPlans, approvedPlans, rejectedPlans, pendingExams: 0 }
            };
        }

        const [studentsCount, teachersCount, classesCount, announcements] = await Promise.all([
            prisma.student.count({ where: { status: 'ACTIVE' } }),
            prisma.user.count({ where: { role: 'TEACHER' } }),
            prisma.class.count(),
            prisma.announcement.findMany({ take: 5, orderBy: { createdAt: 'desc' } }),
        ]);

        return {
            success: true,
            data: { studentsCount, teachersCount, classesCount, announcements }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
