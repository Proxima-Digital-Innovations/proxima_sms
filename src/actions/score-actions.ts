'use server';
import { requireSchoolId } from '@/lib/server-context';
import { ScoreService } from '@/lib/services/score-service';
type BulkScoreRow = { studentId: string; caScore: number | string; examScore: number | string; };
type BulkUpdatePayload = { scores: BulkScoreRow[]; class: string; subject: string; };
const scoreService = new ScoreService();
export async function bulkUpdateScores(payload: BulkUpdatePayload) {
  try {
    
    return await scoreService.bulkUpdateScores(payload);
  } catch (error: any) {
    console.error('Error in bulk score update:', error);
    return { error: error.message || 'An unexpected server error occurred during bulk import.' };
  }
}