
import { prisma } from './prisma';

/**
 * Centralized Service for ERP Dashboard Analytics
 * Provides high-level KPIs for different roles
 */
export const analyticsService = {
    /**
     * CFO / Admin: Financial Overview
     */
    getFinancialKPIs: async () => {
        const funds = await prisma.fund.findMany();
        const totalBalance = funds.reduce((acc, f) => acc + f.balance, 0);
        
        const unpaidInvoices = await prisma.invoice.aggregate({
            where: { status: 'UNPAID' },
            _sum: { amount: true }
        });

        const pendingPayroll = await prisma.payroll.aggregate({
            where: { status: 'pending' },
            _sum: { amount: true }
        });

        return {
            totalLiquidity: totalBalance,
            receivables: unpaidInvoices._sum.amount || 0,
            pendingLiabilities: pendingPayroll._sum.amount || 0,
            fundBreakdown: funds.map(f => ({ name: f.name, balance: f.balance }))
        };
    },

    /**
     * Principal / SLT: Academic & Enrollment Overview
     */
    getAcademicKPIs: async () => {
        const totalStudents = await prisma.student.count({ where: { status: 'Active' } });
        
        const lowPerformanceCount = await prisma.submission.count({
            where: {
                score: { lt: 50 } // Basic threshold
            }
        });

        const attendanceToday = await prisma.attendance.count({
            where: {
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lte: new Date(new Date().setHours(23, 59, 59, 999))
                },
                status: 'Present'
            }
        });

        return {
            role: 'SLT', // Explicitly indicate role context
            enrollment: totalStudents,
            atRiskStudents: lowPerformanceCount,
            todayAttendanceRate: totalStudents > 0 ? (attendanceToday / totalStudents) * 100 : 0
        };
    },

    /**
     * Teacher: Class & Grading Overview
     */
    getTeacherKPIs: async (teacherId: string) => {
        const classes = await prisma.class.findMany({
            where: { teacherId },
            include: {
                _count: {
                    select: { currentStudents: true, assignments: true }
                }
            }
        });

        return {
            myClassesCount: classes.length,
            totalStudents: classes.reduce((acc, c) => acc + c._count.currentStudents, 0),
            activeAssignments: classes.reduce((acc, c) => acc + c._count.assignments, 0)
        };
    }
};
