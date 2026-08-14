'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { expenseService } from '@/lib/services/expense-service';

const EXPENSE_CATEGORIES = ['Utilities', 'Salaries', 'Maintenance', 'Supplies', 'Marketing', 'Capital Expenditure', 'Miscellaneous'] as const;

const expenseSchema = z.object({
  id: z.string().optional(),
  category: z.string(),
  description: z.string().min(3, 'Description must be at least 3 characters long.'),
  amount: z.coerce.number().positive('Amount must be a positive number.'),
  date: z.date({ required_error: 'Expense date is required.' }),
  department: z.string().optional(),
  userId: z.string(),
});

export async function saveExpense(values: z.infer<typeof expenseSchema>) {
  try {
    
    const parsed = expenseSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }

    await expenseService.saveExpense(parsed.data);

    revalidatePath('/dashboard/finance/expenses');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving expense:', error);
    return { error: { _errors: [error.message || 'An unexpected error occurred.'] } };
  }
}

export async function deleteExpense(id: string) {
  try {
    
    await expenseService.deleteExpense(id, );
    revalidatePath('/dashboard/finance/expenses');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return { error: 'An unexpected error occurred while deleting.' };
  }
}

export async function getExpenses() {
  try {
    
    const expenses = await expenseService.getExpenses();
    return { success: true, expenses };
  } catch (error: any) {
    return { success: false, expenses: [], message: error.message };
  }
}

export async function bulkCreateExpenses(expenseList: any[], userId: string) {
  try {
    
    const result = await expenseService.bulkCreateExpenses(expenseList, userId);

    revalidatePath('/dashboard/finance/expenses');
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Error bulk creating expenses:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
