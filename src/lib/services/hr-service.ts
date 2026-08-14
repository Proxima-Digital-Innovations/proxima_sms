import { HrRepository } from '../dal/hr-repository';

const hrRepo = new HrRepository();

export class HrService {
    static async getLeaveRequests() {
        return hrRepo.getLeaveRequests();
    }

    static async createLeaveRequest(userId: string, startDate: Date, endDate: Date, reason: string) {
        return hrRepo.createLeaveRequest({ userId, startDate, endDate, reason });
    }

    static async updateLeaveStatus(id: string, status: string) {
        return hrRepo.updateLeaveStatus(id, status);
    }

    static async getOrphanedClasses(date: Date) {
        let jsDay = date.getDay();
        let dbDay = jsDay === 0 ? 7 : jsDay;

        const leaves = await hrRepo.getApprovedLeavesCoveringDate(date);
        const absentTeacherIds = leaves.map(l => l.userId);

        if (absentTeacherIds.length === 0) return [];

        const activeTerm = await hrRepo.getActiveTerm();
        if (!activeTerm) throw new Error("No active term found.");

        return hrRepo.getOrphanedClasses(activeTerm.id, dbDay, absentTeacherIds, date);
    }

    static async getAvailableSubstituteTeachers() {
        const today = new Date();
        const onLeave = await hrRepo.getApprovedLeavesCoveringDate(today);
        const onLeaveIds = onLeave.map(l => l.userId);

        return hrRepo.getAvailableTeachers(onLeaveIds);
    }

    static async assignSubstitute(timetableId: string, substituteId: string, date: Date) {
        return hrRepo.assignSubstitute({ timetableId, substituteId, date });
    }

    static async getHodDashboardData() {
        return {};
    }

    static async getStaffProfiles() {
        return hrRepo.getStaffProfiles();
    }
}
