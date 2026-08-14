import { AssignmentRepository } from '../dal/assignment-repository';

const repo = new AssignmentRepository();

export class AssignmentService {
    async assignHod(departmentId: string, newHodId: string | null, ) {
        const dept = await repo.getDepartment(departmentId);
        if (!dept) throw new Error('Department not found.');

        if (newHodId === 'remove' || newHodId === null) {
            await repo.removeHod(departmentId);
        } else {
            await repo.assignHodAndNotify(departmentId, newHodId, dept.name);
        }
    }

    async assignTeacherDepartment(teacherId: string, departmentId: string, ) {
        const dept = await repo.getDepartment(departmentId);
        if (!dept) throw new Error("Department not found.");

        await repo.assignTeacherDepartmentAndNotify(teacherId, departmentId, dept.name);
    }
}
