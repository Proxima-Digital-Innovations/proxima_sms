import { prisma } from '@/lib/prisma';

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
      await tx.paymentReceipt.create({
        data: receiptData,
      });
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
