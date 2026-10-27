'use server';

import { prisma } from '@/lib/prisma';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function getGraduationClearances(session?: string, status?: string) {
  try {
    const where: any = {};
    if (session) where.academicSession = session;
    if (status && status !== 'ALL') where.overallStatus = status;

    const clearances = await prisma.graduationClearance.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
            academicStandings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: JSON.parse(JSON.stringify(clearances)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getStudentGraduationClearance(studentProfileId: string) {
  try {
    const clearance = await prisma.graduationClearance.findUnique({
      where: { studentId: studentProfileId },
      include: {
        student: {
          include: {
            user: true,
            program: true,
            academicStandings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return { success: true, data: JSON.parse(JSON.stringify(clearance)) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function initiateGraduationClearance(studentProfileId: string, academicSession: string) {
  try {
    // 1. Verify library books are all returned
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: true },
    });

    if (!student) throw new Error('Student profile not found.');

    const activeLoans = await prisma.eLibraryBorrowRecord.count({
      where: {
        userId: student.userId,
        status: 'BORROWED',
      },
    });

    // Auto-clear library if zero books on loan
    const libraryCleared = activeLoans === 0;
    const libraryNote = activeLoans === 0
      ? 'All library books returned and confirmed.'
      : `${activeLoans} physical/digital book(s) currently unreturned.`;

    const clearance = await prisma.graduationClearance.upsert({
      where: { studentId: studentProfileId },
      create: {
        studentId: studentProfileId,
        academicSession,
        libraryCleared,
        libraryNote,
        libraryClearedAt: libraryCleared ? new Date() : null,
      },
      update: {
        academicSession,
        libraryCleared,
        libraryNote,
        libraryClearedAt: libraryCleared ? new Date() : null,
      },
    });

    revalidatePath('/dashboard/tertiary/clearance');
    return { success: true, data: clearance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDepartmentClearanceAction(data: {
  clearanceId: string;
  department: 'bursary' | 'library' | 'department' | 'faculty' | 'studentAffairs';
  cleared: boolean;
  note?: string;
}) {
  try {
    const updateData: any = {};
    const now = new Date();

    switch (data.department) {
      case 'bursary':
        updateData.bursaryCleared = data.cleared;
        updateData.bursaryNote = data.note || (data.cleared ? 'All tuition, studio, and laboratory fees reconciled.' : 'Outstanding tuition fees.');
        updateData.bursaryClearedAt = data.cleared ? now : null;
        break;
      case 'library':
        updateData.libraryCleared = data.cleared;
        updateData.libraryNote = data.note || (data.cleared ? 'No unreturned books or overdue library fines.' : 'Unreturned textbook holding.');
        updateData.libraryClearedAt = data.cleared ? now : null;
        break;
      case 'department':
        updateData.departmentCleared = data.cleared;
        updateData.departmentNote = data.note || (data.cleared ? 'Capstone project copy deposited and departmental requirements fulfilled.' : 'Pending capstone copy submission.');
        updateData.departmentClearedAt = data.cleared ? now : null;
        break;
      case 'faculty':
        updateData.facultyCleared = data.cleared;
        updateData.facultyNote = data.note || (data.cleared ? 'Faculty Board of Studies exit clearance granted.' : 'Pending faculty clearance.');
        updateData.facultyClearedAt = data.cleared ? now : null;
        break;
      case 'studentAffairs':
        updateData.studentAffairsCleared = data.cleared;
        updateData.studentAffairsNote = data.note || (data.cleared ? 'Hostel key surrendered and student conduct records clean.' : 'Pending hostel inventory inspection.');
        updateData.studentAffairsClearedAt = data.cleared ? now : null;
        break;
    }

    const current = await prisma.graduationClearance.findUnique({
      where: { id: data.clearanceId },
    });
    if (!current) throw new Error('Clearance record not found.');

    const merged = { ...current, ...updateData };
    const allCleared =
      merged.bursaryCleared &&
      merged.libraryCleared &&
      merged.departmentCleared &&
      merged.facultyCleared &&
      merged.studentAffairsCleared;

    updateData.overallStatus = allCleared ? 'APPROVED' : 'PENDING';

    const updated = await prisma.graduationClearance.update({
      where: { id: data.clearanceId },
      data: updateData,
    });

    revalidatePath('/dashboard/tertiary/clearance');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function issueDegreeCertificateAction(clearanceId: string) {
  try {
    const clearance = await prisma.graduationClearance.findUnique({
      where: { id: clearanceId },
      include: {
        student: {
          include: {
            user: true,
            program: true,
            academicStandings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!clearance) throw new Error('Clearance record not found.');
    if (clearance.overallStatus !== 'APPROVED') {
      throw new Error('Cannot issue degree certificate: Student has not received clearance from all 5 statutory bodies.');
    }

    const student = clearance.student;
    const certNum = `CERT-${student.program.code}-${student.matricNumber.replace(/\//g, '')}-${Date.now().toString().slice(-4)}`;
    const standing = student.academicStandings[0];
    const classification = standing?.degreeClassification || 'First Class Honours';

    // Build SHA-256 tamper-evident cryptographic signature
    const secret = process.env.NEXTAUTH_SECRET || 'proxima-tims-degree-secret-2026';
    const rawCertificateData = `${student.matricNumber}:${student.program.code}:${classification}:${certNum}`;
    const certHash = crypto.createHmac('sha256', secret).update(rawCertificateData).digest('hex');

    const verifyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify/degree?cert=${certNum}`;
    const qrCode = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: { dark: '#0b132b', light: '#ffffff' },
    });

    const updated = await prisma.graduationClearance.update({
      where: { id: clearanceId },
      data: {
        certificateIssued: true,
        certificateNumber: certNum,
        certificateQrCode: qrCode,
        certificateHash: certHash,
        issuedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/tertiary/clearance');
    revalidatePath('/dashboard/tertiary/certificate');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function verifyDegreeCertificateAction(certificateNumber: string) {
  try {
    const clearance = await prisma.graduationClearance.findUnique({
      where: { certificateNumber: certificateNumber.trim() },
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            program: true,
            academicStandings: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!clearance || !clearance.certificateIssued) {
      return { success: false, error: 'No authentic degree certificate found matching this credential identifier.' };
    }

    const student = clearance.student;
    const standing = student.academicStandings[0];
    const classification = standing?.degreeClassification || 'Graduated in Good Standing';

    return {
      success: true,
      data: {
        candidateName: `${student.user.firstName} ${student.user.lastName}`,
        matricNumber: student.matricNumber,
        programName: student.program.name,
        degreeClassification: classification,
        academicSession: clearance.academicSession,
        certificateNumber: clearance.certificateNumber,
        certificateHash: clearance.certificateHash,
        issuedAt: clearance.issuedAt,
        isAuthentic: true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
