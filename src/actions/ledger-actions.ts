"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

export async function getLedgerData() {
  try {
    const [categories, accounts, entries] = await Promise.all([
      prisma.accountCategory.findMany(),
      prisma.accountCode.findMany({
        include: {
          category: true,
        },
        orderBy: { code: "asc" }
      }),
      prisma.journalEntry.findMany({
        take: 250,
        include: {
          recordedBy: {
            select: { firstName: true, lastName: true }
          },
          lines: {
            include: {
              account: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      }),
    ]);

    return { success: true, data: { categories, accounts, entries } };
  } catch (error) {
    console.error("Error fetching ledger data:", error);
    return { success: false, error: "Failed to fetch ledger data" };
  }
}

export async function createJournalEntry(data: {
  description: string;
  reference?: string;
  date?: Date | string;
  recordedById?: string;
  lines: {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
}) {
  if (!data.description || data.description.trim() === "") {
    throw new Error("Journal entry description is required");
  }

  if (!data.lines || data.lines.length < 2) {
    throw new Error("A journal entry requires at least two lines (double-entry)");
  }

  const totalDebit = data.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Transaction is unbalanced: Total Debits (₦${totalDebit.toFixed(2)}) must equal Total Credits (₦${totalCredit.toFixed(2)})`);
  }

  if (totalDebit <= 0) {
    throw new Error("Total entry value must be greater than zero");
  }

  let userId = data.recordedById;
  if (!userId) {
    try {
      const session = await auth();
      userId = (session?.user as any)?.id;
    } catch {
      userId = undefined;
    }
  }

  if (userId) {
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) userId = undefined;
  }

  if (!userId) {
    const fallback = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"] } },
      select: { id: true }
    }) || await prisma.user.findFirst({ select: { id: true } });
    userId = fallback?.id;
  }

  if (!userId) {
    throw new Error("A valid user account is required to record journal entries.");
  }

  const ref = data.reference || `JE-${Date.now().toString().slice(-6)}`;

  const entry = await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        description: data.description.trim(),
        reference: ref,
        date: data.date ? new Date(data.date) : new Date(),
        recordedById: userId!,
        lines: {
          create: data.lines.map(line => ({
            accountId: line.accountId,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0,
            description: line.description || null,
          }))
        }
      },
      include: {
        lines: { include: { account: true } }
      }
    });

    const accountIds = Array.from(new Set(data.lines.map(l => l.accountId)));
    const accounts = await tx.accountCode.findMany({
      where: { id: { in: accountIds } },
      include: { category: true },
    });
    const accountMap = new Map<string, any>(accounts.map((a: any) => [a.id, a]));

    await Promise.all(
      data.lines.map((line) => {
        const account = accountMap.get(line.accountId);
        const catName = (account?.category?.name || "").toLowerCase();
        const isCreditNormal =
          catName.includes("liability") ||
          catName.includes("equity") ||
          catName.includes("revenue");
        const debitVal = Number(line.debit) || 0;
        const creditVal = Number(line.credit) || 0;
        const netChange = isCreditNormal ? creditVal - debitVal : debitVal - creditVal;

        return tx.accountCode.update({
          where: { id: line.accountId },
          data: { balance: { increment: netChange } },
        });
      })
    );

    return je;
  });

  try {
    revalidatePath("/dashboard/finance/ledger");
    revalidatePath("/dashboard/finance/chart-of-accounts");
  } catch {}
  return { success: true, entry };
}
