'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { FinanceRepository } from "@/lib/dal/finance-repository";
import { FinanceService } from "@/lib/services/finance-service";
import { requireFinanceAccess } from "@/lib/guards";
import { z } from "zod";

/**
 * Fetch all invoices for an active term, sorted by status (UNPAID first)
 */
export async function getTermInvoices(termId: string, classId?: string) {
  try {
    await requireFinanceAccess();
    let actualTermId = termId;

    if (termId === 'current_term_placeholder') {
      const { prisma } = await import('@/lib/prisma');
      const currentTerm = await prisma.term.findFirst({
        where: { isActive: true },
        select: { id: true }
      });
      if (!currentTerm) {
         return { success: true, invoices: [] };
      }
      actualTermId = currentTerm.id;
    }

    const invoices = await FinanceRepository.getInvoicesByTerm(actualTermId, classId);
    
    // Map data to match the UI expectations (student.user.name instead of student.firstName)
    const mappedInvoices = invoices.map((inv: any) => ({
      ...inv,
      student: {
        ...inv.student,
        user: { name: `${inv.student.firstName} ${inv.student.lastName}` }
      }
    }));
    
    return { success: true, invoices: mappedInvoices };
  } catch (error: any) {
    return { success: false, invoices: [], message: error.message };
  }
}

const generateInvoicesSchema = z.object({
  termId: z.string().min(1),
  classId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.coerce.date(),
});

/**
 * Bulk generate tuition invoices for a specific class
 */
export async function generateClassInvoices(termId: string, classId: string, amount: number, description: string, dueDate: Date) {
  try {
    
    await requireFinanceAccess();

    const validated = generateInvoicesSchema.parse({ termId, classId, amount, description, dueDate });
    const count = await FinanceService.generateClassTuition(validated.termId, validated.classId, validated.amount, validated.description, validated.dueDate, );

    revalidatePath("/dashboard/finance/invoices");
    return { success: true, count };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: error.message };
  }
}

const logPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  paymentAmount: z.number().positive("Payment amount must be positive"),
  method: z.enum(["CASH", "TRANSFER", "CARD", "CHEQUE"]),
  reference: z.string().optional(),
});

/**
 * Log a partial or full payment against an invoice
 */
export async function logPayment(invoiceId: string, paymentAmount: number, method: string, reference?: string) {
  try {
    
    await requireFinanceAccess();

    const validated = logPaymentSchema.parse({ invoiceId, paymentAmount, method, reference });
    const result = await FinanceService.processPayment(validated.invoiceId, validated.paymentAmount, validated.method, validated.reference);
    return { success: true, invoice: result.invoice, receipt: result.receipt };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors[0].message };
    }
    return { success: false, message: error.message };
  } finally {
    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance/invoices");
  }
}

/**
 * Fetch financial report data by date range
 */
export async function getFinancialReportData(fromDate: Date, toDate: Date) {
  try {
    await requireFinanceAccess();
    const { prisma } = await import("@/lib/prisma");

    const [receipts, expenses] = await Promise.all([
      prisma.paymentReceipt.findMany({
        where: {
          date: { gte: fromDate, lt: toDate },
        },
        include: {
          invoice: {
            include: {
              student: true
            }
          }
        },
        orderBy: { date: 'desc' }
      }),
      prisma.expense.findMany({
        where: {
          date: { gte: fromDate, lt: toDate },
        },
        orderBy: { date: 'desc' }
      })
    ]);

    const mappedPayments = receipts.map(r => ({
      id: r.id,
      amountPaid: r.amount,
      paymentDate: { seconds: Math.floor(r.date.getTime() / 1000) }, // Mock Firebase timestamp
      studentName: r.invoice?.student ? `${r.invoice.student.firstName} ${r.invoice.student.lastName}` : 'Unknown'
    }));

    const mappedExpenses = expenses.map(e => ({
      id: e.id,
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: { seconds: Math.floor(e.date.getTime() / 1000) } // Mock Firebase timestamp
    }));

    return { success: true, payments: mappedPayments, expenses: mappedExpenses };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
