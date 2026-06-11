'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Fetch all invoices for an active term, sorted by status (UNPAID first)
 */
export async function getTermInvoices(termId: string, classId?: string) {
  try {
    const schoolId = await requireSchoolId();
    const whereClause: any = { termId, schoolId };
    if (classId) {
      whereClause.student = { classId };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        student: { select: { studentId: true, firstName: true, lastName: true, class: { select: { name: true } } } },
        receipts: { orderBy: { date: 'desc' } }
      },
      orderBy: [
        { status: 'desc' }, // UNPAID will bubble up since U > P
        { student: { lastName: 'asc' } }
      ]
    });
    
    return { success: true, invoices };
  } catch (error: any) {
    return { success: false, invoices: [], message: error.message };
  }
}

/**
 * Bulk generate tuition invoices for a specific class
 */
export async function generateClassInvoices(termId: string, classId: string, amount: number, description: string, dueDate: Date) {
  try {
    // 1. Get all students in the class
    const students = await prisma.student.findMany({
      where: { classId, status: "Active" }
    });

    if (students.length === 0) return { success: false, message: "No active students in this class." };

    // 2. Check who already has an invoice with this exact description for this term (prevent duplicates)
    const existingInvoices = await prisma.invoice.findMany({
      where: { termId, description, studentId: { in: students.map(s => s.id) } }
    });

    const existingStudentIds = existingInvoices.map(i => i.studentId);
    const studentsToInvoice = students.filter(s => !existingStudentIds.includes(s.id));

    if (studentsToInvoice.length === 0) return { success: false, message: "All students already have this invoice." };

    const schoolId = await requireSchoolId();
    // 3. Create the invoices
    await prisma.invoice.createMany({
      data: studentsToInvoice.map(s => ({
        studentId: s.id,
        termId,
        schoolId,
        amount,
        balance: amount,
        description,
        dueDate,
      }))
    });

    revalidatePath("/admin/bursary");
    return { success: true, count: studentsToInvoice.length };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Log a partial or full payment against an invoice
 */
export async function logPayment(invoiceId: string, paymentAmount: number, method: string, reference?: string) {
  try {
    const schoolId = await requireSchoolId();
    // Determine the logged in accountant (Scoped to school)
    const accountant = await prisma.user.findFirst({ where: { role: 'ADMIN', schoolId } });
    if (!accountant) throw new Error("No authorized accountant found.");

    return await prisma.$transaction(async (tx) => {
      // 1. Get invoice and lock it
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.schoolId !== schoolId) throw new Error("Unauthorized access to invoice.");

      if (invoice.balance <= 0) throw new Error("Invoice is already fully paid.");
      if (paymentAmount <= 0) throw new Error("Payment must be greater than zero.");
      if (paymentAmount > invoice.balance) throw new Error("Payment cannot exceed outstanding balance.");

      // 2. Calculate new values
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newBalance = invoice.amount - newAmountPaid;
      let newStatus = invoice.status;
      
      if (newBalance <= 0) {
        newStatus = "PAID";
      } else if (newAmountPaid > 0) {
        newStatus = "PARTIAL";
      }

      // 3. Update the invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance,
          status: newStatus
        }
      });

      // 4. Create the Receipt
      const receipt = await tx.paymentReceipt.create({
        data: {
          invoiceId,
          schoolId,
          amount: paymentAmount,
          method,
          reference,
          loggedById: accountant.id
        }
      });

      return { success: true, invoice: updatedInvoice, receipt };
    });
  } catch (error: any) {
    return { success: false, message: error.message };
  } finally {
    revalidatePath("/admin/bursary");
  }
}
