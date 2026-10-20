"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { CommEngine } from "@/lib/services/comm-engine";

export async function getFeeStructures() {
  return await prisma.feeStructure.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createFeeStructure(data: {
  name?: string;
  className: string;
  session: string;
  term: string;
  category?: string;
  scope?: string;
  status?: string;
  items: { name: string; amount: number }[];
}) {
  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

  const feeStructure = await prisma.feeStructure.create({
    data: {
      name: data.name?.trim() || null,
      className: data.className,
      category: data.category || "TUITION",
      scope: data.scope || "CLASS",
      session: data.session,
      term: data.term,
      status: data.status || "ACTIVE",
      totalAmount,
      items: {
        create: data.items,
      },
    },
    include: { items: true },
  });

  revalidatePath("/dashboard/finance/fee-structures");
  return feeStructure;
}

export async function updateFeeStructure(id: string, data: {
  name?: string;
  className: string;
  session: string;
  term: string;
  category?: string;
  scope?: string;
  status?: string;
  items: { name: string; amount: number }[];
}) {
  const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

  // Delete previous items and insert new
  await prisma.feeItem.deleteMany({ where: { feeStructureId: id } });

  const updated = await prisma.feeStructure.update({
    where: { id },
    data: {
      name: data.name?.trim() || null,
      className: data.className,
      category: data.category || "TUITION",
      scope: data.scope || "CLASS",
      session: data.session,
      term: data.term,
      status: data.status || "ACTIVE",
      totalAmount,
      items: {
        create: data.items,
      },
    },
    include: { items: true },
  });

  revalidatePath("/dashboard/finance/fee-structures");
  return updated;
}

export async function duplicateFeeStructure(id: string) {
  const original = await prisma.feeStructure.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!original) throw new Error("Original fee structure not found");

  const newName = original.name 
    ? `${original.name} (Copy)` 
    : `${original.className} Template (Copy)`;

  const duplicate = await prisma.feeStructure.create({
    data: {
      name: newName,
      className: original.className,
      category: original.category,
      scope: original.scope,
      session: original.session,
      term: original.term,
      status: "DRAFT",
      totalAmount: original.totalAmount,
      items: {
        create: original.items.map(item => ({
          name: item.name,
          amount: item.amount,
        })),
      },
    },
    include: { items: true },
  });

  revalidatePath("/dashboard/finance/fee-structures");
  return duplicate;
}

export async function setFeeStructureStatus(id: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  const updated = await prisma.feeStructure.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/dashboard/finance/fee-structures");
  return updated;
}

export async function deleteFeeStructure(id: string) {
  await prisma.feeItem.deleteMany({ where: { feeStructureId: id } });
  await prisma.feeStructure.delete({ where: { id } });
  revalidatePath("/dashboard/finance/fee-structures");
}

export async function generateClassInvoices(feeStructureId: string) {
  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id: feeStructureId },
    include: { items: true },
  });

  if (!feeStructure) throw new Error("Fee structure not found");

  const isSchoolWide = 
    feeStructure.scope === "WHOLE_SCHOOL" || 
    feeStructure.className === "All Students (School-Wide)" ||
    feeStructure.className.toLowerCase().includes("all students") ||
    feeStructure.className.toLowerCase().includes("school-wide");

  let students: any[] = [];
  if (isSchoolWide) {
    students = await prisma.student.findMany({
      where: { status: "Active" },
    });
  } else {
    // Attempt lookup by exact name, ID, or case-insensitive match
    let classObj = await prisma.class.findFirst({
      where: {
        OR: [
          { id: feeStructure.className },
          { name: feeStructure.className },
        ]
      },
    });

    if (classObj) {
      students = await prisma.student.findMany({
        where: { classId: classObj.id, status: "Active" },
      });
    } else {
      students = await prisma.student.findMany({
        where: {
          OR: [
            { classId: feeStructure.className },
            { class: { name: feeStructure.className } },
          ],
          status: "Active"
        },
      });
    }
  }

  if (students.length === 0) {
    throw new Error(`No active students found for fee structure: ${feeStructure.className}`);
  }

  // Find term by ID, exact name, or fallback to active term
  let termObj = await prisma.term.findFirst({
    where: {
      OR: [
        { id: feeStructure.term },
        { name: feeStructure.term },
      ]
    },
  });

  if (!termObj) {
    termObj = await prisma.term.findFirst({
      where: { isActive: true },
    }) || await prisma.term.findFirst();
  }

  if (!termObj) {
    throw new Error(`No academic term configured in the system.`);
  }

  let generatedCount = 0;
  const feeTitle = `${feeStructure.className} - ${feeStructure.term} (${feeStructure.session})`;

  for (const student of students) {
    const existing = await prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        termId: termObj.id,
        description: feeTitle,
      },
    });

    if (existing) continue;

    await prisma.invoice.create({
      data: {
        studentId: student.id,
        termId: termObj.id,
        amount: feeStructure.totalAmount,
        amountPaid: 0,
        balance: feeStructure.totalAmount,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "UNPAID",
        description: feeTitle,
      },
    });
    generatedCount++;
  }

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/finance/payments");
  return { generatedCount, totalStudents: students.length };
}

export async function createIndividualInvoice(data: {
  studentId: string;
  termId?: string;
  amount: number;
  description: string;
  dueDate?: Date | string;
}) {
  if (!data.studentId) throw new Error("Student is required");
  if (!data.amount || data.amount <= 0) throw new Error("Amount must be greater than zero");
  if (!data.description) throw new Error("Description is required");

  let termId = data.termId;
  if (!termId) {
    const activeTerm = await prisma.term.findFirst({ where: { isActive: true } }) || await prisma.term.findFirst();
    if (!activeTerm) throw new Error("No active term found");
    termId = activeTerm.id;
  }

  const invoice = await prisma.invoice.create({
    data: {
      studentId: data.studentId,
      termId: termId,
      amount: data.amount,
      amountPaid: 0,
      balance: data.amount,
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "UNPAID",
      description: data.description.trim(),
    },
    include: {
      student: { select: { firstName: true, lastName: true, studentId: true } }
    }
  });

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/finance/payments");
  return { success: true, invoice };
}

export async function getInvoices(filters?: {
  status?: string;
  studentId?: string;
  search?: string;
  classId?: string;
  termId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const where: any = {};
  if (filters?.status && filters.status !== 'ALL') {
    const s = filters.status.toUpperCase();
    if (s === 'OVERDUE') {
      where.status = { notIn: ['PAID', 'paid', 'VOID', 'void'] };
      where.balance = { gt: 0 };
      where.dueDate = { lt: new Date() };
    } else if (s === 'UNPAID') {
      where.status = { in: ['UNPAID', 'unpaid', 'PARTIAL', 'partial'] };
      where.balance = { gt: 0 };
    } else {
      where.status = { in: [s, s.toLowerCase()] };
    }
  }
  if (filters?.classId && filters.classId !== 'ALL') {
    where.student = { ...(where.student || {}), classId: filters.classId };
  }
  if (filters?.termId && filters.termId !== 'ALL') {
    where.termId = filters.termId;
  }
  if (filters?.studentId) where.studentId = filters.studentId;
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
  }
  if (filters?.search) {
    where.OR = [
      { id: { contains: filters.search } },
      { description: { contains: filters.search } },
      { student: { firstName: { contains: filters.search } } },
      { student: { lastName: { contains: filters.search } } },
      { student: { studentId: { contains: filters.search } } },
    ];
  }

  return await prisma.invoice.findMany({
    where,
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, studentId: true, class: { select: { id: true, name: true } } },
      },
      term: {
        select: { id: true, name: true, session: { select: { name: true } } },
      },
      receipts: {
        select: { id: true, reference: true, amount: true, date: true, method: true },
        take: 5,
        orderBy: { date: 'desc' }
      }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function voidInvoice(invoiceId: string, reason?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { receipts: true }
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.amountPaid > 0 || (invoice.receipts && invoice.receipts.length > 0)) {
    throw new Error("Cannot void an invoice with recorded payments. Please reverse or refund receipts first.");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "VOID",
      balance: 0,
      description: reason ? `${invoice.description || ''} [VOIDED: ${reason}]`.trim() : invoice.description,
    }
  });

  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/finance/payments");
  return { success: true };
}

export async function bulkVoidInvoices(invoiceIds: string[]) {
  let voidedCount = 0;
  let skippedCount = 0;

  for (const id of invoiceIds) {
    try {
      const inv = await prisma.invoice.findUnique({ where: { id }, include: { receipts: true } });
      if (inv && inv.amountPaid === 0 && (!inv.receipts || inv.receipts.length === 0)) {
        await prisma.invoice.update({
          where: { id },
          data: { status: "VOID", balance: 0 }
        });
        voidedCount++;
      } else {
        skippedCount++;
      }
    } catch {
      skippedCount++;
    }
  }

  revalidatePath("/dashboard/finance/invoices");
  return { success: true, voidedCount, skippedCount };
}

export async function quickMarkInvoicePaid(invoiceId: string, method = "CASH") {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.balance <= 0) {
    return { success: true, message: "Invoice is already fully paid" };
  }

  return await recordPayment({
    invoiceId,
    amount: invoice.balance,
    method,
    reference: `QUICK-PAY-${Date.now().toString().slice(-6)}`,
  });
}

export async function bulkMarkInvoicesPaid(invoiceIds: string[], method = "CASH") {
  let successCount = 0;
  let errorCount = 0;

  for (const id of invoiceIds) {
    try {
      const inv = await prisma.invoice.findUnique({ where: { id } });
      if (inv && inv.balance > 0) {
        await recordPayment({
          invoiceId: id,
          amount: inv.balance,
          method,
          reference: `BULK-PAY-${Date.now().toString().slice(-6)}`,
        });
        successCount++;
      }
    } catch {
      errorCount++;
    }
  }

  revalidatePath("/dashboard/finance/invoices");
  return { success: true, successCount, errorCount };
}

export async function sendInvoiceReminder(invoiceId: string, currencySymbol = "₦") {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          studentId: true,
          class: { select: { name: true } },
          guardians: { select: { fullName: true, email: true, phone: true, isPrimary: true } }
        }
      },
      term: { select: { name: true } }
    }
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.balance <= 0) throw new Error("This invoice has no outstanding balance.");

  const primaryGuardian = invoice.student.guardians?.find(g => g.isPrimary) || invoice.student.guardians?.[0];
  if (!primaryGuardian || (!primaryGuardian.email && !primaryGuardian.phone)) {
    throw new Error("No guardian contact info (email/phone) found for this student.");
  }

  const studentName = `${invoice.student.firstName} ${invoice.student.lastName}`.trim();
  const invoiceNumber = `INV-${invoice.id.slice(-6).toUpperCase()}`;

  const res = await CommEngine.sendFeeReminder({
    guardianName: primaryGuardian.fullName || "Parent / Guardian",
    guardianEmail: primaryGuardian.email,
    guardianPhone: primaryGuardian.phone,
    studentName,
    studentId: invoice.student.studentId || "N/A",
    className: invoice.student.class?.name || "Enrolled Class",
    invoiceNumber,
    amountDue: invoice.balance,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "Immediate",
    currencySymbol,
  });

  return { success: res.success, message: res.success ? "Fee reminder dispatched successfully" : (res.warning || "Reminder transmission concluded") };
}

export async function getInvoiceById(id: string) {
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, studentId: true, class: { select: { name: true } } },
      },
      term: {
        select: { id: true, name: true, session: { select: { name: true } } },
      },
      receipts: {
        include: {
          loggedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: "desc" },
      },
    },
  });
}

export async function recordPayment(data: {
  invoiceId: string;
  amount: number;
  method: string;
  reference?: string;
  payerName?: string;
  status?: string;
  loggedById?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: data.invoiceId },
  });

  if (!invoice) throw new Error("Invoice not found");
  if (!data.amount || data.amount <= 0) throw new Error("Payment amount must be greater than zero");
  if (data.amount > invoice.balance) throw new Error("Payment exceeds outstanding balance");

  // Resolve valid user ID for loggedById to satisfy foreign key constraint
  let userId = data.loggedById;
  if (!userId || userId === "system" || userId === "admin-id") {
    const session = await auth();
    userId = (session?.user as any)?.id;
  }

  if (userId) {
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) userId = undefined;
  }

  if (!userId) {
    const fallbackUser = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"] } },
      select: { id: true }
    }) || await prisma.user.findFirst({ select: { id: true } });

    if (!fallbackUser) throw new Error("No staff/admin user found to record this receipt against.");
    userId = fallbackUser.id;
  }

  const receiptStatus = data.status === "PENDING" ? "PENDING" : "VERIFIED";
  const newAmountPaid = invoice.amountPaid + data.amount;
  const newBalance = invoice.balance - data.amount;
  let newStatus = "PARTIAL";
  if (newBalance <= 0) newStatus = "PAID";

  // If pending (e.g. uncleared cheque or bank transfer), do not deduct invoice balance until verified
  if (receiptStatus === "PENDING") {
    const receipt = await prisma.paymentReceipt.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        payerName: data.payerName || null,
        status: "PENDING",
        loggedById: userId,
      },
      include: {
        invoice: {
          include: {
            student: { select: { firstName: true, lastName: true, studentId: true, class: { select: { name: true } } } },
            term: { select: { name: true } }
          }
        },
        loggedBy: { select: { firstName: true, lastName: true } }
      }
    });

    revalidatePath(`/dashboard/finance/invoices/${data.invoiceId}`);
    revalidatePath("/dashboard/finance/invoices");
    revalidatePath("/dashboard/finance/payments");
    return { success: true, receipt };
  }

  const [receipt] = await prisma.$transaction([
    prisma.paymentReceipt.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        payerName: data.payerName || null,
        status: "VERIFIED",
        loggedById: userId,
      },
      include: {
        invoice: {
          include: {
            student: { select: { firstName: true, lastName: true, studentId: true, class: { select: { name: true } } } },
            term: { select: { name: true } }
          }
        },
        loggedBy: { select: { firstName: true, lastName: true } }
      }
    }),
    prisma.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
      },
    }),
  ]);

  revalidatePath(`/dashboard/finance/invoices/${data.invoiceId}`);
  revalidatePath("/dashboard/finance/invoices");
  revalidatePath("/dashboard/finance/payments");
  revalidatePath("/dashboard/finance/reports");

  // Asynchronously dispatch digital receipt notification to guardian
  try {
    const guardian = await prisma.guardian.findFirst({
      where: { studentId: invoice.studentId },
      orderBy: { isPrimary: 'desc' },
      select: { fullName: true, email: true, phone: true },
    });

    if (guardian && (guardian.email || guardian.phone)) {
      const studentName = `${receipt.invoice.student.firstName} ${receipt.invoice.student.lastName}`.trim();
      const className = receipt.invoice.student.class?.name || 'Assigned Class';
      const receiptNumber = receipt.reference || `REC-${receipt.id.slice(-6).toUpperCase()}`;

      // Fire asynchronously to avoid blocking user POS transaction
      CommEngine.sendReceiptNotification({
        guardianName: guardian.fullName,
        guardianEmail: guardian.email,
        guardianPhone: guardian.phone,
        studentName,
        studentId: receipt.invoice.student.studentId,
        className,
        receiptNumber,
        amountPaid: data.amount,
        balanceRemaining: Math.max(0, newBalance),
        paymentMethod: data.method,
        date: receipt.date || new Date(),
      }).catch(err => console.error('[recordPayment] Error dispatching receipt notification:', err));
    }
  } catch (noticeErr) {
    console.error('[recordPayment] Notice query error:', noticeErr);
  }

  return { success: true, receipt };
}

export async function getStudentInvoicesForPOS(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return await prisma.invoice.findMany({
    where: {
      balance: { gt: 0 },
      OR: [
        { student: { studentId: { contains: trimmed } } },
        { student: { firstName: { contains: trimmed } } },
        { student: { lastName: { contains: trimmed } } },
        { id: { contains: trimmed } },
      ]
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentId: true,
          class: { select: { name: true } },
        }
      },
      term: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}

export async function getRecentPayments(limit = 50) {
  return await prisma.paymentReceipt.findMany({
    take: limit,
    orderBy: { date: "desc" },
    include: {
      invoice: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentId: true,
              class: { select: { id: true, name: true } }
            }
          },
          term: { select: { id: true, name: true } }
        }
      },
      loggedBy: { select: { id: true, firstName: true, lastName: true, role: true } }
    }
  });
}

export async function getPaymentReceipts(filters?: {
  search?: string;
  method?: string;
  status?: string;
  cashierId?: string;
  termId?: string;
  studentId?: string;
  dateRange?: "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  try {
    const where: any = {};

    // Text search: receipt id, reference, payer, student name, student admission #
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { id: { contains: q } },
        { reference: { contains: q } },
        { payerName: { contains: q } },
        { invoice: { student: { firstName: { contains: q } } } },
        { invoice: { student: { lastName: { contains: q } } } },
        { invoice: { student: { studentId: { contains: q } } } },
      ];
    }

    // Payment channel/method
    if (filters?.method && filters.method !== "ALL") {
      where.method = filters.method;
    }

    // Payment status: VERIFIED, PENDING, REVERSED
    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    // Cashier filter
    if (filters?.cashierId && filters.cashierId !== "ALL") {
      where.loggedById = filters.cashierId;
    }

    // Term filter
    if (filters?.termId && filters.termId !== "ALL") {
      where.invoice = { ...where.invoice, termId: filters.termId };
    }

    // Specific Student filter
    if (filters?.studentId && filters.studentId !== "ALL") {
      where.invoice = {
        ...where.invoice,
        OR: [
          { studentId: filters.studentId },
          { student: { studentId: filters.studentId } }
        ]
      };
    }

    // Date range filters
    const now = new Date();
    if (filters?.dateRange === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      where.date = { gte: startOfDay };
    } else if (filters?.dateRange === "WEEK") {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
      where.date = { gte: startOfWeek };
    } else if (filters?.dateRange === "MONTH") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      where.date = { gte: startOfMonth };
    } else if (filters?.dateRange === "CUSTOM") {
      const dateFilter: any = {};
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      if (Object.keys(dateFilter).length > 0) {
        where.date = dateFilter;
      }
    }

    const receipts = await prisma.paymentReceipt.findMany({
      where,
      take: filters?.limit || 500,
      orderBy: { date: "desc" },
      include: {
        invoice: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
                class: { select: { id: true, name: true } }
              }
            },
            term: { select: { id: true, name: true } }
          }
        },
        loggedBy: { select: { id: true, firstName: true, lastName: true, role: true } }
      }
    });

    return { success: true, receipts };
  } catch (error: any) {
    console.error("[getPaymentReceipts] error:", error);
    return { success: false, receipts: [], message: error.message };
  }
}

export async function verifyPendingPayment(receiptId: string, options?: { force?: boolean }) {
  try {
    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id: receiptId },
      include: { invoice: true }
    });

    if (!receipt) {
      return { success: false, message: "Payment receipt record not found." };
    }

    if (receipt.status === "VERIFIED") {
      return { success: true, message: "Payment is already marked as verified." };
    }

    // Check if linked invoice is available and active
    const invoice = receipt.invoice;
    const canApplyToInvoice = invoice && invoice.status !== "VOID";

    if (!canApplyToInvoice && !options?.force) {
      return {
        success: false,
        code: "INVOICE_MISSING_OR_VOID",
        message: "The invoice linked to this payment is missing or void. You can use 'Force Verify' to record this payment into general revenue without updating the invoice.",
      };
    }

    if (canApplyToInvoice) {
      const newAmountPaid = invoice.amountPaid + receipt.amount;
      const newBalance = Math.max(0, invoice.balance - receipt.amount);
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIAL";

      await prisma.$transaction([
        prisma.paymentReceipt.update({
          where: { id: receiptId },
          data: { status: "VERIFIED" }
        }),
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
          }
        })
      ]);
    } else {
      // Force verify without updating missing invoice
      await prisma.paymentReceipt.update({
        where: { id: receiptId },
        data: { status: "VERIFIED" }
      });
    }

    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance/invoices");
    revalidatePath("/dashboard/finance/reports");

    return { success: true, message: "Payment successfully verified and posted to accounts." };
  } catch (error: any) {
    console.error("[verifyPendingPayment] error:", error);
    return { success: false, message: error.message || "Failed to verify payment." };
  }
}

export async function reversePayment(data: {
  receiptId: string;
  reason: string;
  reversedById?: string;
  notifyGuardian?: boolean;
}) {
  try {
    const trimmedReason = data.reason?.trim();
    if (!trimmedReason) {
      return { success: false, message: "A valid reason is required to reverse a payment." };
    }

    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id: data.receiptId },
      include: {
        invoice: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, studentId: true } }
          }
        }
      }
    });

    if (!receipt) {
      return { success: false, message: "Payment receipt not found." };
    }

    if (receipt.status === "REVERSED") {
      return { success: false, message: "This payment has already been reversed." };
    }

    // Resolve reversing actor user ID
    let actorId = data.reversedById;
    if (!actorId) {
      const session = await auth();
      actorId = (session?.user as any)?.id || null;
    }

    const invoice = receipt.invoice;
    const canReopenInvoice = invoice && invoice.status !== "VOID" && receipt.status === "VERIFIED";

    if (canReopenInvoice) {
      const restoredAmountPaid = Math.max(0, invoice.amountPaid - receipt.amount);
      const restoredBalance = Math.min(invoice.amount, invoice.balance + receipt.amount);
      const restoredStatus = restoredAmountPaid <= 0 ? "UNPAID" : "PARTIAL";

      await prisma.$transaction([
        prisma.paymentReceipt.update({
          where: { id: data.receiptId },
          data: {
            status: "REVERSED",
            reversalReason: trimmedReason,
            reversedAt: new Date(),
            reversedById: actorId,
          }
        }),
        prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            amountPaid: restoredAmountPaid,
            balance: restoredBalance,
            status: restoredStatus,
          }
        })
      ]);
    } else {
      // Just reverse receipt record if invoice is missing or was already pending
      await prisma.paymentReceipt.update({
        where: { id: data.receiptId },
        data: {
          status: "REVERSED",
          reversalReason: trimmedReason,
          reversedAt: new Date(),
          reversedById: actorId,
        }
      });
    }

    // Optional guardian notification
    if (data.notifyGuardian && receipt.invoice?.student?.id) {
      try {
        const guardian = await prisma.guardian.findFirst({
          where: { studentId: receipt.invoice.student.id },
          orderBy: { isPrimary: "desc" },
          select: { fullName: true, email: true, phone: true }
        });

        if (guardian && (guardian.email || guardian.phone)) {
          const studentName = `${receipt.invoice.student.firstName} ${receipt.invoice.student.lastName}`.trim();
          const receiptNumber = receipt.reference || `RCP-${receipt.id.slice(-8).toUpperCase()}`;

          if (guardian.email) {
            CommEngine.sendEmail({
              to: guardian.email,
              subject: `Payment Reversal Notice: ${receiptNumber}`,
              text: `Dear ${guardian.fullName},\n\nPlease be advised that payment receipt ${receiptNumber} for ${studentName} in the amount of ₦${receipt.amount.toLocaleString()} has been reversed.\n\nReason: ${trimmedReason}\n\nIf you have any questions, please contact the Bursary Department.\n\nProxima SMS Bursary`,
            }).catch(err => console.error("[reversePayment] Email dispatch error:", err));
          } else if (guardian.phone) {
            CommEngine.sendWhatsApp(
              guardian.phone,
              `Payment Reversal Notice\n\nDear ${guardian.fullName},\nPayment receipt ${receiptNumber} for ${studentName} (₦${receipt.amount.toLocaleString()}) has been reversed.\nReason: ${trimmedReason}\n\nProxima SMS Bursary`
            ).catch(err => console.error("[reversePayment] WhatsApp dispatch error:", err));
          }
        }
      } catch (noticeErr) {
        console.error("[reversePayment] Guardian lookup error:", noticeErr);
      }
    }

    revalidatePath("/dashboard/finance/payments");
    revalidatePath("/dashboard/finance/invoices");
    revalidatePath("/dashboard/finance/reports");

    return { success: true, message: "Payment successfully reversed and invoice balance restored." };
  } catch (error: any) {
    console.error("[reversePayment] error:", error);
    return { success: false, message: error.message || "Failed to reverse payment." };
  }
}

export async function resendReceiptNotification(receiptId: string) {
  try {
    const receipt = await prisma.paymentReceipt.findUnique({
      where: { id: receiptId },
      include: {
        invoice: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true,
                class: { select: { name: true } }
              }
            }
          }
        }
      }
    });

    if (!receipt) {
      return { success: false, message: "Receipt not found." };
    }

    const student = receipt.invoice?.student;
    if (!student) {
      return { success: false, message: "Student record for this receipt could not be located." };
    }

    const guardian = await prisma.guardian.findFirst({
      where: { studentId: student.id },
      orderBy: { isPrimary: "desc" },
      select: { fullName: true, email: true, phone: true }
    });

    if (!guardian || (!guardian.email && !guardian.phone)) {
      return {
        success: false,
        message: "No registered guardian email or phone number found for this student.",
      };
    }

    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const className = student.class?.name || "Assigned Class";
    const receiptNumber = receipt.reference || `RCP-${receipt.id.slice(-8).toUpperCase()}`;

    await CommEngine.sendReceiptNotification({
      guardianName: guardian.fullName,
      guardianEmail: guardian.email,
      guardianPhone: guardian.phone,
      studentName,
      studentId: student.studentId,
      className,
      receiptNumber,
      amountPaid: receipt.amount,
      balanceRemaining: receipt.invoice?.balance ?? 0,
      paymentMethod: receipt.method,
      date: receipt.date || new Date(),
    });

    return {
      success: true,
      message: `Receipt sent to ${guardian.fullName} (${guardian.email || guardian.phone}).`
    };
  } catch (error: any) {
    console.error("[resendReceiptNotification] error:", error);
    return { success: false, message: error.message || "Failed to resend receipt notification." };
  }
}

export async function getPaymentCashiers() {
  try {
    const cashiers = await prisma.user.findMany({
      where: {
        receiptsLogged: { some: {} }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
      },
      orderBy: { firstName: "asc" }
    });
    return cashiers;
  } catch (error) {
    console.error("[getPaymentCashiers] error:", error);
    return [];
  }
}

export async function getDailyPaymentSummaries(days = 14) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const receipts = await prisma.paymentReceipt.findMany({
      where: {
        date: { gte: startDate },
        status: "VERIFIED"
      },
      select: {
        date: true,
        amount: true,
        method: true,
      },
      orderBy: { date: "desc" }
    });

    // Group by YYYY-MM-DD
    const groups: { [dateStr: string]: { date: string; total: number; count: number; cash: number; transfer: number; card: number; cheque: number } } = {};

    receipts.forEach(r => {
      const d = new Date(r.date);
      const dateStr = d.toISOString().split("T")[0];
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr, total: 0, count: 0, cash: 0, transfer: 0, card: 0, cheque: 0 };
      }
      groups[dateStr].total += r.amount;
      groups[dateStr].count += 1;
      const m = (r.method || "CASH").toUpperCase();
      if (m.includes("CASH")) groups[dateStr].cash += r.amount;
      else if (m.includes("TRANS")) groups[dateStr].transfer += r.amount;
      else if (m.includes("CARD") || m.includes("POS")) groups[dateStr].card += r.amount;
      else if (m.includes("CHEQ")) groups[dateStr].cheque += r.amount;
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error("[getDailyPaymentSummaries] error:", error);
    return [];
  }
}


