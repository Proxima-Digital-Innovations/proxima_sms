'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { betastackService } from '@/lib/services/betastack-service';
import { auth } from '@/auth';

/**
 * Generates or retrieves the dedicated Virtual Bank Account for an invoice
 */
export async function getInvoiceVirtualAccount(invoiceId: string) {
  try {
    if (!invoiceId) {
      return { success: false, error: 'Invoice ID is required' };
    }

    const virtualAccount = await betastackService.getOrCreateVirtualAccount(invoiceId);

    return {
      success: true,
      virtualAccount,
    };
  } catch (error: any) {
    console.error('Error generating virtual account:', error);
    return { success: false, error: error.message || 'Failed to generate bank account details.' };
  }
}

/**
 * Checks or simulates instant transfer arrival for an invoice
 */
export async function confirmBankTransferArrival(params: {
  invoiceId: string;
  accountNumber: string;
  amountTransferred?: number;
  payerName?: string;
}) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const { invoiceId, accountNumber, amountTransferred, payerName } = params;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });

    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'PAID') {
      return {
        success: true,
        alreadyProcessed: true,
        message: 'This invoice has already been fully settled.',
      };
    }

    const finalAmount = amountTransferred && amountTransferred > 0 
      ? Math.min(amountTransferred, invoice.balance)
      : invoice.balance;

    const txnRef = `ZAIN_DEP_${invoice.id.slice(-6)}_${Date.now()}`;

    const result = await betastackService.processDepositSuccess({
      accountNumber,
      depositedAmount: finalAmount,
      txnRef,
      payerName: payerName || `${invoice.student.firstName}'s Guardian`,
      recordedByUserId: userId,
    });

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
    console.error('Error in confirmBankTransferArrival:', error);
    return { success: false, error: error.message || 'Failed to confirm bank transfer.' };
  }
}

/**
 * Allows a parent to submit manual proof of direct transfer to the school's primary physical bank account
 */
export async function submitManualOfflineTransferProof(data: {
  invoiceId: string;
  amount: number;
  transferDate: string;
  bankName: string;
  senderAccountName: string;
  transactionReference: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { student: true },
    });

    if (!invoice) throw new Error('Invoice not found.');

    // Create a pending PaymentReceipt for accountant verification
    const pendingReceipt = await prisma.paymentReceipt.create({
      data: {
        invoiceId: invoice.id,
        amount: data.amount,
        method: `MANUAL_TRANSFER (${data.bankName})`,
        reference: data.transactionReference || `TRF_${Date.now()}`,
        date: new Date(data.transferDate || new Date()),
        status: 'PENDING', // PENDING verification by bursary
        payerName: data.senderAccountName || `${invoice.student.firstName}'s Guardian`,
        loggedById: userId || invoice.studentId,
      },
    });

    try {
      revalidatePath('/dashboard/pay');
      revalidatePath('/dashboard/finance/payments');
      revalidatePath('/dashboard/finance/invoices');
    } catch {}

    return {
      success: true,
      receiptId: pendingReceipt.id,
      message: 'Transfer proof submitted successfully. Your payment will reflect once verified by the school bursar.',
    };
  } catch (error: any) {
    console.error('Error submitting offline transfer proof:', error);
    return { success: false, error: error.message || 'Failed to submit transfer proof.' };
  }
}
