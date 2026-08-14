import { invoiceRepository } from '../dal/invoice-repository';

export class InvoiceService {
  async generateInvoicesForClass(classId: string, amount: number, term: string, session: string, description: string) {
    const activeTerm = await invoiceRepository.getActiveTerm();
    if (!activeTerm) {
      throw new Error('No active academic term found.');
    }

    const students = await invoiceRepository.getActiveStudentsInClass(classId);
    if (students.length === 0) {
      throw new Error('No active students found in this class.');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoicesData = students.map((student: any) => ({
      studentId: student.id,
      termId: activeTerm.id,
      amount,
      amountPaid: 0,
      balance: amount,
      dueDate,
      status: 'UNPAID',
      description
    }));

    const results = await invoiceRepository.createInvoicesBulk(invoicesData);
    return results.length;
  }

  async updateInvoiceStatus(invoiceId: string, status: 'PAID' | 'PARTIAL' | 'UNPAID') {
    await invoiceRepository.updateInvoiceStatus(invoiceId, status);
  }
}
export const invoiceService = new InvoiceService();
