"use server";

import { prisma } from "@/lib/prisma";

export async function getFinancialSummary() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  const [revenueResult, expenseResult] = await Promise.all([
    prisma.paymentReceipt.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startOfYear } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: startOfYear } },
    }),
  ]);

  const totalRevenue = revenueResult._sum.amount || 0;
  const totalExpenses = expenseResult._sum.amount || 0;
  const netProfit = totalRevenue - totalExpenses;
  
  let profitMargin = 0;
  if (totalRevenue > 0) {
    profitMargin = (netProfit / totalRevenue) * 100;
  }

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin,
  };
}

export async function getRevenueVsExpenseData() {
  const currentDate = new Date();
  const startMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
  const endMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

  // Single parallel range fetch instead of 12 sequential monthly aggregate queries
  const [receipts, expenses] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { date: { gte: startMonthDate, lte: endMonthDate } },
      select: { amount: true, date: true },
    }),
    prisma.expense.findMany({
      where: { date: { gte: startMonthDate, lte: endMonthDate } },
      select: { amount: true, date: true },
    }),
  ]);

  const buckets = new Map<string, { name: string; Revenue: number; Expenses: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const monthName = d.toLocaleString("default", { month: "short" });
    buckets.set(key, { name: monthName, Revenue: 0, Expenses: 0 });
  }

  for (const r of receipts) {
    const dt = new Date(r.date);
    const bucket = buckets.get(`${dt.getFullYear()}-${dt.getMonth()}`);
    if (bucket) bucket.Revenue += r.amount || 0;
  }

  for (const e of expenses) {
    const dt = new Date(e.date);
    const bucket = buckets.get(`${dt.getFullYear()}-${dt.getMonth()}`);
    if (bucket) bucket.Expenses += e.amount || 0;
  }

  return Array.from(buckets.values());
}

export async function getRecentTransactions() {
  const [receipts, expenses] = await Promise.all([
    prisma.paymentReceipt.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: {
        invoice: {
          include: {
            student: { select: { firstName: true, lastName: true } }
          }
        }
      }
    }),
    prisma.expense.findMany({
      take: 10,
      orderBy: { date: 'desc' },
    }),
  ]);

  const combined = [
    ...receipts.map(r => {
      const studentName = r.invoice?.student?.firstName
        ? `${r.invoice.student.firstName} ${r.invoice.student.lastName || ''}`.trim()
        : (r.reference || 'Student');
      return {
        id: `rev-${r.id}`,
        type: 'REVENUE',
        title: `Payment from ${studentName}`,
        description: r.method,
        amount: r.amount,
        date: r.date,
      };
    }),
    ...expenses.map(e => ({
      id: `exp-${e.id}`,
      type: 'EXPENSE',
      title: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date,
    }))
  ];

  combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return combined.slice(0, 10);
}
