import { prisma } from '@/lib/prisma';

export class PayrollRepository {
    async getExistingRuns(month: number, year: number) {
        return prisma.payroll.findMany({
            where: { month, year },
        });
    }

    async getStaffWithContracts() {
        return prisma.contract.findMany({
            where: { status: 'active' },
            include: { user: true }
        });
    }

    async getSalaryStructures() {
        return [];
    }

    async getMonthlyAttendance(startOfMonth: Date, endOfMonth: Date) {
        return prisma.staffAttendance.findMany({
            where: {
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth
                }
            }
        });
    }

    async createPayrollRecordsTransaction(dataArray: any[]) {
        return prisma.$transaction(
            dataArray.map(data => prisma.payroll.create({ data }))
        );
    }

    async getPayrollHistory() {
        return prisma.payroll.findMany({
            where: {},
            include: { user: { select: { firstName: true, lastName: true, email: true } } },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });
    }
}
