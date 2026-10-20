'use server';

import { prisma } from '@/lib/prisma';

export async function getDashboardStats(role: string, userId: string) {
    try {
        if (role === 'TEACHER') {
             const stats = {
                pendingPlans: await prisma.lessonNote.count({ where: { teacherId: userId, status: 'SUBMITTED' } }),
                approvedPlans: await prisma.lessonNote.count({ where: { teacherId: userId, status: 'APPROVED' } }),
                rejectedPlans: await prisma.lessonNote.count({ where: { teacherId: userId, status: { in: ['REJECTED', 'DRAFT'] } } }),
                pendingExams: 0, // Exam questions count mock
            };
            return { success: true, data: stats };
        }

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
