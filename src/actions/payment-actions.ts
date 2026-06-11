'use server';

/**
 * Payment server actions.
 * All database access is performed via Prisma — no Firebase stubs or dbService.
 *
 * Prisma models used:
 *   Invoice        – school fee invoices (amount, amountPaid, balance, status …)
 *   PaymentReceipt – individual payment records linked to an Invoice
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─── Validation Schema ────────────────────────────────────────────────────────

/**
 * Zod schema for the recordPayment action input.
 * `userId` is the Prisma cuid of the staff member recording the payment.
 */
const paymentSchema = z.object({
  invoiceId:     z.string().min(1, 'Invoice ID is required'),
  amountPaid:    z.coerce.number().positive('Payment amount must be positive'),
  paymentDate:   z.date({ required_error: 'Payment date is required' }),
  paymentMethod: z.enum(['Bank Transfer', 'POS', 'Cash']),
  notes:         z.string().optional(),
  userId:        z.string().min(1, 'User ID is required'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Revalidate the accountant dashboard pages that display invoice/payment data. */
function revalidateAccountant() {
  revalidatePath('/dashboard/accountant/payments');
  revalidatePath('/dashboard/accountant/invoices');
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Record a payment against an existing invoice.
 *
 * Steps:
 *  1. Validate the input with Zod.
 *  2. Fetch the invoice by its Prisma cuid.
 *  3. Calculate new amountPaid / balance / status.
 *  4. Update the invoice in a single Prisma transaction.
 *  5. Create a PaymentReceipt row linked to the invoice.
 *  6. Revalidate cached pages.
 */
export async function recordPayment(values: z.infer<typeof paymentSchema>) {
  try {
    // --- 1. Validate input --------------------------------------------------
    const parsed = paymentSchema.safeParse(values);
    if (!parsed.success) {
      return { error: 'Invalid data provided.' };
    }

    const { userId, invoiceId, amountPaid, paymentDate, paymentMethod, notes } =
      parsed.data;

    // --- 2. Fetch invoice ---------------------------------------------------
    // invoiceId here is the Prisma cuid (primary key), not the display code
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { error: 'Invoice not found.' };
    }

    if (invoice.status === 'PAID') {
      return { error: 'This invoice has already been fully paid.' };
    }

    // --- 3. Calculate new totals -------------------------------------------
    // Clamp amountPaid so we never record more than the outstanding balance
    const effectivePaid = Math.min(amountPaid, invoice.balance);

    const newAmountPaid = invoice.amountPaid + effectivePaid;
    // balance is stored as a real column – update it manually
    const newBalance    = invoice.amount - newAmountPaid;
    const newStatus     = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const overpayment   = amountPaid - invoice.balance; // positive when client over-pays

    // --- 4 & 5. Transactionally update invoice + create receipt ------------
    await prisma.$transaction(async (tx) => {
      // Update the invoice totals and status
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balance:    newBalance,
          status:     newStatus,
        },
      });

      // Create a PaymentReceipt record
      await tx.paymentReceipt.create({
        data: {
          schoolId:   invoice.schoolId,
          invoiceId,
          amount:     effectivePaid,  // the amount that actually reduced the balance
          method:     paymentMethod,
          reference:  notes,          // use `notes` as the receipt reference/memo
          date:       paymentDate,
          loggedById: userId,
        },
      });
    });

    // --- 6. Revalidate -------------------------------------------------------
    revalidateAccountant();

    // Build a user-friendly success message
    let successMessage = `Payment of ${effectivePaid.toLocaleString()} recorded successfully.`;
    if (overpayment > 0) {
      successMessage += ` Note: overpayment of ${overpayment.toLocaleString()} was NOT applied (balance cannot go negative).`;
    }

    return { success: true, message: successMessage };
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

/**
 * Delete a payment receipt and reverse its amounts on the parent invoice.
 *
 * Steps:
 *  1. Find the PaymentReceipt by its Prisma cuid.
 *  2. Find the related Invoice.
 *  3. Reverse the paid amount on the invoice (amountPaid − receipt.amount).
 *  4. Recalculate balance and status.
 *  5. Delete the receipt and update the invoice in a single transaction.
 */
export async function deletePayment(paymentId: string) {
  try {
    // --- 1. Find the receipt ------------------------------------------------
    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id: paymentId },
    });

    if (!receipt) {
      return { error: 'Payment record not found.' };
    }

    // --- 2. Find the related invoice ----------------------------------------
    const invoice = await prisma.invoice.findUnique({
      where: { id: receipt.invoiceId },
    });

    if (!invoice) {
      // Receipt exists but invoice is gone – delete the orphan receipt only
      await prisma.paymentReceipt.delete({ where: { id: paymentId } });
      revalidateAccountant();
      return {
        success: true,
        message:
          'Payment receipt deleted, but the associated invoice could not be found to reverse amounts.',
      };
    }

    // --- 3 & 4. Calculate reversed totals -----------------------------------
    const newAmountPaid = Math.max(0, invoice.amountPaid - receipt.amount);
    // Recalculate balance from scratch to avoid accumulated rounding drift
    const newBalance    = invoice.amount - newAmountPaid;
    const newStatus     = newAmountPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID';

    // --- 5. Transaction: delete receipt + update invoice -------------------
    await prisma.$transaction(async (tx) => {
      // Delete the payment receipt first
      await tx.paymentReceipt.delete({ where: { id: paymentId } });

      // Reverse the amounts on the invoice
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          balance:    newBalance,
          status:     newStatus,
        },
      });
    });

    revalidateAccountant();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return {
      error:
        error.message ||
        'An unexpected error occurred while deleting the payment.',
    };
  }
}
