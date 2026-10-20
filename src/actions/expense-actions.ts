"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export interface ExpenseFilters {
  month?: number;
  year?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  category?: string;
  department?: string;
  paymentMethod?: string;
  search?: string;
}

export async function getExpenses(filters?: ExpenseFilters | number, maybeYear?: number) {
  const where: any = {};

  // Support legacy signature getExpenses(month, year)
  if (typeof filters === "number") {
    const month = filters;
    const year = maybeYear || new Date().getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    where.date = { gte: startDate, lte: endDate };
  } else if (filters) {
    if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(filters.startDate),
        lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)),
      };
    } else if (filters.month !== undefined && filters.year !== undefined) {
      const startDate = new Date(filters.year, filters.month - 1, 1);
      const endDate = new Date(filters.year, filters.month, 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }

    if (filters.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters.department && filters.department !== "ALL") {
      where.department = filters.department;
    }

    if (filters.paymentMethod && filters.paymentMethod !== "ALL") {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      const numSearch = parseFloat(q);
      const orConditions: any[] = [
        { description: { contains: q } },
        { category: { contains: q } },
        { department: { contains: q } },
        { vendor: { contains: q } },
      ];
      if (!isNaN(numSearch)) {
        orConditions.push({ amount: numSearch });
      }
      where.OR = orConditions;
    }
  }

  return await prisma.expense.findMany({
    where,
    include: {
      recordedByU: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function getExpenseSummary() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [allExpenses, thisMonthExpenses, lastMonthExpenses] = await Promise.all([
    prisma.expense.findMany({ select: { category: true, department: true, amount: true, paymentMethod: true } }),
    prisma.expense.findMany({ where: { date: { gte: currentMonthStart, lte: currentMonthEnd } } }),
    prisma.expense.findMany({ where: { date: { gte: prevMonthStart, lte: prevMonthEnd } } }),
  ]);

  const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  let pctChange = 0;
  if (totalLastMonth > 0) {
    pctChange = Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 100);
  } else if (totalThisMonth > 0) {
    pctChange = 100;
  }

  // Categories and totals
  const categoryTotals: Record<string, { total: number; count: number }> = {};
  const departmentSet = new Set<string>();
  const categorySet = new Set<string>();

  for (const e of allExpenses) {
    if (e.department) departmentSet.add(e.department);
    if (e.category) categorySet.add(e.category);

    if (!categoryTotals[e.category]) {
      categoryTotals[e.category] = { total: 0, count: 0 };
    }
    categoryTotals[e.category].total += e.amount;
    categoryTotals[e.category].count += 1;
  }

  const grandTotal = allExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryBreakdown = Object.entries(categoryTotals).map(([cat, data]) => ({
    category: cat,
    total: data.total,
    count: data.count,
    percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
  })).sort((a, b) => b.total - a.total);

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : { category: "None", total: 0, percentage: 0 };

  return {
    totalThisMonth,
    totalLastMonth,
    pctChange,
    topCategory,
    totalEntries: allExpenses.length,
    grandTotal,
    categoryBreakdown,
    departments: Array.from(departmentSet).sort(),
    categories: Array.from(categorySet).sort(),
  };
}

export async function recordExpense(data: {
  category: string;
  description: string;
  amount: number;
  date?: Date | string;
  department?: string;
  paymentMethod?: string;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
  recordedBy?: string;
}) {
  const numAmount = Number(data.amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    throw new Error("Amount must be a valid number greater than zero");
  }

  if (!data.description || data.description.trim() === "") {
    throw new Error("Description is required");
  }

  let userId = data.recordedBy;
  if (!userId || userId === "admin-id") {
    try {
      const session = await auth();
      userId = (session?.user as any)?.id;
    } catch {
      userId = undefined;
    }
  }

  if (userId) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) userId = undefined;
  }

  if (!userId) {
    const fallbackUser = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"] } },
      select: { id: true }
    }) || await prisma.user.findFirst({ select: { id: true } });

    if (!fallbackUser) {
      throw new Error("No valid user account found to associate with this expense.");
    }
    userId = fallbackUser.id;
  }

  const expense = await prisma.expense.create({
    data: {
      category: data.category || "General",
      description: data.description.trim(),
      amount: numAmount,
      date: data.date ? new Date(data.date) : new Date(),
      department: data.department?.trim() || null,
      paymentMethod: data.paymentMethod || "CASH",
      vendor: data.vendor?.trim() || null,
      receiptUrl: data.receiptUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      recordedBy: userId,
    },
    include: {
      recordedByU: { select: { firstName: true, lastName: true } }
    }
  });

  revalidatePath("/dashboard/finance/expenses");
  revalidatePath("/dashboard/finance/reports");
  return { success: true, expense };
}

export async function updateExpense(id: string, data: {
  category?: string;
  description?: string;
  amount?: number;
  date?: Date | string;
  department?: string;
  paymentMethod?: string;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
}) {
  const updateData: any = {};
  if (data.category) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.amount !== undefined) {
    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) throw new Error("Amount must be greater than zero");
    updateData.amount = amt;
  }
  if (data.date) updateData.date = new Date(data.date);
  if (data.department !== undefined) updateData.department = data.department?.trim() || null;
  if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
  if (data.vendor !== undefined) updateData.vendor = data.vendor?.trim() || null;
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl?.trim() || null;
  if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

  const updated = await prisma.expense.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/dashboard/finance/expenses");
  revalidatePath("/dashboard/finance/reports");
  return { success: true, expense: updated };
}

export async function deleteExpense(id: string) {
  await prisma.expense.delete({
    where: { id },
  });

  revalidatePath("/dashboard/finance/expenses");
  revalidatePath("/dashboard/finance/reports");
  return { success: true };
}

export async function bulkDeleteExpenses(ids: string[]) {
  if (!ids.length) return { success: true, count: 0 };
  const res = await prisma.expense.deleteMany({
    where: { id: { in: ids } },
  });

  revalidatePath("/dashboard/finance/expenses");
  revalidatePath("/dashboard/finance/reports");
  return { success: true, count: res.count };
}

export async function saveExpense(data: any) { 
  return await recordExpense(data); 
}

export async function bulkCreateExpenses(data: any[], userId?: string) {
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId || resolvedUserId === "admin-id") {
      const session = await auth();
      resolvedUserId = (session?.user as any)?.id;
    }
    if (resolvedUserId) {
      const existing = await prisma.user.findUnique({ where: { id: resolvedUserId }, select: { id: true } });
      if (!existing) resolvedUserId = undefined;
    }
    if (!resolvedUserId) {
      const fallback = await prisma.user.findFirst({ select: { id: true } });
      if (!fallback) throw new Error("No user found to associate expenses with");
      resolvedUserId = fallback.id;
    }

    let count = 0;
    for (const item of data) {
      const amount = Number(item.amount);
      if (!amount || isNaN(amount) || amount <= 0) continue;
      if (!item.description) continue;

      await prisma.expense.create({
        data: {
          category: item.category || "General",
          description: String(item.description).trim(),
          amount,
          date: item.date ? new Date(item.date) : new Date(),
          department: item.department ? String(item.department).trim() : null,
          paymentMethod: item.paymentMethod || "CASH",
          vendor: item.vendor ? String(item.vendor).trim() : null,
          receiptUrl: item.receiptUrl ? String(item.receiptUrl).trim() : null,
          recordedBy: resolvedUserId,
        }
      });
      count++;
    }

    revalidatePath("/dashboard/finance/expenses");
    return { success: true, count, importedCount: count };
  } catch (error: any) {
    return { success: false, error: error.message, count: 0, importedCount: 0 };
  }
}
