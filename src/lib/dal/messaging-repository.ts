import { prisma } from "@/lib/prisma";

export class MessagingRepository {
  async getSchool() {
    return prisma.systemProfile.findFirst();
  }

  async getParentCount() {
    return prisma.guardian.count({ where: {} });
  }

  async getStaffCount() {
    return prisma.user.count({ where: { role: { in: ['TEACHER', 'ADMIN'] } } });
  }

  async getStudentCount(classId: string) {
    return prisma.student.count({ where: { classId } });
  }

  async createMessageBlast(data: any) {
    return prisma.messageBlast.create({ data });
  }
}
