'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { Role } from '@prisma/client';

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
    const schoolId = await requireSchoolId();
    const parsed = expenseSchema.safeParse(values);
    if (!parsed.success) {
      return { error: parsed.error.flatten().fieldErrors };
    }

    const { id, userId, ...data } = parsed.data;
    
    if (id) {
      await prisma.expense.update({
        where: { id, schoolId },
        data: {
          ...data,
          recordedBy: userId,
        }
      });
    } else {
      await prisma.expense.create({
        data: {
          ...data,
          schoolId,
          recordedBy: userId,
        }
      });
    }

    revalidatePath('/admin/expenses');
    return { success: true };

  } catch (error: any) {
    console.error('Error saving expense:', error);
    return { error: { _errors: [error.message || 'An unexpected error occurred.'] } };
  }
}

export async function deleteExpense(id: string) {
  try {
    const schoolId = await requireSchoolId();
    await prisma.expense.delete({ where: { id, schoolId } });
    revalidatePath('/admin/expenses');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return { error: 'An unexpected error occurred while deleting.' };
  }
}

export async function getExpenses() {
  try {
    const schoolId = await requireSchoolId();
    const expenses = await prisma.expense.findMany({
      where: { schoolId },
      include: { recordedByU: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    });
    return { success: true, expenses };
  } catch (error: any) {
    return { success: false, expenses: [], message: error.message };
  }
}

/**
 * Bulk create expense records in the database from spreadsheet uploads.
 */
export async function bulkCreateExpenses(expenseList: any[], userId: string) {
  try {
    const schoolId = await requireSchoolId();
    let importedCount = 0;
    let errorCount = 0;
    const invalidRecords: any[] = [];

    // Process each record inside the loop
    for (const record of expenseList) {
      try {
        if (!record.category || !record.amount || !record.description) {
          throw new Error('Category, Description, and Amount are required.');
        }

        // Support both "date(YYYY-MM-DD)" and "date" column names
        const dateVal = record['date(YYYY-MM-DD)'] || record.date;
        const dateObj = dateVal ? new Date(dateVal) : new Date();

        await prisma.expense.create({
          data: {
            schoolId,
            category: record.category,
            description: record.description,
            amount: Number(record.amount),
            date: dateObj,
            department: record.department || null,
            recordedBy: userId,
          }
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

    revalidatePath('/admin/expenses');
    return { success: true, importedCount, errorCount, invalidRecords };
  } catch (error: any) {
    console.error('Error bulk creating expenses:', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}

