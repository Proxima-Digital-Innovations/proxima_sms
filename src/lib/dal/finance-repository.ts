import { prisma } from "@/lib/prisma";


export class FinanceRepository {
  /**
   * Retrieves all invoices for a given term, with optional class filtering.
   */
  static async getInvoicesByTerm(termId: string, classId?: string) {
    const whereClause: any = { termId };
    if (classId) {
      whereClause.student = { classId };
    }

    return prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: { select: { studentId: true, firstName: true, lastName: true, class: { select: { name: true } } } },
        receipts: { orderBy: { date: 'desc' } }
      },
      orderBy: [
        { status: 'desc' }, // UNPAID > PARTIAL > PAID
        { student: { lastName: 'asc' } }
      ]
    });
  }

  /**
   * Retrieves an invoice by ID.
   */
  static async getInvoiceById(invoiceId: string) {
    return prisma.invoice.findUnique({ where: { id: invoiceId } });
  }

  /**
   * Bulk creates invoices.
   */
  static async createInvoices(data: any[]) {
    return prisma.invoice.createMany({ data });
  }

  /**
   * Finds existing invoices to prevent duplicates during bulk generation.
   */
  static async getExistingInvoices(termId: string, description: string, studentIds: string[]) {
    return prisma.invoice.findMany({
      where: { termId, description, studentId: { in: studentIds } }
    });
  }

  /**
   * Updates an invoice and creates a receipt in a single transaction.
   */
  static async applyPaymentTransaction(
    invoiceId: string,
    newAmountPaid: number,
    newBalance: number,
    newStatus: string,
    paymentAmount: number,
    method: string,
    accountantId: string,
    reference?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        }
      });

      const receipt = await tx.paymentReceipt.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          method,
          reference,
          loggedById: accountantId
        }
      });

      return { invoice: updatedInvoice, receipt };
    });
  }
}
