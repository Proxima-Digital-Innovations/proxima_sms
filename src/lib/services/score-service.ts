import { ScoreRepository } from '../dal/score-repository';

type BulkScoreRow = { studentId: string; caScore: number | string; examScore: number | string; };
type BulkUpdatePayload = { scores: BulkScoreRow[]; class: string; subject: string; };

export class ScoreService {
  private repository = new ScoreRepository();
  async bulkUpdateScores(payload: BulkUpdatePayload) {
    const { scores, subject } = payload;
    if (!scores || scores.length === 0) return { error: 'No score data provided.' };
    const displayStudentIds = scores.map(s => s.studentId).filter(Boolean);
    if (displayStudentIds.length === 0) return { error: 'The uploaded file does not contain any valid student IDs.' };
    const students = await this.repository.getStudentsByDisplayIds(displayStudentIds);
    const studentCuidMap = new Map<string, string>(students.map(s => [s.studentId, s.id]));
    const subjectRecord = await this.repository.getSubjectByName(subject);
    if (!subjectRecord) return { error: `Subject "${subject}" not found. Please create the subject first.` };
    const activeTerm = await this.repository.getActiveTerm();
    if (!activeTerm) return { error: 'No active term found. Please activate a term before importing scores.' };
    let updatedCount = 0;
    for (const record of scores) {
      if (!record.studentId) continue;
      const caScore = Number(record.caScore);
      const examScore = Number(record.examScore);
      if (isNaN(caScore) || isNaN(examScore) || caScore < 0 || caScore > 40 || examScore < 0 || examScore > 60) continue;
      const totalScore = caScore + examScore;
      const studentCuid = studentCuidMap.get(record.studentId);
      if (!studentCuid) continue;
      await this.repository.upsertTermGrade({
        where: { studentId_subjectId_termId: { studentId: studentCuid, subjectId: subjectRecord.id, termId: activeTerm.id } },
        update: { ca1: caScore, exam: examScore, total: totalScore },
        create: { studentId: studentCuid, subjectId: subjectRecord.id, termId: activeTerm.id, ca1: caScore, exam: examScore, total: totalScore }
      });
      updatedCount++;
    }
    return { success: true, updatedCount };
  }
}