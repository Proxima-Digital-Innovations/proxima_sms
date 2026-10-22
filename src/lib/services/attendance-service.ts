import { AttendanceRepository } from '../dal/attendance-repository';
import { prisma } from '../prisma';

const attendanceRepo = new AttendanceRepository();

export class AttendanceService {
    static async saveAttendance(date: Date, classId: string, records: any[]) {
        let activeTerm = await attendanceRepo.getActiveTerm();
        if (!activeTerm) {
            activeTerm = await prisma.term.findFirst({ orderBy: { startDate: 'desc' } });
        }
        if (!activeTerm) {
            activeTerm = await prisma.term.create({
                data: {
                    name: 'First Term',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    isActive: true,
                }
            });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        await attendanceRepo.deleteAttendanceForDay(classId, startOfDay, endOfDay);

        const dataArray = records.map(record => {
            const rawStatus = (record.status || 'PRESENT').toString().toUpperCase();
            const normalizedStatus = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(rawStatus)
                ? rawStatus
                : 'PRESENT';

            return {
                studentId: record.studentId,
                classId,
                termId: activeTerm!.id,
                date,
                status: normalizedStatus
            };
        });

        await attendanceRepo.createAttendanceRecords(dataArray);
        return true;
    }
}
