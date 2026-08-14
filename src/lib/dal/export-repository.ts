import { prisma } from '@/lib/prisma';

export class ExportRepository {
    static async getStudents() {
        return prisma.student.findMany({
            where: {},
            select: { studentId: true, firstName: true, lastName: true, gender: true, status: true, admissionDate: true }
        });
    }

    static async getStaff() {
        return prisma.user.findMany({
            where: {},
            select: { staffId: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true }
        });
    }
}
