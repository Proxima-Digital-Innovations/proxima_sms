import { prisma } from '@/lib/prisma';
import { STAFF_FILTER } from './staff-repository';

export class AcademicRepository {
    async createStandard(data: any) {
        return await prisma.standard.create({ data });
    }

    async getStandards(subjectId?: string) {
        return await prisma.standard.findMany({
            where: subjectId ? { subjectId } : {},
            include: { subject: true }
        });
    }

    async getActiveTerm() {
        return await prisma.term.findFirst({
            where: { isActive: true }
        });
    }

    async getLmsModule(classId: string, subjectId: string, termId: string, ) {
        return await prisma.lmsModule.findFirst({
            where: { classId, subjectId, termId }
        });
    }

    async createLmsModule(data: any) {
        return await prisma.lmsModule.create({ data });
    }

    async createAssignment(data: any) {
        return await prisma.assignment.create({ data });
    }

    async createSubmissions(assignmentId: string, grades: any[], ) {
        return await prisma.$transaction(async (tx) => {
            const results = await Promise.all(
                grades.map(grade => 
                    tx.submission.create({
                        data: {
                            studentId: grade.studentId,
                            assignmentId,
                            score: grade.score,
                            feedback: grade.feedback,
                            gradedAt: new Date()
                        }
                    })
                )
            );
            return results;
        });
    }

    async getAdminDashboardStats() {
        const totalStudents = await prisma.student.count({ where: { status: 'Active' } });
        const totalStaff = await prisma.user.count({ where: STAFF_FILTER });
        const revenueAgg = await prisma.invoice.aggregate({ where: {}, _sum: { amountPaid: true } });
        const pendingPayments = await prisma.invoice.count({ where: { status: { not: 'PAID' } } });
        const activeClasses = await prisma.class.count({ where: {} });
        const recentLogs = await prisma.auditLog.findMany({
            where: {},
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { action: true, entity: true, createdAt: true }
        });

        return {
            totalStudents,
            totalStaff,
            totalRevenue: revenueAgg._sum.amountPaid || 0,
            pendingPayments,
            activeClasses,
            recentLogs
        };
    }

    async getRecentSubmissionsForStandard(studentId: string, standardId: string, take: number) {
        return await prisma.submission.findMany({
            where: { studentId, assignment: { standardId } },
            orderBy: { submittedAt: 'desc' },
            take
        });
    }
}
