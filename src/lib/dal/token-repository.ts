import { prisma } from '@/lib/prisma';

export class TokenRepository {
  async getTerm(term: string) {
    return await prisma.term.findFirst({
      where: {
        OR: [
          { id: term },
          { name: term },
          { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
          { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
        ]
      }
    });
  }
  async getStudent(studentId: string) {
    return await prisma.student.findFirst({
      where: {
        OR: [ { id: studentId }, { studentId: studentId } ]
      },
      include: { class: true }
    });
  }
  async upsertToken(studentId: string, termId: string, session: string, token: string) {
    return await prisma.resultToken.upsert({
      where: { studentId_termId: { studentId, termId } },
      update: { token, usageCount: 0, maxUsage: 5, session },
      create: { studentId, termId, session, token, usageCount: 0, maxUsage: 5 }
    });
  }
  async findToken(studentId: string, token: string, termId: string, session: string) {
    return await prisma.resultToken.findFirst({
      where: { studentId, token, termId, session }
    });
  }
  async incrementTokenUsage(tokenId: string, usageCount: number) {
    return await prisma.resultToken.update({
      where: { id: tokenId },
      data: { usageCount }
    });
  }
  async getStudentScores(studentId: string, termId: string) {
    return await prisma.termGrade.findMany({
      where: { studentId, termId },
      include: { subject: true }
    });
  }
  async getBehaviouralAssessment(studentId: string, termId: string, session: string) {
    return await prisma.behaviouralAssessment.findFirst({
      where: { studentId, termId, session }
    });
  }
}
