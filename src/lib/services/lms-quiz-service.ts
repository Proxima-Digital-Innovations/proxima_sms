import { LmsQuizRepository } from '../dal/lms-quiz-repository';

const repository = new LmsQuizRepository();

export class LmsQuizService {
  async createQuiz(moduleId: string, title: string, description?: string, timeLimit?: number) {
    const module = await repository.findModuleById(moduleId);
    if (!module) throw new Error("Module not found.");

    return await repository.createQuiz({ moduleId, title, description, timeLimit});
  }

  async addQuizQuestion(quizId: string, question: string, type: string, correctAnswer: string, options?: string, points: number = 10) {
    const quiz = await repository.findQuizById(quizId);
    if (!quiz) throw new Error("Quiz not found.");

    return await repository.createQuizQuestion({
      quizId, question, type, correctAnswer, options, points});
  }

  async submitQuizAttempt(quizId: string, studentId: string, studentAnswers: Record<string, string>) {
    const quiz = await repository.findQuizWithQuestionsAndModule(quizId);
    if (!quiz) throw new Error("Quiz not found.");

    let totalScore = 0;
    let maxScore = 0;

    quiz.questions.forEach((q: any) => {
      maxScore += q.points;
      const studentAnswer = studentAnswers[q.id];
      if (studentAnswer && studentAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        totalScore += q.points;
      }
    });

    const finalPercentage = maxScore === 0 ? 0 : (totalScore / maxScore) * 100;

    const attempt = await repository.createQuizAttempt({
      quizId,
      studentId,
      answers: JSON.stringify(studentAnswers),
      score: finalPercentage,
      completedAt: new Date()
    });

    const currentTerm = await repository.findActiveTerm();
    if (currentTerm) {
      await repository.upsertTermGrade(studentId, quiz.module.subjectId, currentTerm.id, finalPercentage);
    }

    return { attempt, score: finalPercentage };
  }

  async getQuizzes(moduleId: string) {
    return await repository.findQuizzesByModuleId(moduleId);
  }
}
