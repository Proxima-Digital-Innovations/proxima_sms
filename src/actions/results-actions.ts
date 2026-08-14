'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- Grade Calculation ---

function calculateGradeSync(score: number): string {
  if (score >= 75) return 'A1';
  if (score >= 70) return 'B2';
  if (score >= 65) return 'B3';
  if (score >= 60) return 'C4';
  if (score >= 55) return 'C5';
  if (score >= 50) return 'C6';
  if (score >= 45) return 'D7';
  if (score >= 40) return 'E8';
  return 'F9';
}

function getGradeRemark(grade: string): string {
  const remarks: Record<string, string> = {
    A1: 'Excellent', B2: 'Very Good', B3: 'Good',
    C4: 'Credit', C5: 'Credit', C6: 'Credit',
    D7: 'Pass', E8: 'Pass', F9: 'Fail',
  };
  return remarks[grade] || 'N/A';
}

export async function calculateGrade(score: number): Promise<string> {
  return calculateGradeSync(score);
}

// --- Score Entry (Legacy CA1/CA2/Exam) ---

export async function saveScores(scores: Array<{
  studentId: string;
  subjectId: string;
  termId: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
}>) {
  try {
    for (const entry of scores) {
      const total = (entry.ca1 || 0) + (entry.ca2 || 0) + (entry.exam || 0);
      const grade = calculateGradeSync(total);
      const remarks = getGradeRemark(grade);

      await prisma.termGrade.upsert({
        where: {
          studentId_subjectId_termId: {
            studentId: entry.studentId,
            subjectId: entry.subjectId,
            termId: entry.termId,
          },
        },
        update: {
          ca1: entry.ca1 ?? null,
          ca2: entry.ca2 ?? null,
          exam: entry.exam ?? null,
          total,
          grade,
          remarks,
        },
        create: {
          studentId: entry.studentId,
          subjectId: entry.subjectId,
          termId: entry.termId,
          ca1: entry.ca1 ?? null,
          ca2: entry.ca2 ?? null,
          exam: entry.exam ?? null,
          total,
          grade,
          remarks,
        },
      });
    }
    revalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Fetch Scores ---

export async function getScoresByClassSubjectAndTerm(
  classId: string, subjectId: string, termName: string, sessionName: string
) {
  try {
    const term = await prisma.term.findFirst({
      where: {
        name: termName,
        session: { name: sessionName },
      },
    });

    if (!term) {
      return { success: false, error: 'Term not found' };
    }

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }],
    });

    const scores = await prisma.termGrade.findMany({
      where: {
        subjectId,
        termId: term.id,
        studentId: { in: students.map(s => s.id) },
      },
    });

    return { success: true, scores, termId: term.id, students };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Class Positions ---

export async function calculateClassPositions(classId: string, termId: string) {
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true },
    });

    const studentIds = students.map(s => s.id);

    // For each student, compute their overall average across all subjects
    const studentAverages: Array<{ studentId: string; average: number }> = [];

    for (const sid of studentIds) {
      const grades = await prisma.termGrade.findMany({
        where: { studentId: sid, termId },
      });
      if (grades.length === 0) continue;
      const avg = grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length;
      studentAverages.push({ studentId: sid, average: avg });
    }

    // Sort by average descending
    studentAverages.sort((a, b) => b.average - a.average);

    // Assign ranks and update
    for (let i = 0; i < studentAverages.length; i++) {
      const rank = i + 1;
      const sa = studentAverages[i];
      // Update all TermGrade records for this student/term with rank info
      await prisma.termGrade.updateMany({
        where: { studentId: sa.studentId, termId },
        data: {
          classRank: rank,
          classSize: studentAverages.length,
          overallAverage: Math.round(sa.average * 100) / 100,
        },
      });
    }

    return { success: true, rankings: studentAverages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Generate Term Results (The Big One) ---

export async function generateTermResults(classId: string, termId: string) {
  try {
    // 1. Get all students in this class
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
    });

    // 2. Get all subjects for this class
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });
    const subjectIds: string[] = classData?.subjectIds 
      ? JSON.parse(classData.subjectIds) 
      : [];

    if (subjectIds.length === 0) {
      return { success: false, error: 'No subjects configured for this class.' };
    }

    // 3. Get assignment categories and their weights
    const categories = await prisma.assignmentCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // 4. For each student × subject, compute weighted totals from GradebookScore
    let processedCount = 0;

    for (const student of students) {
      for (const subjectId of subjectIds) {
        // Get all gradebook assignments for this class/subject/term
        const assignments = await prisma.gradebookAssignment.findMany({
          where: { classId, subjectId, termId },
          include: {
            category: true,
            scores: {
              where: { studentId: student.id },
            },
          },
        });

        if (assignments.length === 0) continue;

        // Group assignments by category and compute weighted average
        const categoryScores: Record<string, { earned: number; possible: number; weight: number }> = {};
        
        for (const cat of categories) {
          categoryScores[cat.id] = { earned: 0, possible: 0, weight: cat.weight };
        }

        for (const assignment of assignments) {
          const catId = assignment.categoryId;
          if (!categoryScores[catId]) continue;

          const studentScore = assignment.scores[0];
          if (studentScore && !studentScore.isExempt && !studentScore.isExcused) {
            categoryScores[catId].earned += studentScore.score ?? 0;
            categoryScores[catId].possible += assignment.maxScore;
          } else if (!studentScore || studentScore.isMissing) {
            categoryScores[catId].possible += assignment.maxScore;
          }
        }

        // Compute weighted total (out of 100)
        let weightedTotal = 0;
        for (const cat of Object.values(categoryScores)) {
          if (cat.possible > 0) {
            const categoryPercentage = (cat.earned / cat.possible) * 100;
            weightedTotal += categoryPercentage * cat.weight;
          }
        }

        const total = Math.round(weightedTotal * 100) / 100;
        const grade = calculateGradeSync(total);
        const remarks = getGradeRemark(grade);

        // Map to legacy ca1/ca2/exam fields for backward compatibility
        const caCategory = categories.find(c => c.name.toLowerCase().includes('ca test'));
        const assignmentCategory = categories.find(c => c.name.toLowerCase().includes('assignment'));
        const examCategory = categories.find(c => c.name.toLowerCase().includes('exam'));

        const ca1Score = caCategory && categoryScores[caCategory.id]
          ? (categoryScores[caCategory.id].possible > 0 
              ? (categoryScores[caCategory.id].earned / categoryScores[caCategory.id].possible) * caCategory.maxScore 
              : 0)
          : null;

        const ca2Score = assignmentCategory && categoryScores[assignmentCategory.id]
          ? (categoryScores[assignmentCategory.id].possible > 0 
              ? (categoryScores[assignmentCategory.id].earned / categoryScores[assignmentCategory.id].possible) * assignmentCategory.maxScore 
              : 0)
          : null;

        const examScore = examCategory && categoryScores[examCategory.id]
          ? (categoryScores[examCategory.id].possible > 0 
              ? (categoryScores[examCategory.id].earned / categoryScores[examCategory.id].possible) * examCategory.maxScore 
              : 0)
          : null;

        await prisma.termGrade.upsert({
          where: {
            studentId_subjectId_termId: {
              studentId: student.id,
              subjectId,
              termId,
            },
          },
          update: {
            ca1: ca1Score ? Math.round(ca1Score * 10) / 10 : null,
            ca2: ca2Score ? Math.round(ca2Score * 10) / 10 : null,
            exam: examScore ? Math.round(examScore * 10) / 10 : null,
            total,
            grade,
            remarks,
          },
          create: {
            studentId: student.id,
            subjectId,
            termId,
            ca1: ca1Score ? Math.round(ca1Score * 10) / 10 : null,
            ca2: ca2Score ? Math.round(ca2Score * 10) / 10 : null,
            exam: examScore ? Math.round(examScore * 10) / 10 : null,
            total,
            grade,
            remarks,
          },
        });

        processedCount++;
      }
    }

    // 5. Calculate class positions
    await calculateClassPositions(classId, termId);

    // 6. Mark all as published
    await prisma.termGrade.updateMany({
      where: { termId, studentId: { in: students.map(s => s.id) } },
      data: { isPublished: true },
    });

    revalidatePath('/dashboard/results');
    return {
      success: true,
      message: `Processed ${processedCount} subject grades for ${students.length} students.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Report Card ---

export async function getStudentReportCard(studentId: string, termId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) return { success: false, error: 'Student not found' };

    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { session: true },
    });

    const grades = await prisma.termGrade.findMany({
      where: { studentId, termId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    // Behavioural assessment (legacy)
    const behaviouralAssessment = await prisma.behaviouralAssessment.findUnique({
      where: { studentId_termId: { studentId, termId } },
    });

    // New trait-based scores
    const behaviouralScores = await prisma.behaviouralScore.findMany({
      where: { studentId, termId },
      include: { trait: true },
      orderBy: { trait: { sortOrder: 'asc' } },
    });

    // Tahfeez
    const tahfeezScores = await prisma.tahfeezScore.findMany({
      where: { studentId, termId },
    });

    // Compute summary
    const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const overallAverage = grades.length > 0 ? totalScore / grades.length : 0;
    const classRank = grades[0]?.classRank ?? null;
    const classSize = grades[0]?.classSize ?? null;

    return {
      success: true,
      data: {
        student,
        term,
        grades,
        behaviouralAssessment,
        behaviouralScores,
        tahfeezScores,
        summary: {
          totalSubjects: grades.length,
          totalScore: Math.round(totalScore * 100) / 100,
          overallAverage: Math.round(overallAverage * 100) / 100,
          overallGrade: calculateGradeSync(overallAverage),
          classRank,
          classSize,
        },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Broadsheet (Class-wide view) ---

export async function getBroadsheetData(classId: string, termName: string, sessionName: string) {
  try {
    const term = await prisma.term.findFirst({
      where: { name: termName, session: { name: sessionName } },
    });
    if (!term) return { success: false, error: 'Term not found' };

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      orderBy: [{ lastName: 'asc' }],
    });

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    const subjectIds: string[] = classData?.subjectIds ? JSON.parse(classData.subjectIds) : [];

    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      orderBy: { name: 'asc' },
    });

    const allGrades = await prisma.termGrade.findMany({
      where: {
        termId: term.id,
        studentId: { in: students.map(s => s.id) },
        subjectId: { in: subjectIds },
      },
    });

    // Build broadsheet grid
    const broadsheet = students.map(student => {
      const studentGrades = allGrades.filter(g => g.studentId === student.id);
      const subjectScores = subjects.map(subject => {
        const grade = studentGrades.find(g => g.subjectId === subject.id);
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          ca1: grade?.ca1 ?? null,
          ca2: grade?.ca2 ?? null,
          exam: grade?.exam ?? null,
          total: grade?.total ?? null,
          grade: grade?.grade ?? null,
        };
      });

      const totalScore = subjectScores.reduce((s, sc) => s + (sc.total || 0), 0);
      const avg = subjectScores.filter(s => s.total !== null).length > 0
        ? totalScore / subjectScores.filter(s => s.total !== null).length
        : 0;

      return {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName },
        subjects: subjectScores,
        totalScore: Math.round(totalScore * 100) / 100,
        average: Math.round(avg * 100) / 100,
        rank: studentGrades[0]?.classRank ?? null,
      };
    });

    // Sort by rank
    broadsheet.sort((a, b) => (a.rank || 999) - (b.rank || 999));

    return { success: true, broadsheet, subjects, term, class: classData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Legacy compatibility wrappers ---

export async function getClassResults(classId: string, termName: string, sessionName: string) {
  return getBroadsheetData(classId, termName, sessionName);
}

export async function generateResultCard(studentId: string, termName: string, sessionName: string) {
  try {
    const term = await prisma.term.findFirst({
      where: { name: termName, session: { name: sessionName } },
    });
    if (!term) return { success: false, error: 'Term not found' };
    return getStudentReportCard(studentId, term.id);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reviewScore(termGradeId: string, status: string) {
  // No-op for now — approval workflow is handled via gradebook publishing
  return { success: true };
}

export async function approveAllPendingScores(classId: string, subjectId: string, termId: string) {
  try {
    await prisma.termGrade.updateMany({
      where: { termId, subjectId, studentId: { in: (await prisma.student.findMany({ where: { classId }, select: { id: true } })).map(s => s.id) } },
      data: { isPublished: true },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMidtermResultsForPrint(
  studentId: string | null, classId: string | null, termName: string, sessionName: string
) {
  try {
    const term = await prisma.term.findFirst({
      where: { name: termName, session: { name: sessionName } },
    });
    if (!term) return { success: false, error: 'Term not found' };

    const studentFilter = studentId
      ? { id: studentId }
      : classId
        ? { classId }
        : {};

    const students = await prisma.student.findMany({
      where: { ...studentFilter, status: 'Active' },
      include: { class: true },
    });

    const data = await Promise.all(students.map(async (student) => {
      const midterms = await prisma.midtermResult.findMany({
        where: { studentId: student.id, termId: term.id },
        include: { subject: true },
      });
      return { student, results: midterms };
    }));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTahfeezResultsForPrint(classId: string, termName: string, sessionName: string) {
  try {
    const term = await prisma.term.findFirst({
      where: { name: termName, session: { name: sessionName } },
    });
    if (!term) return { success: false, error: 'Term not found' };

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      orderBy: [{ lastName: 'asc' }],
    });

    const scores = await prisma.tahfeezScore.findMany({
      where: {
        termId: term.id,
        studentId: { in: students.map(s => s.id) },
      },
    });

    return { success: true, students, scores };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getExamResultsForPrint(
  studentId: string | null, classId: string | null, termName: string, sessionName: string
) {
  try {
    const term = await prisma.term.findFirst({
      where: { name: termName, session: { name: sessionName } },
    });
    if (!term) return { success: false, error: 'Term not found' };

    const filter = studentId ? { id: studentId } : classId ? { classId } : {};
    const students = await prisma.student.findMany({
      where: { ...filter, status: 'Active' },
      include: { class: true },
    });

    const allData = await Promise.all(
      students.map(async (student) => {
        const reportCard = await getStudentReportCard(student.id, term.id);
        return {
          student,
          results: reportCard.success && reportCard.data ? reportCard.data.grades : [],
          behavioralAssessment: reportCard.success && reportCard.data ? reportCard.data.behaviouralAssessment : null,
          feeInfo: null,
        };
      })
    );

    return { success: true, data: allData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getReportCard(reportId: string) {
  // Legacy — redirect to new system
  return { success: false, error: 'Use getStudentReportCard instead' };
}