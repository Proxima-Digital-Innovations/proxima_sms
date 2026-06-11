'use server';

/**
 * Result generation server action.
 * Replaces the old Firestore/dbService ReportCard approach with Prisma TermGrade.
 *
 * There is NO ReportCard model in Prisma; results are stored as TermGrade rows
 * (one per student-subject-term combination) and the aggregated view is returned
 * from this function so the caller can render/display it without an extra DB read.
 */

import { prisma } from '@/lib/prisma';
import { requireSchoolId } from '@/lib/server-context';

// ─── Local Types ──────────────────────────────────────────────────────────────

/** One grading-scale band (configured per-school in the DB or hardcoded here). */
type GradeBand = {
  grade:    string;
  minScore: number;
  maxScore: number;
};

/** Aggregated per-subject result for one student. */
type SubjectResult = {
  name:       string;
  ca1:        number;
  exam:       number;
  total:      number;
  grade:      string;
};

/** A fully computed report card for a single student (returned to the caller). */
type StudentReport = {
  studentId:    string;
  studentName:  string;
  class:        string;
  term:         string;
  session:      string;
  subjects:     SubjectResult[];
  totalMarks:   number;
  average:      number;
  overallGrade: string;
  classRank:    number;
};

// ─── Hardcoded grading scale (override later via a DB setting if needed) ──────

/**
 * Default grading scale. Replace with a DB lookup if schools need custom bands.
 * Scores are out of 100 (ca1 [40] + exam [60]).
 */
const DEFAULT_GRADING_SCALE: GradeBand[] = [
  { grade: 'A', minScore: 75, maxScore: 100 },
  { grade: 'B', minScore: 65, maxScore: 74  },
  { grade: 'C', minScore: 55, maxScore: 64  },
  { grade: 'D', minScore: 45, maxScore: 54  },
  { grade: 'E', minScore: 40, maxScore: 44  },
  { grade: 'F', minScore: 0,  maxScore: 39  },
];

/** Map a numeric score to a grade letter using the grading scale. */
function getGrade(score: number, scale: GradeBand[] = DEFAULT_GRADING_SCALE): string {
  const band = scale.find((g) => score >= g.minScore && score <= g.maxScore);
  return band?.grade ?? 'N/A';
}

// ─── Action ───────────────────────────────────────────────────────────────────

/**
 * Generate (or re-generate) term results for every student in a class.
 *
 * For each student the function:
 *  1. Fetches existing TermGrade rows for the class/term.
 *  2. Validates that all subjects have at least a total score recorded.
 *  3. Computes the grade and upserts back into TermGrade.
 *  4. Ranks students by average score and returns the full report list.
 *
 * @param className  Display name of the class, e.g. "JSS 1A"
 * @param session    Academic session string, e.g. "2024/2025"
 * @param term       Term name string, e.g. "First Term"
 */
export async function generateResultsForClass(
  className: string,
  session: string,
  term: string
): Promise<
  | { error: string }
  | { success: true; generatedCount: number; class: string; reports: StudentReport[] }
> {
  try {
    // Resolve the tenant school id from the request headers
    const schoolId = await requireSchoolId();

    // --- 1. Fetch students enrolled in the given class ----------------------
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        class: { name: className },
        status: 'Active',
      },
      select: {
        id:        true,
        studentId: true, // display ID field
        firstName: true,
        lastName:  true,
      },
    });

    if (students.length === 0) {
      return { error: `No active students found in class "${className}".` };
    }

    // --- 2. Fetch subjects for this school ----------------------------------
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    });

    if (subjects.length === 0) {
      return {
        error: 'No subjects configured for this school. Please add subjects first.',
      };
    }

    // --- 3. Fetch the active term record by name ----------------------------
    const termRecord = await prisma.term.findFirst({
      where: { schoolId, name: term },
      select: { id: true },
    });

    if (!termRecord) {
      return { error: `Term "${term}" not found. Please create the term first.` };
    }

    // --- 4. Fetch existing TermGrade scores for these students ---------------
    const studentCuids = students.map((s) => s.id);
    const termGrades = await prisma.termGrade.findMany({
      where: {
        schoolId,
        studentId: { in: studentCuids },
        termId:    termRecord.id,
      },
      select: {
        id:        true,
        studentId: true,
        subjectId: true,
        ca1:       true,
        ca2:       true,
        exam:      true,
        total:     true,
      },
    });

    // Build a lookup map: "studentId::subjectId" → TermGrade row
    const gradeMap = new Map<string, typeof termGrades[number]>();
    termGrades.forEach((tg) => gradeMap.set(`${tg.studentId}::${tg.subjectId}`, tg));

    // --- 5. Validate that all students have scores for every subject ---------
    for (const student of students) {
      for (const subject of subjects) {
        const key = `${student.id}::${subject.id}`;
        if (!gradeMap.has(key)) {
          return {
            error: `Missing score for student "${student.firstName} ${student.lastName}" in subject "${subject.name}". Please enter all scores before generating results.`,
          };
        }
      }
    }

    // --- 6. Compute results and upsert back into TermGrade ------------------
    const studentAverages: { studentId: string; average: number }[] = [];
    const reportMap = new Map<string, Omit<StudentReport, 'classRank'>>();

    for (const student of students) {
      let totalMarks = 0;
      const subjectResults: SubjectResult[] = [];

      for (const subject of subjects) {
        const key = `${student.id}::${subject.id}`;
        const tg  = gradeMap.get(key)!;

        // Compute total if not already stored (ca1 + ca2 + exam)
        const ca1   = tg.ca1   ?? 0;
        const exam  = tg.exam  ?? 0;
        const total = tg.total ?? ca1 + (tg.ca2 ?? 0) + exam;
        const grade = getGrade(total);

        totalMarks += total;

        // Upsert the grade back so the DB reflects the computed grade/remarks
        await prisma.termGrade.update({
          where: { id: tg.id },
          data: { total, grade },
        });

        subjectResults.push({ name: subject.name, ca1, exam, total, grade });
      }

      const average = subjects.length > 0 ? totalMarks / subjects.length : 0;
      studentAverages.push({ studentId: student.id, average });

      reportMap.set(student.id, {
        studentId:   student.studentId, // display ID for the report
        studentName: `${student.firstName} ${student.lastName}`,
        class:       className,
        term,
        session,
        subjects:    subjectResults,
        totalMarks,
        average,
        overallGrade: getGrade(average),
      });
    }

    // --- 7. Rank students by average (descending) ----------------------------
    studentAverages.sort((a, b) => b.average - a.average);

    const reports: StudentReport[] = studentAverages.map((sa, index) => ({
      ...reportMap.get(sa.studentId)!,
      classRank: index + 1,
    }));

    return {
      success:        true,
      generatedCount: reports.length,
      class:          className,
      reports,
    };
  } catch (error: any) {
    console.error('Error generating results:', error);
    return {
      error: error.message || 'An unexpected error occurred during result generation.',
    };
  }
}
