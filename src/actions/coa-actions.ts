"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetch all account categories with their associated account codes.
 */
export async function getChartOfAccounts() {
  try {
    const categories = await prisma.accountCategory.findMany({
      include: {
        accounts: {
          orderBy: { code: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate totals per category
    const categoriesWithTotals = categories.map(category => {
      const totalBalance = category.accounts.reduce((sum, account) => sum + account.balance, 0);
      return { ...category, totalBalance };
    });

    return { success: true, data: categoriesWithTotals };
  } catch (error) {
    console.error("Error fetching Chart of Accounts:", error);
    return { success: false, error: "Failed to fetch Chart of Accounts" };
  }
}

/**
 * Fetch all flat account codes (useful for dropdowns)
 */
export async function getAccountCodes() {
  try {
    const accounts = await prisma.accountCode.findMany({
      include: { category: true },
      orderBy: { code: 'asc' }
    });
    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching Account Codes:", error);
    return { success: false, error: "Failed to fetch Account Codes" };
  }
}

/**
 * Create a new account category
 */
export async function createAccountCategory(data: { name: string; description?: string }) {
  try {
    const existing = await prisma.accountCategory.findUnique({ where: { name: data.name } });
    if (existing) {
      return { success: false, error: "Category with this name already exists" };
    }

    const category = await prisma.accountCategory.create({
      data: {
        name: data.name,
        description: data.description,
      }
    });

    revalidatePath("/dashboard/finance/chart-of-accounts");
    return { success: true, data: category };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "Failed to create category" };
  }
}

/**
 * Create a new account code
 */
export async function createAccountCode(data: { code: string; name: string; categoryId: string; balance?: number }) {
  try {
    const existing = await prisma.accountCode.findUnique({ where: { code: data.code } });
    if (existing) {
      return { success: false, error: "Account code already exists" };
    }

    const account = await prisma.accountCode.create({
      data: {
        code: data.code,
        name: data.name,
        categoryId: data.categoryId,
        balance: data.balance || 0.0,
      }
    });

    revalidatePath("/dashboard/finance/chart-of-accounts");
    revalidatePath("/dashboard/finance/ledger");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error creating account code:", error);
    return { success: false, error: "Failed to create account code" };
  }
}

/**
 * Update an existing account code
 */
export async function updateAccountCode(id: string, data: { name?: string; code?: string; balance?: number }) {
  try {
    if (data.code) {
      const existing = await prisma.accountCode.findFirst({
        where: { code: data.code, id: { not: id } }
      });
      if (existing) {
        return { success: false, error: "Another account is already using this code" };
      }
    }

    const account = await prisma.accountCode.update({
      where: { id },
      data
    });

    revalidatePath("/dashboard/finance/chart-of-accounts");
    revalidatePath("/dashboard/finance/ledger");
    return { success: true, data: account };
  } catch (error) {
    console.error("Error updating account code:", error);
    return { success: false, error: "Failed to update account code" };
  }
}

/**
 * Delete an account code (only if no journal lines exist)
 */
export async function deleteAccountCode(id: string) {
  try {
    const linesCount = await prisma.journalLine.count({ where: { accountId: id } });
    
    if (linesCount > 0) {
      return { success: false, error: "Cannot delete account: it has associated transaction lines." };
    }

    await prisma.accountCode.delete({ where: { id } });

    revalidatePath("/dashboard/finance/chart-of-accounts");
    revalidatePath("/dashboard/finance/ledger");
    return { success: true };
  } catch (error) {
    console.error("Error deleting account code:", error);
    return { success: false, error: "Failed to delete account code" };
  }
}
