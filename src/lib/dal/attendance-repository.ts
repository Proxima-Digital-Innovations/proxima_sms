import { prisma } from '@/lib/prisma';

export class AttendanceRepository {
    async getActiveTerm() {
        const active = await prisma.term.findFirst({ where: { isActive: true } });
        if (active) return active;
        return prisma.term.findFirst({ orderBy: { startDate: 'desc' } });
    }

    async getAttendanceForDay(classId: string, startOfDay: Date, endOfDay: Date) {
        return prisma.attendance.findMany({
            where: {
                classId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
    }

    async deleteAttendanceForDay(classId: string, startOfDay: Date, endOfDay: Date) {
        return prisma.attendance.deleteMany({
            where: {
                classId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay
                }
            }
        });
    }

    async createAttendanceRecords(dataArray: any[]) {
        return prisma.attendance.createMany({
            data: dataArray
        });
    }
}
