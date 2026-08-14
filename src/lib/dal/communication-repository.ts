import { prisma } from "@/lib/prisma";

export class CommunicationRepository {
  async getMessageHistory() {
    return prisma.messageBlast.findMany({
      where: {},
      include: {
        sender: { select: { firstName: true, lastName: true } }
      },
      orderBy: { sentAt: 'desc' }
    });
  }

  async getAdmin() {
    return prisma.user.findFirst({ where: { role: 'ADMIN' } });
  }

  async getParentCount() {
    return prisma.guardian.count({ where: {} });
  }

  async getTeacherCount() {
    return prisma.user.count({ where: { role: 'TEACHER' } });
  }

  async getStudentCount(classId: string) {
    return prisma.student.count({ where: { classId } });
  }

  async createMessageBlast(data: any) {
    return prisma.messageBlast.create({ data });
  }
}
