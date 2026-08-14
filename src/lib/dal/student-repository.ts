import { prisma } from "@/lib/prisma";

export class StudentRepository {
  /**
   * Retrieves a student by ID and School ID, including their class.
   */
  static async findStudentWithClass(studentId: string, ) {
    return prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    });
  }

  /**
   * Retrieves the total attendance count for a student.
   */
  static async countTotalAttendance(studentId: string, ) {
    return prisma.attendance.count({ where: { studentId } });
  }

  /**
   * Retrieves the present attendance count for a student.
   */
  static async countPresentAttendance(studentId: string, ) {
    return prisma.attendance.count({ where: { studentId, status: 'PRESENT' } });
  }

  /**
   * Retrieves all invoices for a student.
   */
  static async getInvoices(studentId: string, ) {
    return prisma.invoice.findMany({ where: { studentId } });
  }

  /**
   * Retrieves LMS modules for a given class, including assignments and quizzes for a student.
   */
  static async getLmsModulesWithStudentData(classId: string, studentId: string, ) {
    return prisma.lmsModule.findMany({
      where: { classId },
      include: {
        assignments: {
          include: { submissions: { where: { studentId } } },
          orderBy: { dueDate: 'asc' }
        },
        quizzes: {
          include: { attempts: { where: { studentId } } }
        }
      }
    });
  }
}
