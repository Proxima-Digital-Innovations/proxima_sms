'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getStudentTertiaryInvoices(studentProfileId?: string) {
  try {
    const where: any = {};
    if (studentProfileId && studentProfileId !== 'ALL') {
      where.studentId = studentProfileId;
    }

    const invoices = await prisma.tertiaryInvoice.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            program: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: invoices };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTertiaryFeeStructuresAction() {
  try {
    const structures = await prisma.tertiaryFeeStructure.findMany({
      include: {
        program: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: structures };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveTertiaryFeeStructureAction(data: {
  programId: string;
  academicSession: string;
  semester?: number;
  level?: number;
  tuitionFee?: number;
  tuitionAmount?: number;
  acceptanceFee?: number;
  labFee?: number;
  ictFee?: number;
}) {
  try {
    const semester = Number(data.semester || 1);
    const tuition = Number(data.tuitionFee ?? data.tuitionAmount ?? 0);
    const acceptance = Number(data.acceptanceFee || 0);
    const lab = Number(data.labFee || 0);
    const ict = Number(data.ictFee || 0);
    const totalAmount = tuition + acceptance + lab + ict;

    const record = await prisma.tertiaryFeeStructure.upsert({
      where: {
        programId_academicSession_semester: {
          programId: data.programId,
          academicSession: data.academicSession,
          semester,
        },
      },
      create: {
        programId: data.programId,
        academicSession: data.academicSession,
        semester,
        tuitionFee: tuition,
        acceptanceFee: acceptance,
        labFee: lab,
        ictFee: ict,
        totalAmount,
      },
      update: {
        tuitionFee: tuition,
        acceptanceFee: acceptance,
        labFee: lab,
        ictFee: ict,
        totalAmount,
      },
    });

    revalidatePath('/dashboard/tertiary/payments');
    return { success: true, data: record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateTertiaryInvoice(studentProfileId: string, academicSession: string, semester: number) {
  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { program: true },
    });

    if (!student) throw new Error('Student profile not found.');

    // Look up fee structure or use standard default
    const feeStructure = await prisma.tertiaryFeeStructure.findUnique({
      where: {
        programId_academicSession_semester: {
          programId: student.programId,
          academicSession,
          semester,
        },
      },
    });

    const totalAmount = feeStructure ? feeStructure.totalAmount : 185000.0;

    const invoice = await prisma.tertiaryInvoice.upsert({
      where: {
        studentId_academicSession_semester: {
          studentId: studentProfileId,
          academicSession,
          semester,
        },
      },
      create: {
        studentId: studentProfileId,
        academicSession,
        semester,
        totalAmount,
        amountPaid: 0.0,
        balanceDue: totalAmount,
        status: 'UNPAID',
      },
      update: {},
    });

    revalidatePath('/dashboard/tertiary/payments');
    return { success: true, data: invoice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordTertiaryPaymentAction(data: {
  invoiceId: string;
  amountPaid: number;
  paymentMethod: string;
  paymentReference?: string;
}) {
  try {
    const invoice = await prisma.tertiaryInvoice.findUnique({
      where: { id: data.invoiceId },
    });

    if (!invoice) throw new Error('Invoice not found.');

    const newAmountPaid = invoice.amountPaid + data.amountPaid;
    const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
    const newStatus = newBalanceDue === 0 ? 'PAID' : 'PARTIALLY_PAID';
    const reference = data.paymentReference || `PAY-${Date.now().toString().slice(-8)}`;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedInv = await tx.tertiaryInvoice.update({
        where: { id: data.invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          status: newStatus,
          paymentMethod: data.paymentMethod,
          paymentReference: reference,
          paymentDate: new Date(),
        },
      });

      // If at least 50% tuition is paid, grant Bursary clearance for course registration & exam docket!
      const paymentRatio = newAmountPaid / invoice.totalAmount;
      if (paymentRatio >= 0.5) {
        await tx.semesterRegistration.updateMany({
          where: {
            studentId: invoice.studentId,
            academicSession: invoice.academicSession,
            semester: invoice.semester,
          },
          data: {
            isBursaryCleared: true,
            bursaryClearedAt: new Date(),
            bursaryReference: reference,
          },
        });
      }

      return updatedInv;
    });

    revalidatePath('/dashboard/tertiary/payments');
    revalidatePath('/dashboard/tertiary/registration');
    revalidatePath('/dashboard/tertiary/docket');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
