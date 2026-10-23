import { prisma } from '@/lib/prisma';

export const STAFF_FILTER = {
    role: { notIn: ['PARENT', 'STUDENT'] }
};

export class StaffRepository {
    async countStaffByRole(role: string) {
        return prisma.user.count({ where: { role } });
    }
    async createStaffUser(data: any) {
        return prisma.$transaction(async (tx) => {
            const user = await tx.user.create({ data });

            // Automatically provision StaffProfile for academic & administrative roles
            const roleUpper = (user.role || '').toUpperCase();
            if (['LECTURER', 'HOD', 'HEADOFDEPARTMENT', 'SLT', 'ADMIN', 'EXAM_OFFICER', 'TEACHER'].includes(roleUpper)) {
                const staffCode = user.staffId || `STF-${user.id.slice(0, 8).toUpperCase()}`;
                await tx.staffProfile.upsert({
                    where: { userId: user.id },
                    create: {
                        userId: user.id,
                        staffCode,
                        departmentId: user.departmentId || null,
                    },
                    update: {
                        departmentId: user.departmentId || null,
                    },
                });
            }

            return user;
        });
    }
    async getStaffList() {
        return prisma.user.findMany({
            where: STAFF_FILTER,
            include: { 
                department: true,
                staffProfile: true,
                accessRoles: { select: { id: true, name: true } } 
            },
            orderBy: { lastName: 'asc' }
        });
    }
    async deleteStaffUser(userId: string) {
        return prisma.user.delete({
            where: { id: userId }
        });
    }
}
