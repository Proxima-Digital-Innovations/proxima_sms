import { prisma } from '@/lib/prisma';


export class StaffRepository {
    async countStaffByRole(role: string, ) {
        return prisma.user.count({ where: { role } });
    }
    async createStaffUser(data: any) {
        return prisma.user.create({ data });
    }
    async getStaffList() {
        return prisma.user.findMany({
            where: { role: { not: 'PARENT' } },
            include: { 
                department: true,
                accessRoles: { select: { id: true, name: true } } 
            },
            orderBy: { lastName: 'asc' }
        });
    }
    async deleteStaffUser(userId: string, ) {
        return prisma.user.delete({
            where: { id: userId }
        });
    }
}
