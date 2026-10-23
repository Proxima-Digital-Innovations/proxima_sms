import { AttendanceRepository } from '../dal/attendance-repository';

const attendanceRepo = new AttendanceRepository();

export class AttendanceService {
    static async getAttendanceForDay(date: Date, classId: string) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return await attendanceRepo.getAttendanceForDay(classId, startOfDay, endOfDay);
    }

    static async saveAttendance(date: Date, classId: string, records: any[]) {
        const activeTerm = await attendanceRepo.getActiveTerm();

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        await attendanceRepo.deleteAttendanceForDay(classId, startOfDay, endOfDay);

        if (records.length === 0) {
            return true;
        }

        const dataArray = records.map(record => ({
            studentId: record.studentId,
            classId,
            termId: activeTerm ? activeTerm.id : null,
            date,
            status: record.status,
            method: 'MANUAL',
        }));

        await attendanceRepo.createAttendanceRecords(dataArray);
        return true;
    }
}
