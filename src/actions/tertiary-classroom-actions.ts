'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';

const STUDENT_PORTAL_INCLUDE = {
  user: true,
  program: { include: { department: true, faculty: true } },
  academicStandings: { orderBy: { academicSession: 'desc' as const }, take: 1 },
  clearance: true,
  invoices: { orderBy: { createdAt: 'desc' as const } },
  registrations: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: {
      courses: {
        include: {
          offering: {
            include: {
              course: true,
              schedules: { include: { venue: true } },
              lecturers: { include: { staff: { include: { user: true } } } },
              materials: {
                where: { isPublished: true },
                orderBy: { weekNumber: 'asc' as const },
                include: { uploadedBy: { include: { user: true } } }
              },
              assignments: {
                where: { status: { in: ['PUBLISHED', 'CLOSED'] } },
                orderBy: { dueDate: 'asc' as const },
                include: {
                  submissions: {
                    include: { gradedBy: { include: { user: true } } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// ==============================================================================
// 1. STUDENT PORTAL & INSTITUTION ACTIVITY MONITOR
// ==============================================================================

export async function getStudentPortalData(targetStudentId?: string) {
  try {
    let student: any = null;

    if (targetStudentId) {
      student = await prisma.studentProfile.findUnique({
        where: { id: targetStudentId },
        include: STUDENT_PORTAL_INCLUDE
      });
    }

    if (!student) {
      // Check currently authenticated student session first
      const session = await auth();
      if (session?.user?.id) {
        student = await prisma.studentProfile.findUnique({
          where: { userId: session.user.id },
          include: STUDENT_PORTAL_INCLUDE
        });
      }
    }

    if (!student) {
      // Fallback to first student with registered courses (or first student in the institution)
      student = await prisma.studentProfile.findFirst({
        where: { registrations: { some: {} } },
        orderBy: { matricNumber: 'asc' },
        include: STUDENT_PORTAL_INCLUDE
      });
    }

    if (!student) {
      student = await prisma.studentProfile.findFirst({
        orderBy: { matricNumber: 'asc' },
        include: STUDENT_PORTAL_INCLUDE
      });
    }

    if (!student) {
      return { success: false, error: 'No student profile found in database.' };
    }

    const activeReg = student.registrations[0] || null;
    const registeredCourseIds = Array.from(new Set(activeReg?.courses.map((rc: any) => rc.offering?.courseId).filter(Boolean)));

    // Fetch all active offerings for the student's registered courses
    let registeredOfferings: any[] = activeReg?.courses.map((rc: any) => rc.offering) || [];
    if (registeredCourseIds.length > 0) {
      const allOfferingsForCourses = await prisma.courseOffering.findMany({
        where: {
          courseId: { in: registeredCourseIds as string[] },
          ...(activeReg?.academicSession ? { academicSession: activeReg.academicSession } : {})
        },
        include: {
          course: true,
          schedules: { include: { venue: true } },
          lecturers: { include: { staff: { include: { user: true } } } },
          materials: {
            where: { isPublished: true },
            orderBy: { weekNumber: 'asc' },
            include: { uploadedBy: { include: { user: true } } }
          },
          assignments: {
            where: { status: { in: ['PUBLISHED', 'CLOSED'] } },
            orderBy: { dueDate: 'asc' },
            include: {
              submissions: {
                include: { gradedBy: { include: { user: true } } }
              }
            }
          }
        }
      });
      if (allOfferingsForCourses.length > 0) {
        // Merge without duplicates by offering ID
        const offeringMap = new Map<string, any>();
        registeredOfferings.forEach(o => offeringMap.set(o.id, o));
        allOfferingsForCourses.forEach(o => offeringMap.set(o.id, o));
        registeredOfferings = Array.from(offeringMap.values());
      }
    }

    // Aggregate materials across all registered courses
    const allMaterials = registeredOfferings.flatMap(offering =>
      offering.materials.map((mat: any) => ({
        ...mat,
        courseCode: offering.course.code,
        courseTitle: offering.course.title,
        lecturerName: mat.uploadedBy.user ? `${mat.uploadedBy.user.firstName || ''} ${mat.uploadedBy.user.lastName || ''}`.trim() : 'Course Lecturer'
      }))
    );

    // Aggregate assignments with student's personal submission status
    const allAssignments = registeredOfferings.flatMap(offering =>
      offering.assignments.map((asgn: any) => {
        const studentSubmission = asgn.submissions.find((s: any) => s.studentId === student.id) || null;
        return {
          id: asgn.id,
          title: asgn.title,
          description: asgn.description,
          maxScore: asgn.maxScore,
          dueDate: asgn.dueDate,
          attachmentUrl: asgn.attachmentUrl,
          attachmentName: asgn.attachmentName,
          status: asgn.status,
          courseCode: offering.course.code,
          courseTitle: offering.course.title,
          offeringId: offering.id,
          submission: studentSubmission ? {
            id: studentSubmission.id,
            status: studentSubmission.status,
            submissionText: studentSubmission.submissionText,
            fileUrl: studentSubmission.fileUrl,
            fileName: studentSubmission.fileName,
            score: studentSubmission.score,
            feedback: studentSubmission.feedback,
            pasteCount: studentSubmission.pasteCount || 0,
            tabSwitchCount: studentSubmission.tabSwitchCount || 0,
            isPasteFlagged: studentSubmission.isPasteFlagged || false,
            similarityScore: studentSubmission.similarityScore || 0,
            submittedAt: studentSubmission.submittedAt,
            gradedAt: studentSubmission.gradedAt
          } : null
        };
      })
    );

    // Financial clearance summary
    const totalInvoiced = student.invoices.reduce((acc: number, inv: any) => acc + (inv.totalAmount ?? inv.amount ?? 0), 0);
    const totalPaid = student.invoices.reduce((acc: number, inv: any) => acc + (inv.amountPaid ?? inv.paidAmount ?? 0), 0);
    const paymentPercentage = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 100;
    const isBursaryCleared = activeReg?.isBursaryCleared || paymentPercentage >= 50;

    // Academic performance summary
    const latestStanding = student.academicStandings[0] || null;

    // Student Activity Feed
    const activities: Array<{
      id: string;
      title: string;
      category: 'MATERIAL' | 'ASSIGNMENT' | 'GRADE' | 'BURSARY' | 'REGISTRATION';
      description: string;
      timestamp: Date;
      metadata?: any;
    }> = [];

    // Add material activities
    allMaterials.forEach(mat => {
      activities.push({
        id: `mat-${mat.id}`,
        title: mat.materialType === 'AUDIO_RECORDING' ? `New Audio Lecture: ${mat.title}` : `New Lecture Note: ${mat.title}`,
        category: 'MATERIAL',
        description: `Uploaded for ${mat.courseCode} by ${mat.lecturerName}`,
        timestamp: mat.createdAt,
        metadata: { type: mat.materialType, url: mat.fileUrl, duration: mat.durationSeconds }
      });
    });

    // Add assignment activities
    allAssignments.forEach(asgn => {
      activities.push({
        id: `asgn-${asgn.id}`,
        title: `Online Assignment: ${asgn.title}`,
        category: 'ASSIGNMENT',
        description: `Due on ${new Date(asgn.dueDate).toLocaleDateString()} (${asgn.courseCode}) - Max Score: ${asgn.maxScore} pts`,
        timestamp: asgn.dueDate,
        metadata: { maxScore: asgn.maxScore, submitted: !!asgn.submission }
      });

      if (asgn.submission && asgn.submission.status === 'GRADED') {
        activities.push({
          id: `grade-${asgn.submission.id}`,
          title: `Assignment Graded: ${asgn.title}`,
          category: 'GRADE',
          description: `Score: ${asgn.submission.score} / ${asgn.maxScore} pts. Feedback: "${asgn.submission.feedback || 'Good work'}"`,
          timestamp: asgn.submission.gradedAt || new Date(),
          metadata: { score: asgn.submission.score, maxScore: asgn.maxScore }
        });
      }
    });

    // Sort activities latest first
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // All registered students for easy profile switching in demo
    const allStudentsList = await prisma.studentProfile.findMany({
      orderBy: { matricNumber: 'asc' },
      include: { user: true, program: true },
      take: 10
    });

    return {
      success: true,
      student: {
        id: student.id,
        matricNumber: student.matricNumber,
        fullName: student.user ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : 'Tertiary Scholar',
        email: student.user?.email || 'student@proxima.edu.ng',
        currentLevel: student.currentLevel,
        program: student.program.name,
        faculty: student.program.faculty?.name || 'Faculty of Computing',
        department: student.program.department?.name || 'Computer Science',
        cgpa: latestStanding ? latestStanding.cgpa : 4.42,
        academicStanding: latestStanding ? latestStanding.standingStatus : 'FIRST_CLASS_HONOURS',
        session: activeReg?.academicSession || '2025/2026',
        semester: activeReg?.semester || 1,
        totalCredits: activeReg?.totalCredits || registeredOfferings.reduce((acc: number, o: any) => acc + (o.course?.creditUnits || 0), 0) || 18,
        isBursaryCleared,
        paymentPercentage,
        totalPaid,
        totalInvoiced,
        clearanceStatus: student.clearance ? student.clearance.overallStatus : 'IN_PROGRESS',
        registeredCourses: registeredOfferings.map(o => ({
          id: o.id,
          code: o.course.code,
          title: o.course.title,
          creditUnits: o.course.creditUnits,
          schedules: o.schedules.map((s: any) => ({
            day: s.dayOfWeek,
            time: `${s.startTime} - ${s.endTime}`,
            venue: s.venue?.name || 'Main Auditorium'
          })),
          lecturers: o.lecturers.map((l: any) => ({
            name: `${l.staff.user.firstName || ''} ${l.staff.user.lastName || ''}`.trim(),
            role: l.role
          }))
        })),
        materials: allMaterials,
        assignments: allAssignments,
        activities
      },
      availableStudents: allStudentsList.map(s => ({
        id: s.id,
        matric: s.matricNumber,
        name: `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || s.matricNumber,
        program: s.program.code
      }))
    };
  } catch (error: any) {
    console.error('Error fetching student portal data:', error);
    return { success: false, error: error.message || 'Failed to retrieve student profile.' };
  }
}

// ==============================================================================
// 2. LECTURER TEACHING STUDIO & COURSE MANAGEMENT
// ==============================================================================

const LECTURER_STUDIO_INCLUDE = {
  user: true,
  department: true,
  assignedCourses: {
    include: {
      courseOffering: {
        include: {
          course: true,
          registeredCourses: {
            include: {
              registration: {
                include: {
                  student: { include: { user: true } }
                }
              }
            }
          },
          materials: {
            orderBy: { createdAt: 'desc' as const },
            include: { uploadedBy: { include: { user: true } } }
          },
          assignments: {
            orderBy: { createdAt: 'desc' as const },
            include: {
              submissions: {
                include: {
                  student: { include: { user: true } }
                }
              }
            }
          }
        }
      }
    }
  }
};

export async function getLecturerStudioData(targetStaffId?: string) {
  try {
    let lecturer: any = null;

    if (targetStaffId) {
      lecturer = await prisma.staffProfile.findUnique({
        where: { id: targetStaffId },
        include: LECTURER_STUDIO_INCLUDE
      });
    }

    if (!lecturer) {
      // Check currently authenticated lecturer session first
      const session = await auth();
      if (session?.user?.id) {
        lecturer = await prisma.staffProfile.findUnique({
          where: { userId: session.user.id },
          include: LECTURER_STUDIO_INCLUDE
        });
      }
    }

    if (!lecturer) {
      lecturer = await prisma.staffProfile.findFirst({
        where: { assignedCourses: { some: {} } },
        include: LECTURER_STUDIO_INCLUDE
      });
    }

    if (!lecturer) {
      return { success: false, error: 'No lecturer profile found.' };
    }

    const assignedOfferings = lecturer.assignedCourses.map((ac: any) => {
      const off = ac.courseOffering;
      const enrolledStudents = off.registeredCourses.map((rc: any) => ({
        studentId: rc.registration.student.id,
        matricNumber: rc.registration.student.matricNumber,
        name: `${rc.registration.student.user.firstName || ''} ${rc.registration.student.user.lastName || ''}`.trim()
      }));

      return {
        allocationId: ac.id,
        role: ac.role,
        offeringId: off.id,
        courseCode: off.course.code,
        courseTitle: off.course.title,
        creditUnits: off.course.creditUnits,
        academicSession: off.academicSession,
        semester: off.semester,
        enrolledCount: enrolledStudents.length,
        students: enrolledStudents,
        materials: off.materials.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          weekNumber: m.weekNumber,
          materialType: m.materialType,
          fileUrl: m.fileUrl,
          fileName: m.fileName,
          fileSize: m.fileSize,
          durationSeconds: m.durationSeconds,
          createdAt: m.createdAt
        })),
        assignments: off.assignments.map((a: any) => {
          const totalSubmissions = a.submissions.length;
          const gradedSubmissions = a.submissions.filter((s: any) => s.status === 'GRADED');
          const avgScore = gradedSubmissions.length > 0
            ? gradedSubmissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / gradedSubmissions.length
            : 0;

          return {
            id: a.id,
            title: a.title,
            description: a.description,
            maxScore: a.maxScore,
            dueDate: a.dueDate,
            attachmentUrl: a.attachmentUrl,
            attachmentName: a.attachmentName,
            status: a.status,
            createdAt: a.createdAt,
            totalSubmissions,
            pendingReview: totalSubmissions - gradedSubmissions.length,
            averageScore: Math.round(avgScore * 10) / 10,
            submissions: a.submissions.map((s: any) => ({
              id: s.id,
              studentId: s.student.id,
              matricNumber: s.student.matricNumber,
              studentName: `${s.student.user.firstName || ''} ${s.student.user.lastName || ''}`.trim(),
              submissionText: s.submissionText,
              fileUrl: s.fileUrl,
              fileName: s.fileName,
              status: s.status,
              score: s.score,
              feedback: s.feedback,
              submittedAt: s.submittedAt,
              gradedAt: s.gradedAt
            }))
          };
        })
      };
    });

    const allLecturersList = await prisma.staffProfile.findMany({
      include: { user: true, department: true },
      take: 10
    });

    return {
      success: true,
      lecturer: {
        id: lecturer.id,
        staffCode: lecturer.staffCode,
        fullName: lecturer.user ? `${lecturer.user.firstName || ''} ${lecturer.user.lastName || ''}`.trim() : 'Senior Faculty Member',
        email: lecturer.user?.email || 'lecturer@proxima.edu.ng',
        department: lecturer.department?.name || 'Computer Science',
        assignedCourses: assignedOfferings,
        totalCourses: assignedOfferings.length,
        totalMaterials: assignedOfferings.reduce((sum: number, c: any) => sum + c.materials.length, 0),
        totalAudioLectures: assignedOfferings.reduce((sum: number, c: any) => sum + c.materials.filter((m: any) => m.materialType === 'AUDIO_RECORDING').length, 0),
        totalAssignments: assignedOfferings.reduce((sum: number, c: any) => sum + c.assignments.length, 0),
      },
      availableLecturers: allLecturersList.map(l => ({
        id: l.id,
        staffCode: l.staffCode,
        name: `${l.user.firstName || ''} ${l.user.lastName || ''}`.trim() || l.staffCode,
        department: l.department?.name || 'Faculty'
      }))
    };
  } catch (error: any) {
    console.error('Error fetching lecturer studio data:', error);
    return { success: false, error: error.message || 'Failed to retrieve lecturer studio.' };
  }
}

// ==============================================================================
// 3. UPLOAD LECTURE NOTES OR AUDIO RECORDING (LECTURER ACTION)
// ==============================================================================

export async function uploadLectureMaterialAction(formData: FormData) {
  try {
    const courseOfferingId = formData.get('courseOfferingId') as string;
    const uploadedById = formData.get('uploadedById') as string;
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    const weekNumber = parseInt(formData.get('weekNumber') as string) || 1;
    const materialType = (formData.get('materialType') as string) || 'DOCUMENT';
    const file = formData.get('file') as File | null;

    if (!courseOfferingId || !uploadedById || !title) {
      return { success: false, error: 'Course offering, lecturer, and title are required.' };
    }

    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let mimeType = '';

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      fileSize = file.size;
      mimeType = file.type;

      // Sanitize filename
      const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      fileName = `${Date.now()}_${originalName}`;

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, buffer);
      fileUrl = `/uploads/materials/${fileName}`;
    } else {
      // Fallback url or link
      fileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.${materialType === 'AUDIO_RECORDING' ? 'mp3' : 'pdf'}`;
      fileUrl = `/uploads/materials/${fileName}`;
    }

    // Default duration for audio
    const durationSeconds = materialType === 'AUDIO_RECORDING' ? Math.floor(Math.random() * 1800) + 1200 : null;

    const newMaterial = await prisma.tertiaryLectureMaterial.create({
      data: {
        courseOfferingId,
        uploadedById,
        title,
        description,
        weekNumber,
        materialType,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        durationSeconds,
        isPublished: true
      }
    });

    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/lecturer-studio');

    return {
      success: true,
      material: newMaterial,
      message: materialType === 'AUDIO_RECORDING'
        ? 'Audio lecture published successfully and made accessible to students.'
        : 'Lecture notes uploaded and published to students.'
    };
  } catch (error: any) {
    console.error('Error uploading lecture material:', error);
    return { success: false, error: error.message || 'Failed to upload lecture material.' };
  }
}

// ==============================================================================
// 4. CREATE ONLINE ASSIGNMENT (LECTURER ACTION)
// ==============================================================================

export async function createTertiaryAssignmentAction(formData: FormData) {
  try {
    const courseOfferingId = formData.get('courseOfferingId') as string;
    const lecturerId = formData.get('lecturerId') as string;
    const title = (formData.get('title') as string)?.trim();
    const description = (formData.get('description') as string)?.trim();
    const maxScore = parseFloat(formData.get('maxScore') as string) || 20.0;
    const dueDateStr = formData.get('dueDate') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!courseOfferingId || !lecturerId || !title || !description || !dueDateStr) {
      return { success: false, error: 'All fields including course, title, instructions, and due date are required.' };
    }

    const dueDate = new Date(dueDateStr);
    if (isNaN(dueDate.getTime())) {
      return { success: false, error: 'Invalid due date format.' };
    }

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;

    if (attachment && attachment.size > 0) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      const safeName = `${Date.now()}_${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'materials');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      await fs.promises.writeFile(path.join(uploadDir, safeName), buffer);
      attachmentUrl = `/uploads/materials/${safeName}`;
      attachmentName = attachment.name;
    }

    const assignment = await prisma.tertiaryAssignment.create({
      data: {
        courseOfferingId,
        lecturerId,
        title,
        description,
        maxScore,
        dueDate,
        attachmentUrl,
        attachmentName,
        status: 'PUBLISHED'
      }
    });

    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/lecturer-studio');

    return {
      success: true,
      assignment,
      message: 'Online assignment published! Students enrolled in this course can now review instructions and submit online.'
    };
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return { success: false, error: error.message || 'Failed to create assignment.' };
  }
}

// ==============================================================================
// 5. SUBMIT ASSIGNMENT ONLINE (STUDENT ACTION)
// ==============================================================================

export async function submitAssignmentOnlineAction(formData: FormData) {
  try {
    const assignmentId = formData.get('assignmentId') as string;
    const studentId = formData.get('studentId') as string;
    const submissionText = (formData.get('submissionText') as string)?.trim() || null;
    const file = formData.get('file') as File | null;
    const pasteCount = parseInt(formData.get('pasteCount') as string || '0', 10);
    const tabSwitchCount = parseInt(formData.get('tabSwitchCount') as string || '0', 10);
    const isPasteFlagged = formData.get('isPasteFlagged') === 'true';
    const similarityScore = parseFloat(formData.get('similarityScore') as string || '0.0');

    if (!assignmentId || !studentId) {
      return { success: false, error: 'Assignment ID and Student ID are required.' };
    }

    if (!submissionText && (!file || file.size === 0)) {
      return { success: false, error: 'Please enter a written response or upload a submission file.' };
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      fileSize = file.size;
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'submissions');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      await fs.promises.writeFile(path.join(uploadDir, safeName), buffer);
      fileUrl = `/uploads/submissions/${safeName}`;
      fileName = file.name;
    }

    const submission = await prisma.tertiaryAssignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId
        }
      },
      update: {
        submissionText,
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        pasteCount,
        tabSwitchCount,
        isPasteFlagged,
        similarityScore,
        status: 'SUBMITTED',
        submittedAt: new Date()
      },
      create: {
        assignmentId,
        studentId,
        submissionText,
        fileUrl,
        fileName,
        fileSize,
        pasteCount,
        tabSwitchCount,
        isPasteFlagged,
        similarityScore,
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    });

    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/lecturer-studio');

    return {
      success: true,
      submission,
      message: 'Assignment submitted successfully! Your lecturer will review and grade your submission.'
    };
  } catch (error: any) {
    console.error('Error submitting assignment:', error);
    return { success: false, error: error.message || 'Failed to submit assignment.' };
  }
}

// ==============================================================================
// 6. GRADE ASSIGNMENT SUBMISSION (LECTURER ACTION)
// ==============================================================================

export async function gradeAssignmentSubmissionAction(
  submissionId: string,
  score: number,
  feedback: string,
  graderStaffId: string
) {
  try {
    if (!submissionId || score === undefined || isNaN(score)) {
      return { success: false, error: 'Submission ID and a valid numeric score are required.' };
    }

    const submission = await prisma.tertiaryAssignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true }
    });

    if (!submission) {
      return { success: false, error: 'Submission record not found.' };
    }

    if (score < 0 || score > submission.assignment.maxScore) {
      return {
        success: false,
        error: `Score must be between 0 and maximum points (${submission.assignment.maxScore}).`
      };
    }

    const updated = await prisma.tertiaryAssignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: feedback?.trim() || null,
        status: 'GRADED',
        gradedById: graderStaffId || null,
        gradedAt: new Date()
      }
    });

    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/lecturer-studio');

    return {
      success: true,
      submission: updated,
      message: `Submission graded successfully! Score: ${score}/${submission.assignment.maxScore}`
    };
  } catch (error: any) {
    console.error('Error grading submission:', error);
    return { success: false, error: error.message || 'Failed to grade submission.' };
  }
}
