import { paymentRepository } from '../dal/payment-repository';

export class PaymentService {
  async recordPayment(data: {
    userId: string;
    invoiceId: string;
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: any;
    notes?: string;
  }) {
    const { userId, invoiceId, amountPaid, paymentDate, paymentMethod, notes } = data;

    const invoice = await paymentRepository.getInvoiceById(invoiceId);
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'PAID') throw new Error('This invoice has already been fully paid.');

    const effectivePaid = Math.min(amountPaid, invoice.balance);
    const newAmountPaid = invoice.amountPaid + effectivePaid;
    const newBalance = invoice.amount - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    const overpayment = amountPaid - invoice.balance;

    await paymentRepository.recordPaymentTx(
      invoiceId,
      { amountPaid: newAmountPaid, balance: newBalance, status: newStatus },
      {
        invoiceId,
        amount: effectivePaid,
        method: paymentMethod,
        reference: notes,
        date: paymentDate,
        loggedById: userId,
      }
    );

    return { effectivePaid, overpayment };
  }

  async deletePayment(paymentId: string) {
    const receipt = await paymentRepository.getPaymentReceiptById(paymentId);
    if (!receipt) throw new Error('Payment record not found.');

    const invoice = await paymentRepository.getInvoiceById(receipt.invoiceId);
    if (!invoice) {
      await paymentRepository.deletePaymentReceiptOnly(paymentId);
      return { orphaned: true };
    }

    const newAmountPaid = Math.max(0, invoice.amountPaid - receipt.amount);
    const newBalance = invoice.amount - newAmountPaid;
    const newStatus = newAmountPaid <= 0 ? 'UNPAID' : 'PARTIALLY_PAID';

    await paymentRepository.deletePaymentTx(paymentId, invoice.id, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
    });

    return { orphaned: false };
  }
}
export const paymentService = new PaymentService();
