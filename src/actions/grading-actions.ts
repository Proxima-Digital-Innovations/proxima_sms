'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Helper to calculate total score and letter grade
 */
function calculateGrade(ca1: number | null, ca2: number | null, exam: number | null) {
  const total = (ca1 || 0) + (ca2 || 0) + (exam || 0);
  let letter = 'F';
  if (total >= 75) letter = 'A';
  else if (total >= 60) letter = 'B';
  else if (total >= 50) letter = 'C';
  else if (total >= 40) letter = 'D';
  else if (total >= 30) letter = 'E';

  return { total, letter };
}

/**
 * Gets or initializes the Grade Sheet for a specific Class, Subject, and Term
 */
export async function getGradeSheet(classId: string, subjectId: string, termId: string) {
  try {
    const schoolId = await requireSchoolId();
    // 1. Get all students in the class
    const students = await prisma.student.findMany({
      where: { classId, status: "Active", schoolId },
      orderBy: { lastName: 'asc' },
      select: { id: true, studentId: true, firstName: true, lastName: true }
    });

    if (students.length === 0) {
      return { success: false, grades: [], message: "No active students in this class." };
    }

    // 2. Get existing grades
    let grades = await prisma.termGrade.findMany({
      where: {
        termId,
        subjectId,
        schoolId,
        studentId: { in: students.map(s => s.id) }
      },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } }
      }
    });

    // 3. Lazy initialize missing grades
    const missingStudentIds = students
      .filter(s => !grades.some(g => g.studentId === s.id))
      .map(s => s.id);

    if (missingStudentIds.length > 0) {
      await prisma.termGrade.createMany({
        data: missingStudentIds.map(sId => ({
          studentId: sId,
          subjectId,
          termId,
          schoolId
        }))
      });
      // Refetch after creation
      grades = await prisma.termGrade.findMany({
        where: {
          termId,
          subjectId,
          studentId: { in: students.map(s => s.id) }
        },
        include: {
          student: { select: { firstName: true, lastName: true, studentId: true } }
        },
        orderBy: {
          student: { lastName: 'asc' }
        }
      });
    }

    // Sort alphabetically by last name explicitly just in case
    grades.sort((a, b) => a.student.lastName.localeCompare(b.student.lastName));

    return { success: true, grades };
  } catch (error: any) {
    return { success: false, grades: [], message: error.message };
  }
}

/**
 * Bulk save the grade sheet
 */
export async function saveGradeSheet(gradesUpdate: { id: string, ca1: number|null, ca2: number|null, exam: number|null, remarks: string }[]) {
  try {
    // Perform bulk updates in a transaction
    const updatePromises = gradesUpdate.map(update => {
      const { total, letter } = calculateGrade(update.ca1, update.ca2, update.exam);
      return prisma.termGrade.update({
        where: { id: update.id },
        data: {
          ca1: update.ca1,
          ca2: update.ca2,
          exam: update.exam,
          total,
          grade: letter,
          remarks: update.remarks
        }
      });
    });

    await prisma.$transaction(updatePromises);
    
    revalidatePath("/admin/grading");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch a student's full report card for a specific term
 */
export async function getStudentReportCard(studentId: string, termId: string) {
  try {
    const schoolId = await requireSchoolId();
    const [student, grades, attendance, term] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId, schoolId },
        include: { class: true }
      }),
      prisma.termGrade.findMany({
        where: { studentId, termId, schoolId },
        include: { subject: true }
      }),
      prisma.attendance.count({
        where: { studentId, schoolId } // Simplified
      }),
      prisma.term.findUnique({ where: { id: termId, schoolId }, include: { session: true } })
    ]);

    if (!student || !term) return { success: false, message: "Record not found" };

    // Calculate overall term GPA/Total
    const totalScore = grades.reduce((sum, g) => sum + (g.total || 0), 0);
    const average = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : 0;

    return { 
      success: true, 
      report: {
        student,
        term,
        grades,
        attendance,
        totalScore,
        average
      } 
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
