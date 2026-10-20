'use server';

import { prisma } from '@/lib/prisma';

export async function getAcademicOverviewStats() {
    try {
        const [totalClasses, totalStudents, pendingLessonNotes, totalGrades, publishedGrades, missingGrades] = await Promise.all([
            prisma.class.count(),
            prisma.student.count({
                where: { status: { in: ['Active', 'ACTIVE'] } }
            }),
            prisma.lessonNote.count({
                where: { status: { in: ['SUBMITTED', 'Pending', 'pending', 'Submitted'] } }
            }),
            prisma.termGrade.count(),
            prisma.termGrade.count({ where: { isPublished: true } }),
            prisma.termGrade.count({ where: { total: null } })
        ]);

        const scoreSubmissionRate = totalGrades > 0 ? Math.round((publishedGrades / totalGrades) * 100) : 100;

        const alerts: { title: string; message: string }[] = [];
        if (pendingLessonNotes > 0) {
            alerts.push({
                title: 'Lesson Notes Awaiting Review',
                message: `${pendingLessonNotes} lesson note${pendingLessonNotes > 1 ? 's are' : ' is'} awaiting HOD/SLT approval.`
            });
        }
        if (missingGrades > 0) {
            alerts.push({
                title: 'Grades Pending Completion',
                message: `${missingGrades} grade entry/entries currently have uncalculated or missing scores.`
            });
        }
        if (alerts.length === 0) {
            alerts.push({
                title: 'Academic Status Normal',
                message: 'All submitted academic records and lesson plans are up to date.'
            });
        }

        return {
            success: true,
            data: {
                totalClasses,
                totalStudents,
                pendingLessonNotes,
                scoreSubmissionRate,
                missingGrades,
                alerts
            }
        };
    } catch (error: any) {
        console.error('Error in getAcademicOverviewStats:', error);
        return { success: false, error: error.message };
    }
}
