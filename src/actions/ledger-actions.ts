"use server";

import { prisma } from "@/lib/prisma";

export async function getLedgerData() {
  try {
    const categories = await prisma.accountCategory.findMany();
    const accounts = await prisma.accountCode.findMany({
      include: {
        category: true,
      },
    });
    const entries = await prisma.journalEntry.findMany({
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: { categories, accounts, entries } };
  } catch (error) {
    console.error("Error fetching ledger data:", error);
    return { success: false, error: "Failed to fetch ledger data" };
  }
}
