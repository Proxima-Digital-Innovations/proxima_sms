import { prisma } from '@/lib/prisma';
import { ledgerService } from '@/lib/services/ledger-service';

export class PaymentRepository {
  async getInvoiceById(id: string) {
    return prisma.invoice.findUnique({ where: { id } });
  }

  async getPaymentReceiptById(id: string) {
    return prisma.paymentReceipt.findUnique({ where: { id } });
  }
  
  async deletePaymentReceiptOnly(id: string) {
    return prisma.paymentReceipt.delete({ where: { id } });
  }

  async recordPaymentTx(invoiceId: string, invoiceData: any, receiptData: any) {
    return prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: invoiceData,
      });
      const receipt = await tx.paymentReceipt.create({
        data: receiptData,
      });

      // Automatically post double-entry Journal Entry to General Ledger
      await ledgerService.recordPaymentGlEntry(tx, {
        amount: receiptData.amount,
        reference: receiptData.reference || `REC-${receipt.id.slice(-6).toUpperCase()}`,
        description: `Tuition collection via ${receiptData.method || 'Online Deposit'} (${receiptData.payerName || 'Parent'})`,
        recordedById: receiptData.loggedById,
        method: receiptData.method,
        date: receiptData.date || new Date(),
      });

      return receipt;
    });
  }

  async deletePaymentTx(paymentId: string, invoiceId: string, invoiceData: any) {
    return prisma.$transaction(async (tx) => {
      await tx.paymentReceipt.delete({ where: { id: paymentId } });
      await tx.invoice.update({
        where: { id: invoiceId },
        data: invoiceData,
      });
    });
  }
}
export const paymentRepository = new PaymentRepository();
