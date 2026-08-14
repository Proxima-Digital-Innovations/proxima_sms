import { prisma } from "@/lib/prisma";

export class LmsQuizRepository {
  async findModuleById(moduleId: string) {
    return await prisma.lmsModule.findUnique({ where: { id: moduleId } });
  }

  async createQuiz(data: any) {
    return await prisma.quiz.create({ data });
  }

  async findQuizById(quizId: string) {
    return await prisma.quiz.findUnique({ where: { id: quizId } });
  }

  async createQuizQuestion(data: any) {
    return await prisma.quizQuestion.create({ data });
  }

  async findQuizWithQuestionsAndModule(quizId: string) {
    return await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        questions: true,
        module: { include: { subject: true } }
      }
    });
  }

  async createQuizAttempt(data: any) {
    return await prisma.quizAttempt.create({ data });
  }

  async findActiveTerm() {
    return await prisma.term.findFirst({ where: { isActive: true } });
  }

  async upsertTermGrade(studentId: string, subjectId: string, termId: string, score: number) {
    return await prisma.termGrade.upsert({
      where: {
        studentId_subjectId_termId: {
          studentId,
          subjectId,
          termId
        }
      },
      update: { ca1: score },
      create: {
        studentId,
        subjectId,
        termId,
        ca1: score
      }
    });
  }

  async findQuizzesByModuleId(moduleId: string) {
    return await prisma.quiz.findMany({
      where: { moduleId },
      include: { questions: true }
    });
  }
}
