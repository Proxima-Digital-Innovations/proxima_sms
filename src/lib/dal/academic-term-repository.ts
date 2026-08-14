import { prisma } from "@/lib/prisma";

export class AcademicTermRepository {
  async deactivateSessions() {
    return await prisma.academicSession.updateMany({
      where: {},
      data: { isActive: false }
    });
  }

  async createSession(data: any) {
    return await prisma.academicSession.create({ data });
  }

  async deactivateTerms() {
    return await prisma.term.updateMany({
      where: {},
      data: { isActive: false }
    });
  }

  async createTerm(data: any) {
    return await prisma.term.create({ data });
  }

  async getSessionsWithTerms() {
    return await prisma.academicSession.findMany({
      include: {
        terms: {
          orderBy: { startDate: 'asc' }
        }
      },
      orderBy: { startDate: 'desc' }
    });
  }

  async setSessionActive(id: string) {
    return await prisma.$transaction([
      prisma.academicSession.updateMany({ data: { isActive: false } }),
      prisma.academicSession.update({ where: { id }, data: { isActive: true } })
    ]);
  }

  async setTermActive(id: string) {
    return await prisma.$transaction([
      prisma.term.updateMany({ data: { isActive: false } }),
      prisma.term.update({ where: { id }, data: { isActive: true } })
    ]);
  }
}
