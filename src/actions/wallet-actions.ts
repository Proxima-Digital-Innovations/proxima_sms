'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { parentWalletService } from '@/lib/services/parent-wallet-service';
import { paystackService } from '@/lib/services/paystack-service';
import { FinancialSecurity } from '@/lib/security/financial-security';
import { z } from 'zod';

const TopupSchema = z.object({
  amount: z.number().positive().min(100).max(50_000_000),
  callbackUrl: z.string().url().optional(),
});

const TransferArrivalSchema = z.object({
  amount: z.number().positive().min(100).max(50_000_000),
  payerName: z.string().max(100).optional(),
});

const PayInvoiceSchema = z.object({
  invoiceId: z.string().min(5),
  amount: z.number().positive().optional(),
});

/**
 * Retrieves the current parent user's wallet and their wards' pending invoices
 */
export async function getParentWalletDetails() {
  try {
    const session = await auth();
    let userId = session?.user?.id;
    let userEmail = session?.user?.email;

    // Fallback in local development if session not yet established
    if (!userId && process.env.NODE_ENV !== 'production') {
      const demoUser = await prisma.user.findFirst({
        where: { role: 'PARENT' },
      });
      if (demoUser) {
        userId = demoUser.id;
        userEmail = demoUser.email;
      }
    }

    if (!userId) {
      return { success: false, error: 'User is not authenticated' };
    }

    const wallet = await parentWalletService.getOrCreateWallet(userId);

    // Retrieve pending invoices for the parent's linked wards
    const guardians = await prisma.guardian.findMany({
      where: userEmail ? { email: userEmail } : { userId },
      include: {
        student: {
          include: {
            class: true,
            invoices: {
              where: { balance: { gt: 0 } },
              orderBy: { dueDate: 'asc' },
              include: { term: true },
            },
          },
        },
      },
    });

    const pendingInvoices = guardians.flatMap((g) =>
      g.student.invoices.map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        amountPaid: inv.amountPaid,
        balance: inv.balance,
        dueDate: inv.dueDate,
        status: inv.status,
        description: inv.description,
        termName: inv.term?.name || 'Current Term',
        studentName: `${g.student.firstName} ${g.student.lastName}`,
        studentId: g.student.studentId,
        className: g.student.class?.name || 'Assigned Class',
      }))
    );

    return {
      success: true,
      wallet,
      pendingInvoices,
    };
  } catch (error: any) {
    console.error('Error in getParentWalletDetails:', error);
    return { success: false, error: error.message || 'Failed to retrieve wallet details.' };
  }
}

/**
 * Initiates online top-up of the parent's wallet via Paystack
 */
export async function initiateWalletTopupOnline(data: {
  amount: number;
  callbackUrl?: string;
}) {
  try {
    const validated = TopupSchema.parse(data);
    const validAmount = FinancialSecurity.validateMonetaryAmount(validated.amount, 100);

    const session = await auth();
    let userId = session?.user?.id;
    let userEmail = session?.user?.email || 'parent@proximahub.com';
    let userName = session?.user?.name || 'Parent User';

    if (!userId && process.env.NODE_ENV !== 'production') {
      const demoUser = await prisma.user.findFirst({ where: { role: 'PARENT' } });
      if (demoUser) {
        userId = demoUser.id;
        userEmail = demoUser.email;
        userName = `${demoUser.firstName} ${demoUser.lastName}`;
      }
    }

    if (!userId) return { success: false, error: 'Unauthorized: Active parent session required.' };

    const topupReference = `WAL_TOP_${userId.slice(-6)}_${Date.now()}`;

    const paystackRes = await paystackService.initializePayment({
      email: userEmail,
      amount: validAmount,
      reference: topupReference,
      callbackUrl: validated.callbackUrl || 'http://localhost:3000/dashboard/parent/wallet',
      metadata: {
        type: 'WALLET_TOPUP',
        userId,
        userName,
      },
    });

    return {
      success: true,
      authorizationUrl: paystackRes.authorizationUrl,
      reference: topupReference,
    };
  } catch (error: any) {
    console.error('Error in initiateWalletTopupOnline:', error);
    return { success: false, error: error.message || 'Failed to initialize wallet funding.' };
  }
}

/**
 * Confirms or simulates instant bank transfer arrival into the parent's Dedicated Virtual Account
 */
export async function confirmWalletTransferArrival(data: {
  amount: number;
  payerName?: string;
}) {
  try {
    const validated = TransferArrivalSchema.parse(data);
    const validAmount = FinancialSecurity.validateMonetaryAmount(validated.amount, 100);

    const session = await auth();
    let userId = session?.user?.id;

    if (!userId && process.env.NODE_ENV !== 'production') {
      const demoUser = await prisma.user.findFirst({ where: { role: 'PARENT' } });
      if (demoUser) userId = demoUser.id;
    }

    if (!userId) return { success: false, error: 'Unauthorized: Active parent session required.' };

    const txnRef = `WAL_BNK_${userId.slice(-6)}_${Date.now()}`;

    const result = await parentWalletService.creditWallet({
      userId,
      amount: validAmount,
      reference: txnRef,
      category: 'WALLET_FUNDING',
      description: `Automated Bank Transfer into Personal DVA by ${validated.payerName || 'Parent'}`,
      metadata: { method: 'VIRTUAL_BANK_TRANSFER' },
    });

    try {
      revalidatePath('/dashboard/parent/wallet');
      revalidatePath('/dashboard/pay');
      revalidatePath('/dashboard');
      revalidatePath('/parent/dashboard');
    } catch {}

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('Error confirming wallet transfer arrival:', error);
    return { success: false, error: error.message || 'Failed to process wallet credit.' };
  }
}

/**
 * Pays a tuition invoice directly using the parent's available wallet balance
 */
export async function payInvoiceWithWallet(invoiceId: string, amount?: number) {
  try {
    const validated = PayInvoiceSchema.parse({ invoiceId, amount });

    const session = await auth();
    let userId = session?.user?.id;

    if (!userId && process.env.NODE_ENV !== 'production') {
      const demoUser = await prisma.user.findFirst({ where: { role: 'PARENT' } });
      if (demoUser) userId = demoUser.id;
    }

    if (!userId) return { success: false, error: 'Unauthorized: Active parent session required.' };

    const result = await parentWalletService.payInvoiceFromWallet({
      userId,
      invoiceId: validated.invoiceId,
      amount: validated.amount,
    });

    try {
      revalidatePath('/dashboard/parent/wallet');
      revalidatePath('/dashboard/pay');
      revalidatePath('/dashboard');
      revalidatePath('/parent/dashboard');
      revalidatePath('/dashboard/finance/invoices');
      revalidatePath('/dashboard/finance/payments');
    } catch {}

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    console.error('Error paying invoice from wallet:', error);
    return { success: false, error: error.message || 'Payment from wallet failed.' };
  }
}
