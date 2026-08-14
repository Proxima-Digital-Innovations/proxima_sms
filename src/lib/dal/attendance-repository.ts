import { prisma } from '@/lib/prisma';

export class AttendanceRepository {
    async getActiveTerm() {
        return prisma.term.findFirst({ where: { isActive: true } });
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
