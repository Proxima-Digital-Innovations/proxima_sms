'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

// --- Grade Calculation & International Scale Resolution ---

export interface GradingThreshold {
  grade: string;
  minScore: number;
  maxScore: number;
  remark?: string;
}

const DEFAULT_WAEC_SCALE: GradingThreshold[] = [
  { grade: 'A1', minScore: 75, maxScore: 100, remark: 'Excellent' },
  { grade: 'B2', minScore: 70, maxScore: 74, remark: 'Very Good' },
  { grade: 'B3', minScore: 65, maxScore: 69, remark: 'Good' },
  { grade: 'C4', minScore: 60, maxScore: 64, remark: 'Credit' },
  { grade: 'C5', minScore: 55, maxScore: 59, remark: 'Credit' },
  { grade: 'C6', minScore: 50, maxScore: 54, remark: 'Credit' },
  { grade: 'D7', minScore: 45, maxScore: 49, remark: 'Pass' },
  { grade: 'E8', minScore: 40, maxScore: 44, remark: 'Pass' },
  { grade: 'F9', minScore: 0, maxScore: 39, remark: 'Fail' },
];

export async function getActiveGradingScale(): Promise<GradingThreshold[]> {
  try {
    const profile = await prisma.systemProfile.findFirst({ select: { gradingScale: true } });
    if (profile?.gradingScale) {
      const parsed = JSON.parse(profile.gradingScale);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_WAEC_SCALE;
}

function calculateGradeFromScale(score: number, scale: GradingThreshold[] = DEFAULT_WAEC_SCALE): { grade: string; remark: string } {
  const rounded = Math.round(score);
  for (const tier of scale) {
    if (rounded >= tier.minScore && rounded <= tier.maxScore) {
      return { grade: tier.grade, remark: tier.remark || getGradeRemark(tier.grade) };
    }
  }
  const lastTier = scale[scale.length - 1];
  return { grade: lastTier?.grade || 'F9', remark: lastTier?.remark || 'Fail' };
}

function calculateGradeSync(score: number, scale?: GradingThreshold[]): string {
  return calculateGradeFromScale(score, scale || DEFAULT_WAEC_SCALE).grade;
}

function getGradeRemark(grade: string, scale?: GradingThreshold[]): string {
  if (scale) {
    const match = scale.find(s => s.grade === grade);
    if (match?.remark) return match.remark;
  }
  const remarks: Record<string, string> = {
    A1: 'Excellent', B2: 'Very Good', B3: 'Good',
    C4: 'Credit', C5: 'Credit', C6: 'Credit',
    D7: 'Pass', E8: 'Pass', F9: 'Fail',
    A: 'Excellent', B: 'Very Good', C: 'Credit', D: 'Pass', E: 'Pass', F: 'Fail',
    'A*': 'Distinction',
    '7': 'Excellent', '6': 'Very Good', '5': 'Good', '4': 'Satisfactory', '3': 'Mediocre', '2': 'Poor', '1': 'Very Poor',
  };
  return remarks[grade] || 'Satisfactory';
}

export async function calculateGrade(score: number): Promise<string> {
  const scale = await getActiveGradingScale();
  return calculateGradeSync(score, scale);
}

// --- Score Entry (Legacy CA1/CA2/Exam) ---

export async function saveScores(scores: Array<{
  studentId: string;
  subjectId: string;
  termId: string;
  ca1?: number;
  ca2?: number;
  exam?: number;
  status?: string;
}>) {
  try {
    const scale = await getActiveGradingScale();
    for (const entry of scores) {
      const total = (entry.ca1 || 0) + (entry.ca2 || 0) + (entry.exam || 0);
      const gradeResult = calculateGradeFromScale(total, scale);
      const grade = gradeResult.grade;
      const remarks = gradeResult.remark;

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
          status: entry.status || 'Draft'
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
          status: entry.status || 'Draft'
        },
      });
    }
    safeRevalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Fetch Scores ---

export async function getScoresByClassSubjectAndTerm(
  classId: string,
  subjectId: string,
  termNameOrId: string,
  sessionNameOrId?: string
) {
  try {
    let term: any = null;

    if (termNameOrId) {
      term = await prisma.term.findUnique({
        where: { id: termNameOrId },
        include: { session: true },
      });
    }

    if (!term) {
      const termWhere: any = { name: termNameOrId };
      if (sessionNameOrId) {
        termWhere.OR = [
          { sessionId: sessionNameOrId },
          { session: { name: sessionNameOrId } },
        ];
      }
      term = await prisma.term.findFirst({
        where: termWhere,
        include: { session: true },
      });
    }

    if (!term) {
      return { success: false, error: 'Term not found' };
    }

    // If session was specified, ensure term matches requested session
    if (sessionNameOrId && term.sessionId !== sessionNameOrId && term.session?.name !== sessionNameOrId) {
      // Look for matching term in that session
      const matchedTerm = await prisma.term.findFirst({
        where: {
          name: term.name,
          OR: [
            { sessionId: sessionNameOrId },
            { session: { name: sessionNameOrId } },
          ],
        },
        include: { session: true },
      });
      if (matchedTerm) term = matchedTerm;
    }

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ lastName: 'asc' }],
    });

    const studentIds = students.map((s) => s.id);

    const [scores, auditLogs, subject, classData] = await Promise.all([
      prisma.termGrade.findMany({
        where: {
          subjectId,
          termId: term.id,
          studentId: { in: studentIds },
        },
        include: {
          scoreAuditLogs: {
            include: {
              modifier: { select: { firstName: true, lastName: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.scoreAuditLog.findMany({
        where: {
          subjectId,
          termId: term.id,
          studentId: { in: studentIds },
        },
        include: {
          modifier: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true },
      }),
      prisma.class.findUnique({
        where: { id: classId },
        select: {
          id: true,
          name: true,
          teacherId: true,
          subjectTeachers: true,
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    // Resolve assigned teacher
    let assignedTeacher = 'Unassigned';
    if (classData?.subjectTeachers) {
      try {
        const mapping = JSON.parse(classData.subjectTeachers);
        const teacherId = mapping[subjectId];
        if (teacherId) {
          const tUser = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { firstName: true, lastName: true },
          });
          if (tUser) assignedTeacher = `${tUser.firstName} ${tUser.lastName}`;
        }
      } catch {}
    }
    if (assignedTeacher === 'Unassigned' && classData?.teacher) {
      assignedTeacher = `${classData.teacher.firstName} ${classData.teacher.lastName}`;
    }

    return {
      success: true,
      scores,
      termId: term.id,
      term,
      students,
      subject,
      class: classData,
      assignedTeacher,
      auditLogs,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Class Positions ---

export async function calculateClassPositions(
  classId: string,
  termId: string,
  options?: {
    rankingMethod?: 'standard' | 'dense';
    sessionId?: string;
  }
) {
  try {
    let resolvedTermId = termId;
    if (options?.sessionId) {
      const term = await prisma.term.findFirst({
        where: {
          OR: [
            { id: termId, sessionId: options.sessionId },
            { name: termId, sessionId: options.sessionId },
          ],
        },
      });
      if (term) resolvedTermId = term.id;
    }

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true },
    });

    const studentIds = students.map(s => s.id);

    // For each student, compute their overall average across all subjects
    const studentAverages: Array<{ studentId: string; average: number }> = [];

    for (const sid of studentIds) {
      const grades = await prisma.termGrade.findMany({
        where: { studentId: sid, termId: resolvedTermId },
      });
      if (grades.length === 0) continue;
      const avg = grades.reduce((sum, g) => sum + (g.total || 0), 0) / grades.length;
      studentAverages.push({ studentId: sid, average: avg });
    }

    // Sort by average descending
    studentAverages.sort((a, b) => b.average - a.average);

    const rankingMethod = options?.rankingMethod || 'standard';
    let currentRank = 1;
    let denseRank = 1;

    // Assign ranks and update with tie handling
    for (let i = 0; i < studentAverages.length; i++) {
      const sa = studentAverages[i];
      if (i > 0) {
        const prev = studentAverages[i - 1];
        const isTie = Math.abs(sa.average - prev.average) < 0.001;
        if (!isTie) {
          currentRank = i + 1;
          denseRank += 1;
        }
      }
      const assignedRank = rankingMethod === 'dense' ? denseRank : currentRank;

      // Update all TermGrade records for this student/term with rank info
      await prisma.termGrade.updateMany({
        where: { studentId: sa.studentId, termId: resolvedTermId },
        data: {
          classRank: assignedRank,
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

export interface GenerateResultsOptions {
  sessionId?: string;
  notifyParents?: boolean;
  passMark?: number;
  publishMode?: 'publish' | 'draft';
  rankingMethod?: 'standard' | 'dense';
  regenerateRankingOnly?: boolean;
}

export async function generateTermResults(
  classId: string,
  termId: string,
  options?: GenerateResultsOptions | boolean
) {
  try {
    const optionsObj: GenerateResultsOptions =
      typeof options === 'boolean'
        ? { notifyParents: options }
        : options || {};

    const passMark = optionsObj.passMark ?? 50;
    const publishMode = optionsObj.publishMode ?? 'publish';
    const isPublished = publishMode === 'publish';
    const rankingMethod = optionsObj.rankingMethod ?? 'standard';
    const regenerateRankingOnly = Boolean(optionsObj.regenerateRankingOnly);

    let resolvedTermId = termId;
    if (optionsObj.sessionId) {
      const matchedTerm = await prisma.term.findFirst({
        where: {
          OR: [
            { id: termId, sessionId: optionsObj.sessionId },
            { name: termId, sessionId: optionsObj.sessionId },
          ],
        },
      });
      if (matchedTerm) resolvedTermId = matchedTerm.id;
    }

    // 1. Get all students in this class
    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
    });

    if (students.length === 0) {
      return { success: false, error: 'No active students found in this class.' };
    }

    const studentIds = students.map(s => s.id);

    // 2. Resolve subjects for this class (via class.subjectIds or dynamically from TermGrade/Curriculum)
    const classData = await prisma.class.findUnique({
      where: { id: classId },
    });

    let subjectIds: string[] = [];
    if (classData?.subjectIds) {
      try {
        subjectIds = JSON.parse(classData.subjectIds);
      } catch (e) {
        subjectIds = [];
      }
    }

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      // Discover subjects from existing TermGrades for students in this class and term
      const distinctGrades = await prisma.termGrade.findMany({
        where: {
          termId: resolvedTermId,
          studentId: { in: studentIds },
        },
        select: { subjectId: true },
        distinct: ['subjectId'],
      });
      subjectIds = distinctGrades.map(g => g.subjectId);

      // If still empty, discover all subjects in the school
      if (subjectIds.length === 0) {
        const allSubjects = await prisma.subject.findMany({ select: { id: true } });
        subjectIds = allSubjects.map(s => s.id);
      }
    }

    if (subjectIds.length === 0) {
      return { success: false, error: 'No subjects configured or graded for this class.' };
    }

    let processedCount = 0;

    if (!regenerateRankingOnly) {
      // 3. Check for dynamic Gradebook assignments
      const gradebookCount = await prisma.gradebookAssignment.count({
        where: { classId, termId: resolvedTermId, subjectId: { in: subjectIds } },
      });

      if (gradebookCount > 0) {
        // 3A. Compute weighted totals from GradebookAssignment
        const categories = await prisma.assignmentCategory.findMany({
          orderBy: { sortOrder: 'asc' },
        });

        for (const student of students) {
          for (const subjectId of subjectIds) {
            const assignments = await prisma.gradebookAssignment.findMany({
              where: { classId, subjectId, termId: resolvedTermId },
              include: {
                category: true,
                scores: { where: { studentId: student.id } },
              },
            });

            if (assignments.length === 0) continue;

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

            let weightedTotal = 0;
            for (const cat of Object.values(categoryScores)) {
              if (cat.possible > 0) {
                weightedTotal += (cat.earned / cat.possible) * 100 * cat.weight;
              }
            }

            const total = Math.round(weightedTotal * 10) / 10;
            const grade = calculateGradeSync(total);
            const remarks = getGradeRemark(grade);

            const caCategory = categories.find(c => c.name.toLowerCase().includes('ca test'));
            const assignmentCategory = categories.find(c => c.name.toLowerCase().includes('assignment'));
            const examCategory = categories.find(c => c.name.toLowerCase().includes('exam'));

            const ca1Score = caCategory && categoryScores[caCategory.id]?.possible > 0
              ? (categoryScores[caCategory.id].earned / categoryScores[caCategory.id].possible) * caCategory.maxScore
              : null;

            const ca2Score = assignmentCategory && categoryScores[assignmentCategory.id]?.possible > 0
              ? (categoryScores[assignmentCategory.id].earned / categoryScores[assignmentCategory.id].possible) * assignmentCategory.maxScore
              : null;

            const examScore = examCategory && categoryScores[examCategory.id]?.possible > 0
              ? (categoryScores[examCategory.id].earned / categoryScores[examCategory.id].possible) * examCategory.maxScore
              : null;

            await prisma.termGrade.upsert({
              where: {
                studentId_subjectId_termId: {
                  studentId: student.id,
                  subjectId,
                  termId: resolvedTermId,
                },
              },
              update: {
                ca1: ca1Score != null ? Math.round(ca1Score * 10) / 10 : undefined,
                ca2: ca2Score != null ? Math.round(ca2Score * 10) / 10 : undefined,
                exam: examScore != null ? Math.round(examScore * 10) / 10 : undefined,
                total,
                grade,
                remarks,
                status: 'Approved',
                isPublished,
              },
              create: {
                studentId: student.id,
                subjectId,
                termId: resolvedTermId,
                ca1: ca1Score != null ? Math.round(ca1Score * 10) / 10 : null,
                ca2: ca2Score != null ? Math.round(ca2Score * 10) / 10 : null,
                exam: examScore != null ? Math.round(examScore * 10) / 10 : null,
                total,
                grade,
                remarks,
                status: 'Approved',
                isPublished,
              },
            });
            processedCount++;
          }
        }
      } else {
        // 3B. Traditional TermGrade calculation (re-compute total, grade, remark from ca1, ca2, exam)
        const existingGrades = await prisma.termGrade.findMany({
          where: {
            termId: resolvedTermId,
            studentId: { in: studentIds },
            subjectId: { in: subjectIds },
          },
        });

        for (const g of existingGrades) {
          const total = (g.ca1 || 0) + (g.ca2 || 0) + (g.exam || 0);
          const grade = calculateGradeSync(total);
          const remarks = getGradeRemark(grade);

          await prisma.termGrade.update({
            where: { id: g.id },
            data: {
              total,
              grade,
              remarks,
              status: 'Approved',
              isPublished,
            },
          });
          processedCount++;
        }
      }
    } else {
      // Regenerating ranking only - optionally update publish status
      if (optionsObj.publishMode) {
        await prisma.termGrade.updateMany({
          where: { termId: resolvedTermId, studentId: { in: studentIds } },
          data: { isPublished },
        });
      }
    }

    // 4. Calculate class rankings and overall averages with configurable ranking method
    await calculateClassPositions(classId, resolvedTermId, {
      rankingMethod,
      sessionId: optionsObj.sessionId,
    });

    // 5. Compute summary statistics for immediate UI display
    const studentGrades = await prisma.termGrade.findMany({
      where: { termId: resolvedTermId, studentId: { in: studentIds } },
      include: { student: true },
    });

    const studentAvgMap: Record<string, { student: any; avg: number; rank: number }> = {};
    for (const g of studentGrades) {
      if (!studentAvgMap[g.studentId]) {
        studentAvgMap[g.studentId] = {
          student: g.student,
          avg: g.overallAverage || 0,
          rank: g.classRank || 999,
        };
      }
    }

    const studentList = Object.values(studentAvgMap).sort((a, b) => a.rank - b.rank);
    const classAverage = studentList.length > 0
      ? Math.round((studentList.reduce((acc, s) => acc + s.avg, 0) / studentList.length) * 10) / 10
      : 0;
    const passCount = studentList.filter(s => s.avg >= passMark).length;
    const passRate = studentList.length > 0
      ? Math.round((passCount / studentList.length) * 100)
      : 0;
    const topStudents = studentList.slice(0, 3).map(s => ({
      name: `${s.student.lastName}, ${s.student.firstName}`,
      studentId: s.student.studentId,
      average: s.avg,
      rank: s.rank,
    }));

    // 6. Notify parents if requested and published
    if (optionsObj.notifyParents && isPublished) {
      try {
        const termData = await prisma.term.findUnique({ where: { id: resolvedTermId } });
        const termName = termData?.name || 'Term';
        const { sendEmailToGuardians } = await import('@/lib/services/email-service');
        await sendEmailToGuardians({
          classId,
          subject: `${classData?.name} Results Processed for ${termName}`,
          body: `The end-of-term academic results for ${classData?.name} have been processed and published. Please log in to the Parent Portal to view your child's digital report card and performance summary.`
        });
      } catch (emailErr) {
        console.warn('Email notification warning:', emailErr);
      }
    }

    safeRevalidatePath('/dashboard/results');
    safeRevalidatePath('/dashboard/results/view');
    safeRevalidatePath('/dashboard/results/generate');
    safeRevalidatePath('/dashboard/results/broadsheet');

    return {
      success: true,
      message: regenerateRankingOnly
        ? `Recalculated academic positions for ${students.length} students.`
        : `Successfully processed ${isPublished ? 'and published' : 'in draft mode'} results for ${students.length} students across ${subjectIds.length} subjects.`,
      summary: {
        studentsCount: students.length,
        processedGrades: processedCount,
        classAverage,
        passRate,
        passMark,
        isPublished,
        topStudents,
      },
    };
  } catch (error: any) {
    console.error('Error generating term results:', error);
    return { success: false, error: error.message };
  }
}

// --- Pre-Flight Submission Check ---

export async function getResultPreflightCheck(classId: string, termId: string, sessionId?: string) {
  try {
    let resolvedTermId = termId;
    if (sessionId) {
      const term = await prisma.term.findFirst({
        where: {
          OR: [
            { id: termId, sessionId },
            { name: termId, sessionId },
          ],
        },
      });
      if (term) resolvedTermId = term.id;
    }

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      select: { id: true, firstName: true, lastName: true },
    });

    const studentIds = students.map(s => s.id);
    const totalStudents = students.length;

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: { teacher: { select: { firstName: true, lastName: true } } },
    });

    let subjectIds: string[] = [];
    if (classData?.subjectIds) {
      try {
        subjectIds = JSON.parse(classData.subjectIds);
      } catch (e) {
        subjectIds = [];
      }
    }

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      const distinctGrades = await prisma.termGrade.findMany({
        where: { termId: resolvedTermId, studentId: { in: studentIds } },
        select: { subjectId: true },
        distinct: ['subjectId'],
      });
      subjectIds = distinctGrades.map(g => g.subjectId);
    }

    if (subjectIds.length === 0) {
      const allSubjects = await prisma.subject.findMany({ select: { id: true } });
      subjectIds = allSubjects.map(s => s.id);
    }

    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, name: true },
    });

    let teacherMap: Record<string, string> = {};
    if (classData?.subjectTeachers) {
      try {
        const mapping = JSON.parse(classData.subjectTeachers);
        const userIds = Object.values(mapping).filter(Boolean) as string[];
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        });
        const uMap = new Map<string, string>(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));
        for (const [subId, tId] of Object.entries(mapping)) {
          if (tId && uMap.has(tId as string)) {
            teacherMap[subId] = uMap.get(tId as string)!;
          }
        }
      } catch (e) {}
    }

    const defaultTeacher = classData?.teacher
      ? `${classData.teacher.firstName} ${classData.teacher.lastName}`
      : 'Unassigned';

    const allGrades = await prisma.termGrade.findMany({
      where: {
        termId: resolvedTermId,
        studentId: { in: studentIds },
        subjectId: { in: subjectIds },
      },
      select: {
        id: true,
        subjectId: true,
        studentId: true,
        ca1: true,
        ca2: true,
        exam: true,
        total: true,
        status: true,
        isPublished: true,
        isLocked: true,
        overallAverage: true,
        classRank: true,
        updatedAt: true,
      },
    });

    const rankedGrades = allGrades.filter(g => g.classRank !== null);
    const hasExistingResults = rankedGrades.length > 0;
    const isCurrentlyPublished = allGrades.some(g => g.isPublished);

    let existingResultsSummary: any = null;
    if (hasExistingResults) {
      const latestUpdate = allGrades.reduce(
        (latest, g) => (!latest || (g.updatedAt && g.updatedAt > latest) ? g.updatedAt : latest),
        null as Date | null
      );
      const studentAvgMap = new Map<string, number>();
      for (const g of allGrades) {
        if (g.overallAverage !== null) {
          studentAvgMap.set(g.studentId, g.overallAverage);
        }
      }
      const averages = Array.from(studentAvgMap.values());
      const classAverage = averages.length > 0
        ? Math.round((averages.reduce((sum, a) => sum + a, 0) / averages.length) * 10) / 10
        : 0;
      const passCount = averages.filter(a => a >= 50).length;
      const passRate = averages.length > 0 ? Math.round((passCount / averages.length) * 100) : 0;

      existingResultsSummary = {
        generatedAt: latestUpdate,
        isPublished: isCurrentlyPublished,
        studentCount: studentAvgMap.size,
        classAverage,
        passRate,
      };
    }

    const subjectPreflight = subjects.map(sub => {
      const subGrades = allGrades.filter(g => g.subjectId === sub.id);
      const scoredCount = subGrades.filter(g => g.total !== null && g.total > 0).length;

      let status: 'Approved' | 'Pending' | 'Rejected' | 'Draft' | 'Missing' = 'Missing';
      let isLocked = false;

      if (subGrades.length === 0) {
        status = 'Missing';
      } else {
        const hasRejected = subGrades.some(g => g.status === 'Rejected');
        const hasPending = subGrades.some(g => g.status === 'Pending');
        const allApproved = subGrades.length >= totalStudents && subGrades.every(g => g.status === 'Approved');
        isLocked = subGrades.some(g => g.isLocked);

        if (hasRejected) status = 'Rejected';
        else if (hasPending) status = 'Pending';
        else if (allApproved) status = 'Approved';
        else status = 'Draft';
      }

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        teacherName: teacherMap[sub.id] || defaultTeacher,
        totalStudents,
        scoredStudents: scoredCount,
        status,
        isLocked,
      };
    });

    const approvedCount = subjectPreflight.filter(s => s.status === 'Approved').length;
    const pendingCount = subjectPreflight.filter(s => s.status === 'Pending').length;
    const rejectedCount = subjectPreflight.filter(s => s.status === 'Rejected').length;
    const draftCount = subjectPreflight.filter(s => s.status === 'Draft' || s.status === 'Missing').length;
    const totalSubjects = subjectPreflight.length;
    const isReady = totalSubjects > 0 && pendingCount === 0 && rejectedCount === 0 && draftCount === 0;

    return {
      success: true,
      class: { id: classData?.id, name: classData?.name },
      termId: resolvedTermId,
      totalStudents,
      stats: {
        totalSubjects,
        approvedCount,
        pendingCount,
        rejectedCount,
        draftCount,
        readinessPercentage: totalSubjects > 0 ? Math.round((approvedCount / totalSubjects) * 100) : 0,
        isReady,
      },
      subjects: subjectPreflight,
      hasExistingResults,
      isCurrentlyPublished,
      existingResults: existingResultsSummary,
    };
  } catch (error: any) {
    console.error('[getResultPreflightCheck] error:', error);
    return { success: false, error: error.message };
  }
}

// --- Publish & Unpublish Actions ---

export async function unpublishTermResults(classId: string, termId: string, sessionId?: string) {
  try {
    let resolvedTermId = termId;
    if (sessionId) {
      const term = await prisma.term.findFirst({
        where: {
          OR: [
            { id: termId, sessionId },
            { name: termId, sessionId },
          ],
        },
      });
      if (term) resolvedTermId = term.id;
    }

    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });
    const studentIds = students.map(s => s.id);

    await prisma.termGrade.updateMany({
      where: { termId: resolvedTermId, studentId: { in: studentIds } },
      data: { isPublished: false },
    });

    safeRevalidatePath('/dashboard/results');
    safeRevalidatePath('/dashboard/results/view');
    safeRevalidatePath('/dashboard/results/generate');
    safeRevalidatePath('/dashboard/results/broadsheet');

    return {
      success: true,
      message: 'Term results unpublished successfully. Report cards are now hidden from students and parents.',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function publishTermResults(classId: string, termId: string, sessionId?: string) {
  try {
    let resolvedTermId = termId;
    if (sessionId) {
      const term = await prisma.term.findFirst({
        where: {
          OR: [
            { id: termId, sessionId },
            { name: termId, sessionId },
          ],
        },
      });
      if (term) resolvedTermId = term.id;
    }

    const students = await prisma.student.findMany({
      where: { classId },
      select: { id: true },
    });
    const studentIds = students.map(s => s.id);

    await prisma.termGrade.updateMany({
      where: { termId: resolvedTermId, studentId: { in: studentIds } },
      data: { isPublished: true },
    });

    safeRevalidatePath('/dashboard/results');
    safeRevalidatePath('/dashboard/results/view');
    safeRevalidatePath('/dashboard/results/generate');
    safeRevalidatePath('/dashboard/results/broadsheet');

    return {
      success: true,
      message: 'Term results published successfully. Report cards are now live on parent and student portals.',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Report Card ---

export async function getStudentReportCard(studentId: string, termId: string) {
  try {
    const [student, term, systemProfile] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: { class: true },
      }),
      prisma.term.findUnique({
        where: { id: termId },
        include: { session: true },
      }),
      prisma.systemProfile.findFirst(),
    ]);

    if (!student) return { success: false, error: 'Student not found' };

    const grades = await prisma.termGrade.findMany({
      where: { studentId, termId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    });

    // Behavioural assessment (legacy 7 traits)
    const behaviouralAssessment = await prisma.behaviouralAssessment.findUnique({
      where: { studentId_termId: { studentId, termId } },
    });

    // New trait-based scores
    const behaviouralScores = await prisma.behaviouralScore.findMany({
      where: { studentId, termId },
      include: { trait: true },
      orderBy: { trait: { sortOrder: 'asc' } },
    });

    // Tahfeez Quran memorization
    const tahfeezScores = await prisma.tahfeezScore.findMany({
      where: { studentId, termId },
    });

    // Compute summary
    const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const overallAverage = grades.length > 0 ? totalScore / grades.length : 0;
    const classRank = grades[0]?.classRank ?? null;
    const classSize = grades[0]?.classSize ?? null;
    const teacherRemark = grades.find(g => g.teacherRemark)?.teacherRemark || null;
    const principalRemark = grades.find(g => g.principalRemark)?.principalRemark || null;
    let activeScale: any = undefined;
    try {
      if (systemProfile?.gradingScale) activeScale = JSON.parse(systemProfile.gradingScale);
    } catch {}

    return {
      success: true,
      data: {
        student,
        term,
        grades,
        behaviouralAssessment,
        behaviouralScores,
        tahfeezScores,
        school: {
          name: systemProfile?.name || 'Proxima SMS',
          address: systemProfile?.address || 'Knowledge City, Nigeria',
          phone: systemProfile?.phone || '+234 800 000 0000',
          email: systemProfile?.email || 'admin@proximasms.com',
          logoUrl: systemProfile?.logoUrl || null,
          primaryColor: systemProfile?.primaryColor || '#0f172a',
          secondaryColor: systemProfile?.secondaryColor || '#10b981',
        },
        summary: {
          totalSubjects: grades.length,
          totalScore: Math.round(totalScore * 10) / 10,
          overallAverage: Math.round(overallAverage * 10) / 10,
          overallGrade: calculateGradeSync(overallAverage, activeScale),
          classRank,
          classSize,
          teacherRemark,
          principalRemark,
        },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Broadsheet (Class-wide view) ---

export async function getBroadsheetData(classId: string, termIdentifier: string, sessionIdentifier?: string) {
  try {
    // 1. Try finding by ID first
    let term = await prisma.term.findUnique({
      where: { id: termIdentifier },
      include: { session: true },
    });

    // 2. If not found by ID, look up by name and optional session (ID or name)
    if (!term) {
      term = await prisma.term.findFirst({
        where: {
          name: termIdentifier,
          ...(sessionIdentifier
            ? {
                session: {
                  OR: [
                    { id: sessionIdentifier },
                    { name: sessionIdentifier },
                  ],
                },
              }
            : {}),
        },
        include: { session: true },
      });
    }

    // 3. Fallback: find by name regardless of session
    if (!term) {
      term = await prisma.term.findFirst({
        where: { name: termIdentifier },
        include: { session: true },
      });
    }

    if (!term) return { success: false, error: 'Term not found' };

    const students = await prisma.student.findMany({
      where: { classId, status: 'Active' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const classData = await prisma.class.findUnique({ where: { id: classId } });

    let subjectIds: string[] = [];
    if (classData?.subjectIds) {
      try {
        subjectIds = JSON.parse(classData.subjectIds);
      } catch (e) {
        subjectIds = [];
      }
    }

    // Dynamic discovery if class.subjectIds is empty or null
    let subjects;
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      subjects = await prisma.subject.findMany({
        where: { id: { in: subjectIds } },
        orderBy: { name: 'asc' },
      });
    } else {
      const distinctGrades = await prisma.termGrade.findMany({
        where: {
          termId: term.id,
          studentId: { in: students.map(s => s.id) },
        },
        select: { subjectId: true },
        distinct: ['subjectId'],
      });
      const discoveredIds = distinctGrades.map(g => g.subjectId);
      subjects = await prisma.subject.findMany({
        where: discoveredIds.length > 0 ? { id: { in: discoveredIds } } : undefined,
        orderBy: { name: 'asc' },
      });
    }

    const resolvedSubjectIds = subjects.map(s => s.id);

    const allGrades = await prisma.termGrade.findMany({
      where: {
        termId: term.id,
        studentId: { in: students.map(s => s.id) },
        subjectId: { in: resolvedSubjectIds },
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

      const validScores = subjectScores.filter(s => s.total !== null);
      const totalScore = validScores.reduce((s, sc) => s + (sc.total || 0), 0);
      const avg = validScores.length > 0 ? totalScore / validScores.length : 0;

      return {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName },
        subjects: subjectScores,
        totalScore: Math.round(totalScore * 10) / 10,
        average: Math.round(avg * 10) / 10,
        rank: studentGrades[0]?.classRank ?? null,
      };
    });

    // Sort by rank ascending, then by average descending
    broadsheet.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return b.average - a.average;
    });

    return { success: true, broadsheet, subjects, term, class: classData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- Class Batch Report Cards (High-Performance for Bulk Printing) ---

export async function getClassBatchReportCards(classId: string, termIdentifier: string, sessionIdentifier?: string) {
  try {
    let term = await prisma.term.findUnique({
      where: { id: termIdentifier },
      include: { session: true },
    });

    if (!term) {
      term = await prisma.term.findFirst({
        where: {
          name: termIdentifier,
          ...(sessionIdentifier
            ? {
                session: {
                  OR: [
                    { id: sessionIdentifier },
                    { name: sessionIdentifier },
                  ],
                },
              }
            : {}),
        },
        include: { session: true },
      });
    }

    if (!term) {
      term = await prisma.term.findFirst({
        where: { name: termIdentifier },
        include: { session: true },
      });
    }

    if (!term) return { success: false, error: 'Term not found' };

    const [studentList, classData, systemProfile] = await Promise.all([
      prisma.student.findMany({
        where: { classId, status: 'Active' },
        include: { class: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.class.findUnique({ where: { id: classId } }),
      prisma.systemProfile.findFirst(),
    ]);

    if (!studentList || studentList.length === 0) {
      return { success: true, data: [], class: classData, term };
    }

    const studentIds = studentList.map(s => s.id);

    const [allGrades, allBehaviourals, allTraits, allTahfeez] = await Promise.all([
      prisma.termGrade.findMany({
        where: { termId: term.id, studentId: { in: studentIds } },
        include: { subject: true },
        orderBy: { subject: { name: 'asc' } },
      }),
      prisma.behaviouralAssessment.findMany({
        where: { termId: term.id, studentId: { in: studentIds } },
      }),
      prisma.behaviouralScore.findMany({
        where: { termId: term.id, studentId: { in: studentIds } },
        include: { trait: true },
        orderBy: { trait: { sortOrder: 'asc' } },
      }),
      prisma.tahfeezScore.findMany({
        where: { termId: term.id, studentId: { in: studentIds } },
      }),
    ]);

    const school = {
      name: systemProfile?.name || 'Proxima SMS',
      address: systemProfile?.address || 'Knowledge City, Nigeria',
      phone: systemProfile?.phone || '+234 800 000 0000',
      email: systemProfile?.email || 'admin@proximasms.com',
      logoUrl: systemProfile?.logoUrl || null,
      primaryColor: systemProfile?.primaryColor || '#0f172a',
      secondaryColor: systemProfile?.secondaryColor || '#10b981',
    };

    let activeBatchScale: any = undefined;
    try {
      if (systemProfile?.gradingScale) activeBatchScale = JSON.parse(systemProfile.gradingScale);
    } catch {}

    const reportCards = studentList.map(student => {
      const grades = allGrades.filter(g => g.studentId === student.id);
      const behaviouralAssessment = allBehaviourals.find(b => b.studentId === student.id) || null;
      const behaviouralScores = allTraits.filter(b => b.studentId === student.id);
      const tahfeezScores = allTahfeez.filter(t => t.studentId === student.id);

      const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
      const overallAverage = grades.length > 0 ? totalScore / grades.length : 0;
      const classRank = grades[0]?.classRank ?? null;
      const classSize = grades[0]?.classSize ?? studentList.length;
      const teacherRemark = grades.find(g => g.teacherRemark)?.teacherRemark || null;
      const principalRemark = grades.find(g => g.principalRemark)?.principalRemark || null;
      const isPublished = grades.length > 0 ? grades.every(g => g.isPublished) : false;

      return {
        student,
        term,
        grades,
        behaviouralAssessment,
        behaviouralScores,
        tahfeezScores,
        school,
        summary: {
          totalSubjects: grades.length,
          totalScore: Math.round(totalScore * 10) / 10,
          overallAverage: Math.round(overallAverage * 10) / 10,
          overallGrade: calculateGradeSync(overallAverage, activeBatchScale),
          classRank,
          classSize,
          teacherRemark,
          principalRemark,
          isPublished,
        },
      };
    });

    reportCards.sort((a, b) => {
      if (a.summary.classRank && b.summary.classRank) {
        return a.summary.classRank - b.summary.classRank;
      }
      return `${a.student.lastName} ${a.student.firstName}`.localeCompare(`${b.student.lastName} ${b.student.firstName}`);
    });

    return {
      success: true,
      data: reportCards,
      class: classData,
      term,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitScoresForReview(
  classId: string,
  subjectId: string,
  termId: string,
  teacherId?: string
) {
  try {
    let resolvedTeacherId = teacherId;
    if (!resolvedTeacherId) {
      try {
        const session = await auth();
        resolvedTeacherId = (session?.user as any)?.id;
      } catch {}
    }

    const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
    const studentIds = students.map((s) => s.id);

    // Snapshot original marks if not yet recorded
    const existingGrades = await prisma.termGrade.findMany({
      where: { termId, subjectId, studentId: { in: studentIds } },
    });

    for (const g of existingGrades) {
      const origCa1 = g.originalCa1 !== null ? g.originalCa1 : g.ca1;
      const origCa2 = g.originalCa2 !== null ? g.originalCa2 : g.ca2;
      const origExam = g.originalExam !== null ? g.originalExam : g.exam;

      await prisma.termGrade.update({
        where: { id: g.id },
        data: {
          status: 'Pending',
          submittedAt: new Date(),
          submittedById: resolvedTeacherId || null,
          moderatorNote: null, // Clear old rejection note on resubmission
          isLocked: false,
          originalCa1: origCa1,
          originalCa2: origCa2,
          originalExam: origExam,
        },
      });
    }

    safeRevalidatePath('/dashboard/scores');
    safeRevalidatePath('/dashboard/scores/enter');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reviewScoreSheet(
  classId: string,
  subjectId: string,
  termId: string,
  action: 'Approved' | 'Rejected',
  feedbackNote?: string,
  reviewerId?: string
) {
  try {
    let resolvedReviewerId = reviewerId;
    if (!resolvedReviewerId) {
      try {
        const session = await auth();
        resolvedReviewerId = (session?.user as any)?.id;
      } catch {}
    }

    const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
    const isApproved = action === 'Approved';

    // Note: strictly writes to moderatorNote, leaving teacherRemark untouched so internal criticism never leaks to parents!
    await prisma.termGrade.updateMany({
      where: { termId, subjectId, studentId: { in: students.map((s) => s.id) } },
      data: {
        status: action,
        isPublished: isApproved,
        isLocked: isApproved, // Automatically lock sheet once approved to prevent tampering
        moderatorNote: action === 'Rejected' ? (feedbackNote?.trim() || null) : null,
        reviewedAt: new Date(),
        reviewedById: resolvedReviewerId || null,
      },
    });

    safeRevalidatePath('/dashboard/scores');
    safeRevalidatePath('/dashboard/scores/enter');
    safeRevalidatePath('/dashboard/results/broadsheet');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getModerationQueue(filters?: {
  status?: string;
  termId?: string;
  sessionId?: string;
  classId?: string;
  subjectId?: string;
  search?: string;
}) {
  try {
    const where: any = {};
    if (filters?.termId && filters.termId !== 'ALL') {
      where.termId = filters.termId;
    }
    if (filters?.subjectId && filters.subjectId !== 'ALL') {
      where.subjectId = filters.subjectId;
    }
    if (filters?.sessionId && filters.sessionId !== 'ALL') {
      where.term = { sessionId: filters.sessionId };
    }

    // Fetch grades with relations
    const grades = await prisma.termGrade.findMany({
      where,
      select: {
        id: true,
        status: true,
        total: true,
        ca1: true,
        ca2: true,
        exam: true,
        moderatorNote: true,
        isLocked: true,
        submittedAt: true,
        submittedById: true,
        reviewedAt: true,
        reviewedById: true,
        subjectId: true,
        termId: true,
        studentId: true,
        student: {
          select: {
            id: true,
            classId: true,
            class: {
              select: {
                id: true,
                name: true,
                teacherId: true,
                subjectTeachers: true,
                teacher: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
        subject: { select: { id: true, name: true } },
        term: { select: { id: true, name: true, session: { select: { id: true, name: true } } } },
      },
    });

    const allUsers = await prisma.user.findMany({
      where: { role: { in: ['TEACHER', 'HOD', 'EXAM_OFFICER', 'ADMIN', 'SUPER_ADMIN', 'PRINCIPAL'] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map<string, string>(allUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`]));

    // Aggregate by sheet key: `${classId}__${subjectId}__${termId}`
    const sheetMap = new Map<string, any>();

    for (const g of grades) {
      const classId = g.student?.classId;
      if (!classId) continue;
      const key = `${classId}__${g.subjectId}__${g.termId}`;

      if (!sheetMap.has(key)) {
        let teacherName = 'Unassigned';
        const classObj = g.student?.class;
        if (classObj?.subjectTeachers) {
          try {
            const mapping = JSON.parse(classObj.subjectTeachers);
            const teacherId = mapping[g.subjectId];
            if (teacherId && userMap.has(teacherId)) {
              teacherName = userMap.get(teacherId)!;
            }
          } catch {}
        }
        if (teacherName === 'Unassigned' && g.submittedById && userMap.has(g.submittedById)) {
          teacherName = userMap.get(g.submittedById)!;
        }
        if (teacherName === 'Unassigned' && classObj?.teacher) {
          teacherName = `${classObj.teacher.firstName} ${classObj.teacher.lastName}`;
        }

        sheetMap.set(key, {
          key,
          classId,
          className: classObj?.name || 'Class',
          subjectId: g.subjectId,
          subjectName: g.subject?.name || 'Subject',
          subjectCode: g.subject?.code || '',
          termId: g.termId,
          termName: g.term?.name || 'Term',
          sessionId: g.term?.session?.id || '',
          sessionName: g.term?.session?.name || '',
          teacherName,
          totalStudents: 0,
          scoredStudents: 0,
          hasPending: false,
          hasApproved: false,
          hasRejected: false,
          allApproved: true,
          isLocked: false,
          submittedAt: g.submittedAt,
          reviewedAt: g.reviewedAt,
          moderatorNote: g.moderatorNote,
        });
      }

      const sheet = sheetMap.get(key)!;
      sheet.totalStudents += 1;
      if (g.total !== null && g.total > 0) {
        sheet.scoredStudents += 1;
      }
      if (g.status === 'Pending') sheet.hasPending = true;
      if (g.status === 'Approved') sheet.hasApproved = true;
      else sheet.allApproved = false;
      if (g.status === 'Rejected') sheet.hasRejected = true;
      if (g.isLocked) sheet.isLocked = true;
      if (g.submittedAt && (!sheet.submittedAt || g.submittedAt > sheet.submittedAt)) {
        sheet.submittedAt = g.submittedAt;
      }
      if (g.reviewedAt && (!sheet.reviewedAt || g.reviewedAt > sheet.reviewedAt)) {
        sheet.reviewedAt = g.reviewedAt;
      }
      if (g.moderatorNote) {
        sheet.moderatorNote = g.moderatorNote;
      }
    }

    // Determine final status for each sheet
    const sheets = Array.from(sheetMap.values()).map((s) => {
      let finalStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected' = 'Draft';
      if (s.hasRejected) {
        finalStatus = 'Rejected';
      } else if (s.hasPending) {
        finalStatus = 'Pending';
      } else if (s.hasApproved && s.allApproved) {
        finalStatus = 'Approved';
      } else if (s.hasApproved) {
        finalStatus = 'Pending';
      }
      return {
        ...s,
        status: finalStatus,
      };
    });

    let result = sheets;
    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter((s) => s.status.toLowerCase() === filters.status!.toLowerCase());
    }

    if (filters?.classId && filters.classId !== 'ALL') {
      result = result.filter((s) => s.classId === filters.classId);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.className.toLowerCase().includes(q) ||
          s.subjectName.toLowerCase().includes(q) ||
          s.teacherName.toLowerCase().includes(q) ||
          s.subjectCode.toLowerCase().includes(q)
      );
    }

    const statusPriority: Record<string, number> = {
      Pending: 1,
      Rejected: 2,
      Draft: 3,
      Approved: 4,
    };

    result.sort((a, b) => {
      const pA = statusPriority[a.status] || 5;
      const pB = statusPriority[b.status] || 5;
      if (pA !== pB) return pA - pB;
      if (a.submittedAt && b.submittedAt) {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      return a.className.localeCompare(b.className);
    });

    return { success: true, sheets: result };
  } catch (error: any) {
    console.error('[getModerationQueue] error:', error);
    return { success: false, sheets: [], error: error.message };
  }
}

export async function getModerationStats(termId?: string, sessionId?: string) {
  try {
    const queueRes = await getModerationQueue({ termId, sessionId });
    const sheets = queueRes.sheets || [];

    const pendingCount = sheets.filter((s) => s.status === 'Pending').length;
    const approvedCount = sheets.filter((s) => s.status === 'Approved').length;
    const returnedCount = sheets.filter((s) => s.status === 'Rejected').length;
    const draftCount = sheets.filter((s) => s.status === 'Draft').length;
    const totalSheets = sheets.length;
    const approvalRate = totalSheets > 0 ? Math.round((approvedCount / totalSheets) * 100) : 0;

    return {
      success: true,
      pendingCount,
      approvedCount,
      returnedCount,
      draftCount,
      totalSheets,
      approvalRate,
    };
  } catch (error: any) {
    return {
      success: false,
      pendingCount: 0,
      approvedCount: 0,
      returnedCount: 0,
      draftCount: 0,
      totalSheets: 0,
      approvalRate: 0,
      error: error.message,
    };
  }
}

export async function saveModeratorScores(data: {
  classId: string;
  subjectId: string;
  termId: string;
  edits: Array<{
    studentId: string;
    ca1?: number | null;
    ca2?: number | null;
    exam?: number | null;
    reason?: string;
  }>;
  modifierId?: string;
}) {
  try {
    let resolvedModifierId = data.modifierId;
    if (!resolvedModifierId) {
      try {
        const session = await auth();
        resolvedModifierId = (session?.user as any)?.id;
      } catch {}
    }

    if (!resolvedModifierId) {
      const fallback = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'EXAM_OFFICER'] } },
        select: { id: true },
      });
      resolvedModifierId = fallback?.id;
    }

    // Check if sheet is locked
    const sample = await prisma.termGrade.findFirst({
      where: { termId: data.termId, subjectId: data.subjectId },
      select: { isLocked: true },
    });

    if (sample?.isLocked) {
      throw new Error('This score sheet is locked. Please unlock the sheet before saving adjustments.');
    }

    for (const edit of data.edits) {
      const existing = await prisma.termGrade.findUnique({
        where: {
          studentId_subjectId_termId: {
            studentId: edit.studentId,
            subjectId: data.subjectId,
            termId: data.termId,
          },
        },
      });

      if (!existing) continue;

      const origCa1 = existing.originalCa1 !== null ? existing.originalCa1 : existing.ca1;
      const origCa2 = existing.originalCa2 !== null ? existing.originalCa2 : existing.ca2;
      const origExam = existing.originalExam !== null ? existing.originalExam : existing.exam;

      // Log changes into ScoreAuditLog if values were modified
      if (resolvedModifierId) {
        if (edit.ca1 !== undefined && edit.ca1 !== existing.ca1) {
          await prisma.scoreAuditLog.create({
            data: {
              termGradeId: existing.id,
              studentId: edit.studentId,
              subjectId: data.subjectId,
              termId: data.termId,
              modifierId: resolvedModifierId,
              field: 'ca1',
              oldValue: existing.ca1,
              newValue: edit.ca1,
              reason: edit.reason || 'Moderator adjustment',
            },
          });
        }
        if (edit.ca2 !== undefined && edit.ca2 !== existing.ca2) {
          await prisma.scoreAuditLog.create({
            data: {
              termGradeId: existing.id,
              studentId: edit.studentId,
              subjectId: data.subjectId,
              termId: data.termId,
              modifierId: resolvedModifierId,
              field: 'ca2',
              oldValue: existing.ca2,
              newValue: edit.ca2,
              reason: edit.reason || 'Moderator adjustment',
            },
          });
        }
        if (edit.exam !== undefined && edit.exam !== existing.exam) {
          await prisma.scoreAuditLog.create({
            data: {
              termGradeId: existing.id,
              studentId: edit.studentId,
              subjectId: data.subjectId,
              termId: data.termId,
              modifierId: resolvedModifierId,
              field: 'exam',
              oldValue: existing.exam,
              newValue: edit.exam,
              reason: edit.reason || 'Moderator adjustment',
            },
          });
        }
      }

      const newCa1 = edit.ca1 !== undefined ? edit.ca1 : existing.ca1;
      const newCa2 = edit.ca2 !== undefined ? edit.ca2 : existing.ca2;
      const newExam = edit.exam !== undefined ? edit.exam : existing.exam;
      const total = (newCa1 || 0) + (newCa2 || 0) + (newExam || 0);
      const grade = calculateGradeSync(total);
      const remarks = getGradeRemark(grade);

      await prisma.termGrade.update({
        where: { id: existing.id },
        data: {
          ca1: newCa1,
          ca2: newCa2,
          exam: newExam,
          total,
          grade,
          remarks,
          originalCa1: origCa1,
          originalCa2: origCa2,
          originalExam: origExam,
        },
      });
    }

    safeRevalidatePath('/dashboard/scores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleScoreSheetLock(
  classId: string,
  subjectId: string,
  termId: string,
  isLocked: boolean
) {
  try {
    const students = await prisma.student.findMany({ where: { classId }, select: { id: true } });
    await prisma.termGrade.updateMany({
      where: { termId, subjectId, studentId: { in: students.map((s) => s.id) } },
      data: { isLocked },
    });
    safeRevalidatePath('/dashboard/scores');
    return { success: true, isLocked };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getScoreAuditHistory(filters?: {
  termId?: string;
  subjectId?: string;
  limit?: number;
}) {
  try {
    const where: any = {};
    if (filters?.termId) where.termId = filters.termId;
    if (filters?.subjectId) where.subjectId = filters.subjectId;

    const logs = await prisma.scoreAuditLog.findMany({
      where,
      include: {
        modifier: { select: { firstName: true, lastName: true, role: true } },
        termGrade: {
          include: {
            student: { select: { firstName: true, lastName: true, studentId: true, class: { select: { name: true } } } },
            subject: { select: { name: true } },
            term: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });

    return { success: true, logs };
  } catch (error: any) {
    return { success: false, logs: [], error: error.message };
  }
}

export async function updateReportCardRemarks(
  studentId: string,
  termId: string,
  data: { teacherRemark?: string; principalRemark?: string }
) {
  try {
    await prisma.termGrade.updateMany({
      where: { studentId, termId },
      data: {
        ...(data.teacherRemark !== undefined && { teacherRemark: data.teacherRemark }),
        ...(data.principalRemark !== undefined && { principalRemark: data.principalRemark }),
      },
    });
    safeRevalidatePath('/dashboard/results/view');
    return { success: true };
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
  try {
    await prisma.termGrade.update({
      where: { id: termGradeId },
      data: { status, isPublished: status === 'Approved' }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function approveAllPendingScores(classId: string, subjectId: string, termId: string) {
  try {
    const studentIds = (await prisma.student.findMany({ where: { classId }, select: { id: true } })).map(s => s.id);
    await prisma.termGrade.updateMany({
      where: { termId, subjectId, studentId: { in: studentIds } },
      data: { isPublished: true, status: 'Approved' },
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