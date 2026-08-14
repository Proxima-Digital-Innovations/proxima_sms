'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAdminDashboardStats() {
    try {
        const totalStudents = await prisma.student.count({ where: { status: 'ACTIVE' } });
        const totalStaff = await prisma.user.count({ where: { status: 'active' } });
        const activeClasses = await prisma.class.count();

        const currentTerm = await prisma.term.findFirst({
            where: { isActive: true },
            select: { id: true }
        });

        let totalRevenue = 0;
        let pendingPayments = 0;

        if (currentTerm) {
            const receipts = await prisma.paymentReceipt.aggregate({
                _sum: { amount: true },
                where: { invoice: { termId: currentTerm.id } }
            });
            totalRevenue = receipts._sum.amount || 0;

            const pending = await prisma.invoice.aggregate({
                _sum: { balance: true },
                where: { termId: currentTerm.id, status: { not: 'PAID' } }
            });
            pendingPayments = pending._sum.balance || 0;
        } else {
            // Fallback to all time if no active term
            const receipts = await prisma.paymentReceipt.aggregate({
                _sum: { amount: true }
            });
            totalRevenue = receipts._sum.amount || 0;
            
            const pending = await prisma.invoice.aggregate({
                _sum: { balance: true },
                where: { status: { not: 'PAID' } }
            });
            pendingPayments = pending._sum.balance || 0;
        }

        const recentActivities = await prisma.auditLog.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { action: true, entity: true, createdAt: true }
        });

        const formattedActivities = recentActivities.map(log => ({
            title: `${log.action} on ${log.entity}`,
            time: log.createdAt.toISOString(),
            type: 'system'
        }));

        const allReceipts = await prisma.paymentReceipt.findMany({
            select: { amount: true, date: true }
        });
        
        const monthlyRevenue = Array(6).fill(0).map((_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            return {
                name: d.toLocaleString('default', { month: 'short' }),
                total: 0,
                monthIndex: d.getMonth(),
                year: d.getFullYear()
            };
        });

        allReceipts.forEach(r => {
            const d = new Date(r.date);
            const m = monthlyRevenue.find(mr => mr.monthIndex === d.getMonth() && mr.year === d.getFullYear());
            if (m) m.total += r.amount;
        });
        
        const chartRevenueData = monthlyRevenue.map(m => ({ name: m.name, total: m.total }));

        const attendanceData = [
            { name: 'Mon', present: 0, absent: 0 },
            { name: 'Tue', present: 0, absent: 0 },
            { name: 'Wed', present: 0, absent: 0 },
            { name: 'Thu', present: 0, absent: 0 },
            { name: 'Fri', present: 0, absent: 0 },
        ];
        
        const recentAttendance = await prisma.staffAttendance.findMany({
            where: {
                date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });
        
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
                recentActivities: formattedActivities,
                revenueData: chartRevenueData,
                attendanceData
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
