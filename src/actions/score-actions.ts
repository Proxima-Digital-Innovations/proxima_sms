'use server';

/**
 * Score bulk-import server action.
 * Replaces the old dbService/Score approach with Prisma TermGrade.
 *
 * Prisma model used:  TermGrade
 *   Fields: id, schoolId, studentId (cuid), subjectId (cuid), termId (cuid),
 *           ca1, ca2, exam, total, grade, remarks
 *
 * Mapping from the old Score model:
 *   caScore   → ca1
 *   examScore → exam
 *   totalScore→ total
 *   (no `status` field exists on TermGrade)
 */

import { prisma } from '@/lib/prisma';
import { requireSchoolId } from '@/lib/server-context';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape of each row from the uploaded CSV / spreadsheet. */
type BulkScoreRow = {
  studentId: string; // display student ID (e.g. "STU-001"), NOT the Prisma cuid
  caScore:   number | string;
  examScore: number | string;
};

type BulkUpdatePayload = {
  scores:  BulkScoreRow[];
  class:   string; // class display name, used only for context/logging
  subject: string; // subject display name
};

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Bulk-upsert TermGrade rows from a spreadsheet import.
 *
 * For each row the function:
 *  1. Looks up the Student by their display `studentId` field.
 *  2. Finds the Subject by display name.
 *  3. Finds the currently active Term for the school.
 *  4. Upserts a TermGrade row using the unique key (studentId, subjectId, termId).
 */
export async function bulkUpdateScores(payload: BulkUpdatePayload) {
  const { scores, subject } = payload;

  if (!scores || scores.length === 0) {
    return { error: 'No score data provided.' };
  }

  try {
    // --- Resolve school context --------------------------------------------
    const schoolId = await requireSchoolId();

    // --- Validate and collect display student IDs --------------------------
    const displayStudentIds = scores.map((s) => s.studentId).filter(Boolean);
    if (displayStudentIds.length === 0) {
      return { error: 'The uploaded file does not contain any valid student IDs.' };
    }

    // --- Fetch students by their display `studentId` field -----------------
    // Student.studentId is the human-readable ID (e.g. "STU-001"), different
    // from the Prisma cuid stored in Student.id.
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        studentId: { in: displayStudentIds },
      },
      select: { id: true, studentId: true },
    });

    // Build a lookup from display ID → Prisma cuid
    const studentCuidMap = new Map<string, string>(
      students.map((s) => [s.studentId, s.id])
    );

    // --- Find the subject by display name ----------------------------------
    const subjectRecord = await prisma.subject.findFirst({
      where: { name: subject, schoolId },
      select: { id: true },
    });

    if (!subjectRecord) {
      return { error: `Subject "${subject}" not found. Please create the subject first.` };
    }

    // --- Find the currently active term for this school --------------------
    const activeTerm = await prisma.term.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });

    if (!activeTerm) {
      return { error: 'No active term found. Please activate a term before importing scores.' };
    }

    // --- Process each score row -------------------------------------------
    let updatedCount = 0;

    for (const record of scores) {
      if (!record.studentId) continue;

      // Parse scores to numbers; skip rows with invalid data
      const caScore   = Number(record.caScore);
      const examScore = Number(record.examScore);

      if (
        isNaN(caScore)   || isNaN(examScore)   ||
        caScore   < 0    || caScore   > 40      ||
        examScore < 0    || examScore > 60
      ) {
        // Invalid score values – skip silently (caller should pre-validate)
        continue;
      }

      const totalScore = caScore + examScore;

      // Resolve the Prisma student cuid from the display ID
      const studentCuid = studentCuidMap.get(record.studentId);
      if (!studentCuid) {
        // Student not found in this school – skip
        continue;
      }

      // Upsert TermGrade using the composite unique key defined in the schema:
      //   @@unique([studentId, subjectId, termId])
      await prisma.termGrade.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: studentCuid,
            subjectId: subjectRecord.id,
            termId:    activeTerm.id,
          },
        },
        update: {
          // Only update score fields; preserve any existing grade/remarks
          ca1:   caScore,
          exam:  examScore,
          total: totalScore,
        },
        create: {
          schoolId,
          studentId: studentCuid,
          subjectId: subjectRecord.id,
          termId:    activeTerm.id,
          ca1:       caScore,
          exam:      examScore,
          total:     totalScore,
        },
      });

      updatedCount++;
    }

    return { success: true, updatedCount };
  } catch (error: any) {
    console.error('Error in bulk score update:', error);
    return {
      error: error.message || 'An unexpected server error occurred during bulk import.',
    };
  }
}
