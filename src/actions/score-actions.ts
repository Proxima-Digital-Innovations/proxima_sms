
'use server';

import { dbService } from '@/lib/dbService';
import type { Score } from '@/lib/schema';

type BulkUpdatePayload = {
    scores: any[];
    class: string;
    subject: string;
};

export async function bulkUpdateScores(payload: BulkUpdatePayload) {
    const { scores, class: className, subject } = payload;

    if (!scores || scores.length === 0) {
        return { error: 'No score data provided.' };
    }

    try {
        const batch = dbService.createBatch();
        let updatedCount = 0;

        const studentIds = scores.map(s => s.studentId).filter(Boolean);
        if (studentIds.length === 0) {
            return { error: 'The uploaded file does not contain any valid student IDs.' };
        }

        const existingScores = await dbService.getDocs<Score>('scores', [
            { type: 'where', fieldPath: 'studentId', opStr: 'in', value: studentIds },
            { type: 'where', fieldPath: 'subject', opStr: '==', value: subject },
            { type: 'where', fieldPath: 'class', opStr: '==', value: className }
        ]);
        const existingScoresMap = new Map<string, Score>();
        existingScores.forEach(score => existingScoresMap.set(score.studentId, score));
        
        const teacherUsers = await dbService.getDocs<{id: string}>('users', [
             { type: 'where', fieldPath: 'role', opStr: '==', value: 'Teacher' },
             { type: 'limit', limitCount: 1 }
        ]);
        const teacherId = teacherUsers[0]?.id || 'placeholder-teacher-id';

        for (const record of scores) {
            if (!record.studentId) continue;
            
            const caScore = Number(record.caScore);
            const examScore = Number(record.examScore);

            if (isNaN(caScore) || isNaN(examScore) || caScore < 0 || caScore > 40 || examScore < 0 || examScore > 60) {
                continue;
            }

            const totalScore = caScore + examScore;
            const existing = existingScoresMap.get(record.studentId);

            const scoreData: Partial<Score> = {
                caScore,
                examScore,
                totalScore,
                status: 'Draft',
            };

            if (existing) {
                const updatePayload: Partial<Score> = {
                    caScore,
                    examScore,
                    totalScore,
                    status: existing.status === 'Approved' ? 'Approved' : 'Draft',
                };
                batch.update('scores', existing.id, updatePayload);
            } else {
                const newScoreData: Omit<Score, 'id'> = {
                    ...scoreData,
                    studentId: record.studentId,
                    subject,
                    class: className,
                    teacherId: teacherId,
                    term: 'First Term' // Placeholder
                } as Omit<Score, 'id'>;
                batch.set('scores', null, newScoreData);
            }
            updatedCount++;
        }

        if (updatedCount > 0) {
            await batch.commit();
        }

        return { success: true, updatedCount };

    } catch (error: any) {
        console.error('Error in bulk score update:', error);
        return { error: error.message || 'An unexpected server error occurred during bulk import.' };
    }
}
