'use server';

/**
 * Tahfeez (Quran memorisation) score server actions.
 * All database access is performed via Prisma — no Firebase stubs.
 */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Payload for a single Tahfeez score entry (mirrors Prisma TahfeezScore fields,
 * minus the auto-generated id, createdAt, and updatedAt).
 */
type TahfeezScoreInput = {
  studentId: string; // Prisma cuid of the student
  termId:    string; // Prisma cuid of the term
  session:   string; // e.g. "2024/2025"
  surah?:    string;
  juz?:      number;
  page?:     number;
  marks:     number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Revalidate all Tahfeez-related cache paths after a mutation. */
function revalidateTahfeez() {
  revalidatePath('/dashboard/tahfeez');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Batch-save an array of Tahfeez scores for the current school.
 * Uses upsert so re-submitting the same student/term entry updates the record.
 *
 * NOTE: There is no composite unique key on TahfeezScore in Prisma, so we
 * always create new rows here. If idempotency is needed in the future, add
 * @@unique([studentId, termId]) to the schema and switch to upsert.
 */
export async function saveTahfeezScores(scores: TahfeezScoreInput[]) {
  try {
    // Resolve the current school context so rows are always school-scoped
    const schoolId = await requireSchoolId();

    // Insert every score entry inside a transaction for atomicity
    await prisma.$transaction(
      scores.map((score) =>
        prisma.tahfeezScore.create({
          data: {
            schoolId,
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

    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error saving Tahfeez scores:', error);
    return { success: false, error: 'Failed to save Tahfeez scores' };
  }
}

/**
 * Update a single Tahfeez score row by its Prisma id.
 * Only the provided fields are changed; omitted fields remain unchanged.
 */
export async function updateTahfeezScore(
  scoreId: string,
  data: Partial<TahfeezScoreInput>
) {
  try {
    await prisma.tahfeezScore.update({
      where: { id: scoreId },
      data: {
        // Spread only the fields that were passed in so we do a partial update
        ...(data.studentId !== undefined && { studentId: data.studentId }),
        ...(data.termId    !== undefined && { termId:    data.termId }),
        ...(data.session   !== undefined && { session:   data.session }),
        ...(data.surah     !== undefined && { surah:     data.surah }),
        ...(data.juz       !== undefined && { juz:       data.juz }),
        ...(data.page      !== undefined && { page:      data.page }),
        ...(data.marks     !== undefined && { marks:     data.marks }),
      },
    });

    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error updating Tahfeez score:', error);
    return { success: false, error: 'Failed to update Tahfeez score' };
  }
}

/**
 * Delete a Tahfeez score row by its Prisma id.
 */
export async function deleteTahfeezScore(scoreId: string) {
  try {
    await prisma.tahfeezScore.delete({
      where: { id: scoreId },
    });

    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error deleting Tahfeez score:', error);
    return { success: false, error: 'Failed to delete Tahfeez score' };
  }
}
