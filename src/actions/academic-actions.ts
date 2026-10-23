'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STAFF_FILTER } from '@/lib/dal/staff-repository';
import { getActiveInstitutionalModules } from '@/lib/modules/module-registry';
import { getFinancialSummary, getRevenueVsExpenseData } from './report-actions';

export async function getAdminDashboardStats() {
    try {
        const activeModules = await getActiveInstitutionalModules();
        const hasSecondary = activeModules.includes('SECONDARY_SCHOOL');
        const hasTertiary = activeModules.includes('TERTIARY_INSTITUTION');
        const hasFinance = activeModules.includes('FINANCE');
        const hasElibrary = activeModules.includes('E_LIBRARY');

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Execute all dashboard queries concurrently in a single Promise.all wave
        const [
            secStudents,
            terStudents,
            totalStaff,
            secClasses,
            totalPrograms,
            totalCourses,
            totalApplicants,
            totalBooks,
            currentTerm,
            finSummary,
            revExpData,
            recentActivities,
            recentAttendance,
        ] = await Promise.all([
            hasSecondary || !hasTertiary
                ? prisma.student.count({ where: { status: { in: ['ACTIVE', 'Active'] } } })
                : Promise.resolve(0),
            hasTertiary
                ? prisma.studentProfile.count()
                : Promise.resolve(0),
            prisma.user.count({ where: STAFF_FILTER }),
            hasSecondary
                ? prisma.class.count()
                : Promise.resolve(0),
            hasTertiary
                ? prisma.academicProgram.count()
                : Promise.resolve(0),
            hasTertiary
                ? prisma.course.count()
                : Promise.resolve(0),
            hasTertiary
                ? prisma.admissionApplicant.count()
                : Promise.resolve(0),
            hasElibrary
                ? prisma.eLibraryBook.count()
                : Promise.resolve(0),
            hasFinance
                ? prisma.term.findFirst({ where: { isActive: true }, select: { id: true } })
                : Promise.resolve(null),
            hasFinance
                ? getFinancialSummary()
                : Promise.resolve({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0 }),
            hasFinance
                ? getRevenueVsExpenseData()
                : Promise.resolve([]),
            prisma.auditLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { action: true, entity: true, createdAt: true }
            }),
            prisma.staffAttendance.findMany({
                where: { date: { gte: sevenDaysAgo } },
                select: { date: true, timeIn: true }
            }),
        ]);

        const totalStudents = hasSecondary && hasTertiary
            ? secStudents + terStudents
            : hasTertiary
                ? terStudents
                : secStudents;

        const activeClasses = hasSecondary ? secClasses : totalPrograms;

        let totalRevenue = 0;
        let pendingPayments = 0;
        let chartRevenueData: any[] = [];

        if (hasFinance) {
            totalRevenue = finSummary.totalRevenue;
            const pending = await prisma.invoice.aggregate({
                _sum: { balance: true },
                where: currentTerm
                    ? { termId: currentTerm.id, status: { not: 'PAID' } }
                    : { status: { not: 'PAID' } }
            });
            pendingPayments = pending._sum.balance || 0;
            chartRevenueData = revExpData.map(d => ({ name: d.name, total: d.Revenue }));
        }

        const formattedActivities = recentActivities.map(log => ({
            title: `${log.action} on ${log.entity}`,
            time: log.createdAt.toISOString(),
            type: 'system'
        }));
        
        const attendanceData = [
            { name: 'Mon', present: 0, absent: 0 },
            { name: 'Tue', present: 0, absent: 0 },
            { name: 'Wed', present: 0, absent: 0 },
            { name: 'Thu', present: 0, absent: 0 },
            { name: 'Fri', present: 0, absent: 0 },
        ];
        
        recentAttendance.forEach(a => {
            const dayName = new Date(a.date).toLocaleString('default', { weekday: 'short' });
            const day = attendanceData.find(d => d.name === dayName);
            if (day) {
                if (a.timeIn) day.present++;
                else day.absent++;
            }
        });

        return { 
            success: true, 
            data: {
                totalStudents,
                totalStaff,
                totalRevenue,
                pendingPayments,
                activeClasses,
                totalPrograms,
                totalCourses,
                totalBooks,
                totalApplicants,
                recentActivities: formattedActivities,
                revenueData: chartRevenueData,
                attendanceData,
                activeModules
            } 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMidtermResults(classId: string) {
    try {
        const results = await prisma.termGrade.findMany({
            where: { student: { classId } },
            include: { student: true, subject: true }
        });
        return { success: true, data: results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveMidtermResult(data: any) {
    try {
        const { studentId, subjectId, score, comment, termId = 'current' } = data;
        const result = await prisma.termGrade.upsert({
            where: { 
                studentId_subjectId_termId: {
                    studentId, subjectId, termId
                }
            },
            update: { ca1: Number(score), remarks: comment },
            create: {
                studentId, subjectId, ca1: Number(score), remarks: comment, termId
            }
        });
        revalidatePath('/dashboard/midterm/view');
        return { success: true, data: result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getTahfeezScores(classId?: string) {
    try {
        const whereClause = classId ? { student: { classId } } : {};
        const scores = await prisma.tahfeezScore.findMany({
            where: whereClause,
            include: { student: true }
        });
        return { success: true, data: scores };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function saveTahfeezScore(data: any) {
    try {
        const score = await prisma.tahfeezScore.create({
            data: {
                studentId: data.studentId,
                surah: data.surah,
                startAyah: data.ayahFrom ? Number(data.ayahFrom) : undefined,
                endAyah: data.ayahTo ? Number(data.ayahTo) : undefined,
                marks: Number(data.score),
                fluencyScore: data.fluency ? Number(data.fluency) : undefined,
                memorizationScore: data.memorization ? Number(data.memorization) : undefined,
                tajweedScore: data.tajweed ? Number(data.tajweed) : undefined,
                termId: data.termId || 'current',
                session: data.session || 'current'
            }
        });
        revalidatePath('/dashboard/tahfeez');
        return { success: true, data: score };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
