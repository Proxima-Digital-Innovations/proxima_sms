'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getStudentAddDropRequests(studentProfileId: string, session: string, semester: number) {
  try {
    const requests = await prisma.courseAddDropRequest.findMany({
      where: {
        studentId: studentProfileId,
        registration: {
          academicSession: session,
          semester,
        },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
          },
        },
        offering: { include: { course: true } },
        reviewedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: requests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllAddDropRequestsAction(session: string, semester: number) {
  try {
    const requests = await prisma.courseAddDropRequest.findMany({
      where: {
        registration: {
          academicSession: session,
          semester,
        },
      },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
          },
        },
        offering: { include: { course: true } },
        reviewedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: requests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function submitAddDropRequestAction(data: {
  studentProfileId: string;
  registrationId?: string;
  academicSession?: string;
  semester?: number;
  offeringId: string;
  requestType: 'ADD' | 'DROP';
  reason: string;
}) {
  try {
    const sessionStr = data.academicSession || '2025/2026';
    const semNum = data.semester || 1;

    let reg = data.registrationId
      ? await prisma.semesterRegistration.findUnique({
          where: { id: data.registrationId },
          include: {
            courses: { include: { offering: { include: { course: true } } } },
          },
        })
      : null;

    if (!reg) {
      reg = await prisma.semesterRegistration.findUnique({
        where: {
          studentId_academicSession_semester: {
            studentId: data.studentProfileId,
            academicSession: sessionStr,
            semester: semNum,
          },
        },
        include: {
          courses: { include: { offering: { include: { course: true } } } },
        },
      });
    }

    if (!reg) {
      reg = await prisma.semesterRegistration.create({
        data: {
          studentId: data.studentProfileId,
          academicSession: sessionStr,
          semester: semNum,
          status: 'SUBMITTED',
          totalCredits: 0,
        },
        include: {
          courses: { include: { offering: { include: { course: true } } } },
        },
      });
    }

    const offering = await prisma.courseOffering.findUnique({
      where: { id: data.offeringId },
      include: { course: true },
    });
    if (!offering) throw new Error('Course offering not found.');

    const currentCredits = reg.courses.reduce((acc, c) => acc + c.offering.course.creditUnits, 0);
    const deltaCredits = offering.course.creditUnits;

    if (data.requestType === 'ADD') {
      if (currentCredits + deltaCredits > 24 && !reg.isDeanApprovedOverload) {
        throw new Error(`Adding ${offering.course.code} (${deltaCredits} credits) exceeds the 24-credit maximum limit.`);
      }
    } else {
      if (reg.courses.length > 0 && currentCredits - deltaCredits < 15) {
        throw new Error(`Dropping ${offering.course.code} would drop total credits to ${currentCredits - deltaCredits}, below the statutory 15-credit minimum.`);
      }
    }

    const request = await prisma.courseAddDropRequest.create({
      data: {
        studentId: data.studentProfileId,
        registrationId: reg.id,
        offeringId: data.offeringId,
        requestType: data.requestType,
        reason: data.reason,
        status: 'PENDING',
        lateFeeAmount: 5000.0,
      },
    });

    revalidatePath('/dashboard/tertiary/add-drop');
    revalidatePath('/dashboard/tertiary/registration');
    return { success: true, data: request };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reviewAddDropRequestAction(data: {
  requestId: string;
  approved: boolean;
  rejectionNote?: string;
  advisorStaffProfileId?: string;
}) {
  try {
    const session = await auth();
    const userId = session?.user?.id as string | undefined;

    let resolvedAdvisorProfileId: string | null = null;
    if (data.advisorStaffProfileId) {
      const byId = await prisma.staffProfile.findUnique({ where: { id: data.advisorStaffProfileId } });
      if (byId) resolvedAdvisorProfileId = byId.id;
    }
    if (!resolvedAdvisorProfileId && userId) {
      const byUser = await prisma.staffProfile.findUnique({ where: { userId } });
      if (byUser) resolvedAdvisorProfileId = byUser.id;
    }

    const request = await prisma.courseAddDropRequest.findUnique({
      where: { id: data.requestId },
      include: {
        registration: {
          include: { courses: { include: { offering: { include: { course: true } } } } },
        },
        offering: { include: { course: true } },
      },
    });

    if (!request) throw new Error('Add/Drop request not found.');

    const updated = await prisma.$transaction(async (tx) => {
      if (data.approved) {
        if (request.requestType === 'ADD') {
          await tx.studentRegisteredCourse.upsert({
            where: {
              registrationId_offeringId: {
                registrationId: request.registrationId,
                offeringId: request.offeringId,
              },
            },
            create: {
              registrationId: request.registrationId,
              offeringId: request.offeringId,
              creditUnits: request.offering.course.creditUnits,
            },
            update: {},
          });
        } else {
          await tx.studentRegisteredCourse.deleteMany({
            where: {
              registrationId: request.registrationId,
              offeringId: request.offeringId,
            },
          });
        }

        // Recalculate registration total credits
        const remaining = await tx.studentRegisteredCourse.findMany({
          where: { registrationId: request.registrationId },
          include: { offering: { include: { course: true } } },
        });

        const newTotalCredits = remaining.reduce((acc, c) => acc + c.offering.course.creditUnits, 0);
        await tx.semesterRegistration.update({
          where: { id: request.registrationId },
          data: { totalCredits: newTotalCredits },
        });
      }

      const updatedReq = await tx.courseAddDropRequest.update({
        where: { id: data.requestId },
        data: {
          status: data.approved ? 'APPROVED' : 'REJECTED',
          reviewedById: resolvedAdvisorProfileId,
          reviewedAt: new Date(),
          rejectionNote: data.rejectionNote || null,
        },
      });

      return updatedReq;
    });

    revalidatePath('/dashboard/tertiary/add-drop');
    revalidatePath('/dashboard/tertiary/registration');
    revalidatePath('/dashboard/tertiary/student-hub');
    revalidatePath('/dashboard/tertiary/cbt');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
