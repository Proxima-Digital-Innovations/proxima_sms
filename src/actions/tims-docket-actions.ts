'use server';

import { prisma } from '@/lib/prisma';
import { DocketService } from '@/lib/services/tims/docket-service';

const docketService = new DocketService();

export async function getStudentExamDocketAction(studentProfileId: string, academicSession: string, semester: number) {
  try {
    const data = await docketService.generateExamDocket(studentProfileId, academicSession, semester);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyExamDocketQRAction(token: string) {
  try {
    const data = await docketService.verifyScannedToken(token);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStudentTranscriptAction(studentProfileId: string) {
  try {
    const data = await docketService.getStudentTranscript(studentProfileId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getEligibleDocketStudentsAction() {
  try {
    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        program: true,
        registrations: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { matricNumber: 'asc' },
    });
    return { success: true, data: students };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
