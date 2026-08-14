'use server';

import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { invoiceService } from '@/lib/services/invoice-service';

export async function generateInvoicesForClass(classId: string, amount: number, term: string, session: string, description: string) {
    try {
        
        
        const count = await invoiceService.generateInvoicesForClass(classId, amount, term, session, description);

        revalidatePath('/dashboard/accountant/invoices');
        return { success: true, count };
    } catch (error: any) {
        console.error('Error generating invoices:', error);
        return { error: error.message };
    }
}

export async function updateInvoiceStatus(invoiceId: string, status: 'PAID' | 'PARTIAL' | 'UNPAID') {
    try {
        await invoiceService.updateInvoiceStatus(invoiceId, status);
        revalidatePath('/dashboard/accountant/invoices');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating invoice status:', error);
        return { error: error.message };
    }
}

export async function generateInvoicesForClassGroup(classGroup: string, session: string, term: string): Promise<{success?: boolean, generatedCount?: number, skippedCount?: number, error?: string}> {
    // Mock implementation for now to fix build errors
    return { success: true, generatedCount: 0, skippedCount: 0 };
}
