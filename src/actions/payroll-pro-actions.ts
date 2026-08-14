"use server";

import { prisma } from "@/lib/prisma";

export async function getLoansData() {
  try {
    const loans = await prisma.staffLoan.findMany({
      include: {
        user: true,
      },
    });

    const allowances = await prisma.payrollAllowance.findMany({
      include: {
        user: true,
      },
    });

    return { success: true, data: { loans, allowances } };
  } catch (error) {
    console.error("Error fetching loans data:", error);
    return { success: false, error: "Failed to fetch loans data" };
  }
}
