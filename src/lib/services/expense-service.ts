import { expenseRepository } from '../dal/expense-repository';

export class ExpenseService {
  async saveExpense(data: any) {
    const { id, userId, ...rest } = data;
    
    if (id) {
      await expenseRepository.updateExpense(id, {
        ...rest,
        recordedBy: userId,
      });
    } else {
      await expenseRepository.createExpense({
        ...rest,
        recordedBy: userId,
      });
    }
  }

  async deleteExpense(id: string, ) {
    await expenseRepository.deleteExpense(id);
  }

  async getExpenses() {
    return expenseRepository.getExpenses();
  }

  async bulkCreateExpenses(expenseList: any[], userId: string) {
    let importedCount = 0;
    let errorCount = 0;
    const invalidRecords: any[] = [];

    for (const record of expenseList) {
      try {
        if (!record.category || !record.amount || !record.description) {
          throw new Error('Category, Description, and Amount are required.');
        }

        const dateVal = record['date(YYYY-MM-DD)'] || record.date;
        const dateObj = dateVal ? new Date(dateVal) : new Date();

        await expenseRepository.createExpense({
          category: record.category,
          description: record.description,
          amount: Number(record.amount),
          date: dateObj,
          department: record.department || null,
          recordedBy: userId,
        });
        importedCount++;
      } catch (err: any) {
        errorCount++;
        invalidRecords.push({
          description: record.description || 'N/A',
          error: err.message || 'Database error'
        });
      }
    }

    return { importedCount, errorCount, invalidRecords };
  }
}
export const expenseService = new ExpenseService();
