import { prisma } from '@/lib/prisma';

export class TahfeezRepository {
  async createScores(scores: any[], ) {
    return await prisma.$transaction(
      scores.map((score) =>
        prisma.tahfeezScore.create({
          data: {
            studentId: score.studentId,
            termId:    score.termId,
            session:   score.session,
            surah:     score.surah,
            juz:       score.juz,
            page:      score.page,
            marks:     score.marks,
          },
        })
      )
    );
  }

  async updateScore(scoreId: string, data: any) {
    return await prisma.tahfeezScore.update({
      where: { id: scoreId },
      data,
    });
  }

  async deleteScore(scoreId: string) {
    return await prisma.tahfeezScore.delete({
      where: { id: scoreId },
    });
  }
}
