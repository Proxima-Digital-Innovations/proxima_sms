'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { paystackService } from '@/lib/services/paystack-service';
import { auth } from '@/auth';

const initPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  amount: z.number().positive('Amount must be positive'),
  email: z.string().email('Valid email is required'),
  studentName: z.string().optional(),
  callbackUrl: z.string().optional(),
});

/**
 * Initializes a Paystack checkout transaction
 */
export async function initiatePaystackPayment(values: z.infer<typeof initPaymentSchema>) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const parsed = initPaymentSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid parameters' };
    }

    const result = await paystackService.initializePayment({
      ...parsed.data,
      userId,
    });

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('Error in initiatePaystackPayment:', error);
    return { success: false, error: error.message || 'Payment initialization failed.' };
  }
}

/**
 * Verifies a completed Paystack transaction reference and reconciles invoice
 */
export async function verifyPaystackReference(reference: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!reference || typeof reference !== 'string') {
      return { success: false, error: 'Transaction reference is missing.' };
    }

    const result = await paystackService.verifyPayment(reference, userId);

    try {
      revalidatePath('/dashboard/pay');
      revalidatePath('/dashboard/finance/invoices');
      revalidatePath('/dashboard/finance/payments');
      revalidatePath('/parent/dashboard');
    } catch {}

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('Error in verifyPaystackReference:', error);
    return { success: false, error: error.message || 'Payment verification failed.' };
  }
}

/**
 * Fetches all pending and paid invoices for the current parent's children
 */
export async function getParentFeeInvoices(selectedStudentId?: string) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;
    const userId = session?.user?.id;

    let studentIds: string[] = [];

    // Find children linked to parent
    if (userEmail || userId) {
      const guardians = await prisma.guardian.findMany({
        where: {
          OR: [
            ...(userEmail ? [{ email: userEmail }] : []),
            ...(userId ? [{ userId }] : []),
          ],
        },
        select: { studentId: true },
      });
      studentIds = guardians.map(g => g.studentId);
    }

    // Fallback if demo or preview mode: pick first 3 active students
    if (studentIds.length === 0) {
      const fallback = await prisma.student.findMany({
        take: 3,
        where: { status: { in: ['Active', 'ACTIVE'] } },
        select: { id: true },
      });
      studentIds = fallback.map(s => s.id);
    }

    const filterStudentId = selectedStudentId && studentIds.includes(selectedStudentId)
      ? selectedStudentId
      : undefined;

    const [wards, invoices] = await Promise.all([
      prisma.student.findMany({
        where: { id: { in: studentIds } },
        include: { class: true },
      }),
      prisma.invoice.findMany({
        where: {
          studentId: filterStudentId ? filterStudentId : { in: studentIds },
        },
        include: {
          student: { include: { class: true } },
          term: true,
          receipts: { orderBy: { date: 'desc' } },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      }),
    ]);

    const totalBilled = invoices.reduce((acc, inv) => acc + inv.amount, 0);
    const totalPaid = invoices.reduce((acc, inv) => acc + inv.amountPaid, 0);
    const outstanding = Math.max(0, totalBilled - totalPaid);

    const isPaystackConfigured = !!process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.includes('placeholder');

    return {
      success: true,
      wards,
      invoices,
      stats: {
        totalInvoices: invoices.length,
        totalBilled,
        totalPaid,
        outstanding,
      },
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder',
      isLiveConfigured: isPaystackConfigured,
    };
  } catch (error: any) {
    console.error('Error in getParentFeeInvoices:', error);
    return {
      success: false,
      error: error.message,
      wards: [],
      invoices: [],
      stats: { totalInvoices: 0, totalBilled: 0, totalPaid: 0, outstanding: 0 },
      isLiveConfigured: false,
    };
  }
}
