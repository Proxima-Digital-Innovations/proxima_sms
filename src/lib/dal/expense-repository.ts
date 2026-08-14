import { prisma } from '@/lib/prisma';

export class ExpenseRepository {
  async updateExpense(id: string, data: any) {
    return prisma.expense.update({
      where: { id },
      data
    });
  }

  async createExpense(data: any) {
    return prisma.expense.create({
      data
    });
  }

  async deleteExpense(id: string, ) {
    return prisma.expense.delete({ where: { id } });
  }

  async getExpenses() {
    return prisma.expense.findMany({
      where: {},
      include: { 
        recordedByU: { select: { firstName: true, lastName: true } },
        memo: { select: { reference: true } }
      },
      orderBy: { date: 'desc' }
    });
  }
}
export const expenseRepository = new ExpenseRepository();
