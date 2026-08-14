import { FinanceRepository } from '../dal/finance-repository';
import { prisma } from "@/lib/prisma"; // Ideally we abstract all prisma calls, but keeping this simple for user lookup

export class FinanceService {
  /**
   * Enforces business rules for generating class tuition invoices.
   */
  static async generateClassTuition(termId: string, classId: string, amount: number, description: string, dueDate: Date, ) {
    // 1. Get active students in class
    const students = await prisma.student.findMany({
      where: { classId, status: "Active" }
    });

    if (students.length === 0) {
      throw new Error("No active students in this class.");
    }

    // 2. Filter out students who already have this specific invoice (Business Rule: Prevent duplicates)
    const existingInvoices = await FinanceRepository.getExistingInvoices(termId, description, students.map(s => s.id));
    const existingStudentIds = existingInvoices.map(i => i.studentId);
    
    const studentsToInvoice = students.filter(s => !existingStudentIds.includes(s.id));

    if (studentsToInvoice.length === 0) {
      throw new Error("All students already have this invoice.");
    }

    // 3. Prepare data for DAL
    const invoiceData = studentsToInvoice.map(s => ({
      studentId: s.id,
      termId,
      amount,
      balance: amount,
      description,
      dueDate,
    }));

    await FinanceRepository.createInvoices(invoiceData);
    return studentsToInvoice.length;
  }

  /**
   * Enforces business rules around logging a payment against an invoice.
   */
  static async processPayment(invoiceId: string, paymentAmount: number, method: string, reference?: string) {
    // 1. Identify authorized accountant
    const accountant = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!accountant) {
      throw new Error("No authorized accountant found for this operation.");
    }

    // 2. Validate Invoice
    const invoice = await FinanceRepository.getInvoiceById(invoiceId);
    if (!invoice) throw new Error("Invoice not found.");

    // 3. Apply Payment Rules
    if (invoice.balance <= 0) throw new Error("Invoice is already fully paid.");
    if (paymentAmount <= 0) throw new Error("Payment must be greater than zero.");
    if (paymentAmount > invoice.balance) throw new Error("Payment cannot exceed outstanding balance.");

    // 4. Calculate new state
    const newAmountPaid = invoice.amountPaid + paymentAmount;
    const newBalance = invoice.amount - newAmountPaid;
    let newStatus = invoice.status;
    
    if (newBalance <= 0) {
      newStatus = "PAID";
    } else if (newAmountPaid > 0) {
      newStatus = "PARTIAL";
    }

    // 5. Commit via DAL
    return FinanceRepository.applyPaymentTransaction(
      invoiceId, 
      newAmountPaid, 
      newBalance, 
      newStatus, 
      paymentAmount, 
      method, 
      accountant.id, 
      reference
    );
  }
}
