import { prisma } from "@/lib/prisma";


export class AssignmentRepository {
    async getDepartment(id: string, ) {
        return await prisma.department.findUnique({ where: { id } });
    }

    async removeHod(departmentId: string, ) {
        return await prisma.department.update({
            where: { id: departmentId },
            data: { hodId: null }
        });
    }

    async assignHodAndNotify(departmentId: string, newHodId: string, deptName: string) {
        return await prisma.$transaction([
            prisma.department.update({
                where: { id: departmentId },
                data: { hodId: newHodId }
            }),
            prisma.user.update({
                where: { id: newHodId },
                data: { role: 'HOD', departmentId }
            }),
            prisma.notification.create({
                data: {
                    userId: newHodId,
                    title: 'New Responsibility Assigned',
                    body: `You have been assigned as the Head of Department for the ${deptName} department.`,
                    type: 'INFO'
                }
            })
        ]);
    }

    async assignTeacherDepartmentAndNotify(teacherId: string, departmentId: string, deptName: string) {
        return await prisma.$transaction([
            prisma.user.update({
                where: { id: teacherId },
                data: { departmentId }
            }),
            prisma.notification.create({
                data: {
                    userId: teacherId,
                    title: 'Department Assigned',
                    body: `You have been assigned to the ${deptName} department.`,
                    type: 'INFO'
                }
            })
        ]);
    }
}
