'use server';

import { prisma } from "@/lib/prisma";
import { requireSchoolId } from "@/lib/server-context";
import { z } from "zod";
import { revalidatePath } from "next/cache";


export async function getStudentDashboardData(studentId: string) {
  try {
    const schoolId = await requireSchoolId();
    // 1. Fetch Student Core Data
    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId },
      include: { class: true }
    });

    if (!student) throw new Error("Student not found.");

    // 2. Fetch SIS Data: Attendance & Finance
    const attendanceCount = await prisma.attendance.count({ where: { studentId, schoolId } });
    const attendancePresent = await prisma.attendance.count({ where: { studentId, status: 'PRESENT', schoolId } });
    const attendanceRate = attendanceCount > 0 ? (attendancePresent / attendanceCount) * 100 : 100;

    const invoices = await prisma.invoice.findMany({ where: { studentId, schoolId } });
    const totalBalance = invoices.reduce((sum, inv) => sum + (inv.amount - inv.amountPaid), 0);

    // 3. Fetch LMS Data: Upcoming Assignments & Quizzes
    // Find modules for the student's class
    const modules = await prisma.lmsModule.findMany({
      where: { classId: student.classId || "", schoolId },
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

    // Flatten and filter for upcoming
    const now = new Date();
    const upcomingAssignments = modules.flatMap(m => m.assignments)
      .filter(as => as.submissions.length === 0 && (!as.dueDate || as.dueDate > now))
      .slice(0, 5);

    const availableQuizzes = modules.flatMap(m => m.quizzes)
      .filter(q => q.attempts.length === 0)
      .slice(0, 5);

    return {
      success: true,
      data: {
        profile: student,
        stats: {
          attendanceRate,
          totalBalance,
          pendingTasks: upcomingAssignments.length + availableQuizzes.length
        },
        upcomingAssignments,
        availableQuizzes,
        recentModules: modules.slice(0, 4)
      }
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches all active students enrolled in a given class (by class name),
 * scoped to the current school. Results are sorted alphabetically.
 */
export async function getStudentsByClass(className: string) {
  const schoolId = await requireSchoolId();
  return prisma.student.findMany({
    where: {
      // Filter by class name, active status, and current school
      class: { name: className },
      schoolId,
      status: 'Active',
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      class: { select: { name: true } },
    },
  });
}

/**
 * Generate a unique display student ID formatted as [SCHOOL_PREFIX]-[YEAR][SEQUENCE_NUMBER]
 * e.g., KINGS-260001
 */
async function generateStudentId(schoolId: string, offset = 0): Promise<string> {
    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    const slug = school ? school.slug.toUpperCase().slice(0, 5) : 'STU';
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await prisma.student.count({ where: { schoolId } });
    const nextId = (count + offset + 1).toString().padStart(4, '0');
    return `${slug}-${year}${nextId}`;
}

// Zod schema for validating the createStudent FormData input
const studentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  gender: z.enum(['Male', 'Female']),
  dateOfBirth: z.string(), // ISO String representation
  address: z.string().min(1),
  guardianName: z.string().min(1),
  guardianContact: z.string().min(1),
  guardianEmail: z.string().email(),
  classId: z.string().min(1),
  admissionDate: z.string(), // ISO String representation
  session: z.string(),
  medicalConditions: z.string().optional(),
});

/**
 * Create a new student, create their guardian user account if missing,
 * and link them in the database.
 */
export async function createStudent(formData: FormData) {
  try {
    const schoolId = await requireSchoolId();
    
    // Convert FormData entries to a plain object and validate
    const rawData = Object.fromEntries(formData.entries());
    const parsed = studentSchema.safeParse(rawData);
    if (!parsed.success) {
      return { error: 'Invalid form data: ' + JSON.stringify(parsed.error.flatten().fieldErrors) };
    }
    
    const data = parsed.data;
    const studentId = await generateStudentId(schoolId);
    
    // 1. Create or resolve User account for the guardian
    let parentUser = await prisma.user.findUnique({
      where: { email: data.guardianEmail }
    });
    
    if (!parentUser) {
      const nameParts = data.guardianName.trim().split(/\s+/);
      const parentFirstName = nameParts[0] || 'Parent';
      const parentLastName = nameParts.slice(1).join(' ') || 'Guardian';
      
      parentUser = await prisma.user.create({
        data: {
          schoolId,
          email: data.guardianEmail,
          phone: data.guardianContact,
          firstName: parentFirstName,
          lastName: parentLastName,
          role: 'PARENT',
          passwordHash: data.guardianContact, // Default password is phone number
          status: 'active'
        }
      });
    }
    
    // 2. Create the student database record
    const student = await prisma.student.create({
      data: {
        schoolId,
        studentId,
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        gender: data.gender,
        dateOfBirth: new Date(data.dateOfBirth),
        classId: data.classId,
        sessionYear: data.session,
        status: 'Active',
        admissionDate: new Date(data.admissionDate),
      }
    });
    
    // 3. Link them by creating a Guardian record
    await prisma.guardian.create({
      data: {
        schoolId,
        studentId: student.id,
        userId: parentUser.id,
        fullName: data.guardianName,
        relationship: 'PARENT',
        phone: data.guardianContact,
        email: data.guardianEmail,
        address: data.address,
        isPrimary: true,
      }
    });
    
    revalidatePath('/dashboard/students');
    return { success: true, student };
  } catch (error: any) {
    console.error('Error creating student:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Bulk create student profiles and matching parent logins from spreadsheet data.
 */
export async function bulkCreateStudents(studentList: any[]) {
  try {
    const schoolId = await requireSchoolId();
    let importedCount = 0;
    let errorCount = 0;
    const invalidRecords: any[] = [];
    
    for (const record of studentList) {
      try {
        if (!record.guardianEmail && !record.email) {
          throw new Error('Guardian email is required.');
        }
        if (!record.firstName || !record.lastName) {
          throw new Error('Student first and last names are required.');
        }
        
        // Match Class ID from the class name (e.g., "JSS 1")
        let classId: string | null = null;
        if (record.class) {
          const classRecord = await prisma.class.findFirst({
            where: { name: record.class, schoolId }
          });
          if (classRecord) {
            classId = classRecord.id;
          }
        }
        
        const studentId = await generateStudentId(schoolId, importedCount);
        
        const guardianEmail = record.guardianEmail || record.email;
        const guardianContact = record.guardianContact || record.phone || '0000000000';
        const guardianName = record.guardianName || 'Parent / Guardian';
        
        // Resolve parent login record
        let parentUser = await prisma.user.findUnique({
          where: { email: guardianEmail }
        });
        
        if (!parentUser) {
          const nameParts = guardianName.trim().split(/\s+/);
          const parentFirstName = nameParts[0] || 'Parent';
          const parentLastName = nameParts.slice(1).join(' ') || 'Guardian';
          
          parentUser = await prisma.user.create({
            data: {
              schoolId,
              email: guardianEmail,
              phone: guardianContact,
              firstName: parentFirstName,
              lastName: parentLastName,
              role: 'PARENT',
              passwordHash: guardianContact,
              status: 'active'
            }
          });
        }
        
        // Create student record
        const student = await prisma.student.create({
          data: {
            schoolId,
            studentId,
            firstName: record.firstName,
            lastName: record.lastName,
            middleName: record.middleName || null,
            gender: record.gender || 'Male',
            dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth) : new Date('2015-01-01'),
            classId,
            sessionYear: record.session || '2024/2025',
            status: 'Active',
            admissionDate: record.admissionDate ? new Date(record.admissionDate) : new Date(),
          }
        });
        
        // Link parent and child
        await prisma.guardian.create({
          data: {
            schoolId,
            studentId: student.id,
            userId: parentUser.id,
            fullName: guardianName,
            relationship: record.relationship || 'PARENT',
            phone: guardianContact,
            email: guardianEmail,
            address: record.address || 'N/A',
            isPrimary: true,
          }
        });
        
        importedCount++;
      } catch (err: any) {
        errorCount++;
        invalidRecords.push({
          firstName: record.firstName || 'N/A',
          lastName: record.lastName || '',
          error: err.message || 'Database error'
        });
      }
    }
    
    revalidatePath('/dashboard/students');
    return { success: true, importedCount, errorCount, invalidRecords };
  } catch (error: any) {
    console.error('Error bulk creating students:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

