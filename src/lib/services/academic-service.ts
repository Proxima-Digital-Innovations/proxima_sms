import { AcademicRepository } from '../dal/academic-repository';

const academicRepo = new AcademicRepository();

export class AcademicService {
    async createStandard(data: { code: string; description: string; subjectId: string }, ) {
        return await academicRepo.createStandard({ ...data });
    }

    async getStandards(subjectId?: string) {
        return await academicRepo.getStandards(subjectId);
    }

    async createAssignment(parsed: any, ) {
        const activeTerm = await academicRepo.getActiveTerm();
        if (!activeTerm) {
            throw new Error("No active term found. Cannot create assignment.");
        }

        let lmsModule = await academicRepo.getLmsModule(parsed.classId, parsed.subjectId, activeTerm.id);

        if (!lmsModule) {
            lmsModule = await academicRepo.createLmsModule({
                title: 'General Coursework',
                classId: parsed.classId,
                subjectId: parsed.subjectId,
                termId: activeTerm.id
            });
        }

        return await academicRepo.createAssignment({
            title: parsed.title,
            description: parsed.description,
            points: parsed.maxPoints,
            dueDate: parsed.dueDate,
            classId: parsed.classId,
            subjectId: parsed.subjectId,
            standardId: parsed.standardId || null,
            moduleId: lmsModule.id
        });
    }

    async submitGrades(assignmentId: string, grades: any[], ) {
        const results = await academicRepo.createSubmissions(assignmentId, grades);
        return { success: true, count: results.length };
    }

    async getAdminDashboardStats() {
        const stats = await academicRepo.getAdminDashboardStats();
        const recentActivities = stats.recentLogs.map((log: any) => ({
            title: `${log.action} ${log.entity}`,
            time: log.createdAt.toLocaleString(),
            type: log.entity.toLowerCase()
        }));

        return {
            totalStudents: stats.totalStudents,
            totalStaff: stats.totalStaff,
            totalRevenue: stats.totalRevenue,
            pendingPayments: stats.pendingPayments,
            activeClasses: stats.activeClasses,
            recentActivities
        };
    }

    async getStandardMastery(studentId: string, standardId: string) {
        const grades = await academicRepo.getRecentSubmissionsForStandard(studentId, standardId, 3);
        if (grades.length === 0) return 0;
        const sum = grades.reduce((acc: number, g: any) => acc + (g.score || 0), 0);
        return sum / grades.length;
    }
}
