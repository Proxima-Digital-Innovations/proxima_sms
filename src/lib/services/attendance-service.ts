import { AttendanceRepository } from '../dal/attendance-repository';

const attendanceRepo = new AttendanceRepository();

export class AttendanceService {
    static async saveAttendance(date: Date, classId: string, records: any[]) {
        const activeTerm = await attendanceRepo.getActiveTerm();
        if (!activeTerm) throw new Error("No active academic term found.");

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        await attendanceRepo.deleteAttendanceForDay(classId, startOfDay, endOfDay);

        const dataArray = records.map(record => ({
            studentId: record.studentId,
            classId,
            termId: activeTerm.id,
            date,
            status: record.status
        }));

        await attendanceRepo.createAttendanceRecords(dataArray);
        return true;
    }
}
