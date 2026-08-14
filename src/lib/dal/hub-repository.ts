import { prisma } from "@/lib/prisma";

export class HubRepository {
  async countSchools() {
    return prisma.systemProfile.count();
  }

  async countUsers() {
    return prisma.user.count();
  }

  async countStudents() {
    return prisma.student.count();
  }

  async countTeachers() {
    return prisma.user.count({ where: { role: 'TEACHER' } });
  }

  async getRecentSchools(take: number) {
    return prisma.systemProfile.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async getAllSchools() {
    return prisma.systemProfile.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async createSchool(data: { name: string; slug: string; email: string; phone: string; address: string }) {
    return prisma.systemProfile.create({ data: { name: data.name, email: data.email, phone: data.phone, address: data.address, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
  }
}
