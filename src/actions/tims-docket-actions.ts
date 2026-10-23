'use server';

import { prisma } from '@/lib/prisma';
import { DocketService } from '@/lib/services/tims/docket-service';
import { auth } from '@/auth';

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
    const session = await auth();
    const userId = session?.user?.id;
    const role = ((session?.user as any)?.role || '').toUpperCase();

    if (role === 'STUDENT' && userId) {
      const ownProfile = await prisma.studentProfile.findUnique({
        where: { userId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          program: true,
          registrations: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (ownProfile) {
        return { success: true, data: [ownProfile] };
      }
    }

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
