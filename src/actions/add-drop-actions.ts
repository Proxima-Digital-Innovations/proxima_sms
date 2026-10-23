'use server';

import { prisma } from '@/lib/prisma';
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
  registrationId: string;
  offeringId: string;
  requestType: 'ADD' | 'DROP';
  reason: string;
}) {
  try {
    const reg = await prisma.semesterRegistration.findUnique({
      where: { id: data.registrationId },
      include: {
        courses: { include: { offering: { include: { course: true } } } },
      },
    });

    if (!reg) throw new Error('Registration record not found.');

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
      if (currentCredits - deltaCredits < 15) {
        throw new Error(`Dropping ${offering.course.code} would drop total credits to ${currentCredits - deltaCredits}, below the statutory 15-credit minimum.`);
      }
    }

    const request = await prisma.courseAddDropRequest.create({
      data: {
        studentId: data.studentProfileId,
        registrationId: data.registrationId,
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
  advisorStaffProfileId: string;
}) {
  try {
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

    return await prisma.$transaction(async (tx) => {
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
          reviewedById: data.advisorStaffProfileId,
          reviewedAt: new Date(),
          rejectionNote: data.rejectionNote || null,
        },
      });

      return updatedReq;
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
