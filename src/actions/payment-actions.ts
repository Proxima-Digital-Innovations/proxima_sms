'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { paymentService } from '@/lib/services/payment-service';

const paymentSchema = z.object({
  invoiceId:     z.string().min(1, 'Invoice ID is required'),
  amountPaid:    z.coerce.number().positive('Payment amount must be positive'),
  paymentDate:   z.date({ required_error: 'Payment date is required' }),
  paymentMethod: z.enum(['Bank Transfer', 'POS', 'Cash']),
  notes:         z.string().optional(),
  userId:        z.string().min(1, 'User ID is required'),
});

function revalidateAccountant() {
  revalidatePath('/dashboard/accountant/payments');
  revalidatePath('/dashboard/accountant/invoices');
}

export async function recordPayment(values: z.infer<typeof paymentSchema>) {
  try {
    const parsed = paymentSchema.safeParse(values);
    if (!parsed.success) {
      return { error: 'Invalid data provided.' };
    }

    const { effectivePaid, overpayment } = await paymentService.recordPayment(parsed.data);

    revalidateAccountant();

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

export async function deletePayment(paymentId: string) {
  try {
    const result = await paymentService.deletePayment(paymentId);
    
    revalidateAccountant();
    
    if (result.orphaned) {
      return {
        success: true,
        message: 'Payment receipt deleted, but the associated invoice could not be found to reverse amounts.',
      };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return { error: error.message || 'An unexpected error occurred while deleting the payment.' };
  }
}
