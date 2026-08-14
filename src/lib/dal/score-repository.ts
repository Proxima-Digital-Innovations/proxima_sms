import { prisma } from '@/lib/prisma';

export class ScoreRepository {
  async getStudentsByDisplayIds(studentIds: string[]) {
    return prisma.student.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true, studentId: true },
    });
  }
  async getSubjectByName(name: string) {
    return prisma.subject.findFirst({
      where: { name },
      select: { id: true },
    });
  }
  async getActiveTerm() {
    return prisma.term.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
  }
  async upsertTermGrade(data: any) {
    return prisma.termGrade.upsert(data);
  }
}