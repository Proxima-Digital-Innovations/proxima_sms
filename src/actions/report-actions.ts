"use server";

import { prisma } from "@/lib/prisma";

export async function getFinancialSummary() {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  // Revenue from PaymentReceipts
  const revenueResult = await prisma.paymentReceipt.aggregate({
    _sum: { amount: true },
    where: { date: { gte: startOfYear } },
  });

  // Expenses from General Expenses (Payroll is already logged as an Expense when paid)
  const expenseResult = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: startOfYear } },
  });

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
  const data: any[] = [];
  const currentDate = new Date();
  
  // Go back 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0, 23, 59, 59);
    const monthName = d.toLocaleString('default', { month: 'short' });
    
    const revResult = await prisma.paymentReceipt.aggregate({
      _sum: { amount: true },
      where: { date: { gte: d, lte: endOfMonth } },
    });
    
    const expResult = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: { date: { gte: d, lte: endOfMonth } },
    });

    data.push({
      name: monthName,
      Revenue: revResult._sum.amount || 0,
      Expenses: expResult._sum.amount || 0,
    });
  }

  return data;
}

export async function getRecentTransactions() {
  // Fetch latest 10 receipts
  const receipts = await prisma.paymentReceipt.findMany({
    take: 10,
    orderBy: { date: 'desc' },
    include: {
      invoice: {
        include: {
          student: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  // Fetch latest 10 expenses
  const expenses = await prisma.expense.findMany({
    take: 10,
    orderBy: { date: 'desc' },
  });

  // Combine and sort
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

  // Sort descending by date
  combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Return top 10 overall
  return combined.slice(0, 10);
}
