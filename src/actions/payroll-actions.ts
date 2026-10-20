"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { STAFF_FILTER } from "@/lib/dal/staff-repository";
import { CommEngine } from "@/lib/services/comm-engine";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

/**
 * Statutory Nigerian PAYE Tax Calculator (Personal Income Tax Act - PITA)
 * Implements official Consolidated Relief Allowance (CRA), Pension Relief, and progressive tax bands.
 */
function calculateNigerianPaye(grossMonthly: number, pensionMonthly = 0): {
  taxableIncome: number;
  cra: number;
  pension: number;
  monthlyTax: number;
  effectiveRate: number;
} {
  const annualGross = grossMonthly * 12;
  const annualPension = pensionMonthly * 12;

  // 1. Consolidated Relief Allowance (CRA)
  // Higher of ₦200,000 or 1% of Gross, plus 20% of Gross
  const baseCRA = Math.max(200000, 0.01 * annualGross);
  const totalCRA = baseCRA + 0.20 * annualGross;

  // Tax-exempt statutory reliefs
  const totalRelief = totalCRA + annualPension;

  // 2. Chargeable / Taxable Income
  const chargeableIncome = Math.max(0, annualGross - totalRelief);

  // If taxable income is zero or less, statutory minimum tax applies (1% of Gross)
  if (chargeableIncome <= 0) {
    const minAnnualTax = 0.01 * annualGross;
    const monthlyTax = Math.round((minAnnualTax / 12) * 100) / 100;
    return {
      taxableIncome: 0,
      cra: Math.round(totalCRA / 12),
      pension: Math.round(pensionMonthly),
      monthlyTax,
      effectiveRate: grossMonthly > 0 ? Math.round((monthlyTax / grossMonthly) * 1000) / 10 : 0,
    };
  }

  // 3. Official Progressive Tax Bands (Annual)
  const bands = [
    { limit: 300000, rate: 0.07 }, // First ₦300k @ 7%
    { limit: 300000, rate: 0.11 }, // Next ₦300k @ 11%
    { limit: 500000, rate: 0.15 }, // Next ₦500k @ 15%
    { limit: 500000, rate: 0.19 }, // Next ₦500k @ 19%
    { limit: 1600000, rate: 0.21 }, // Next ₦1.6M @ 21%
    { limit: Infinity, rate: 0.24 }, // Remainder @ 24%
  ];

  let remaining = chargeableIncome;
  let annualTax = 0;

  for (const band of bands) {
    if (remaining <= 0) break;
    const taxableInBand = Math.min(remaining, band.limit);
    annualTax += taxableInBand * band.rate;
    remaining -= taxableInBand;
  }

  // Ensure tax is not lower than statutory minimum tax (1% of Gross)
  annualTax = Math.max(annualTax, 0.01 * annualGross);

  const monthlyTax = Math.round((annualTax / 12) * 100) / 100;
  const effectiveRate = grossMonthly > 0 ? Math.round((monthlyTax / grossMonthly) * 1000) / 10 : 0;

  return {
    taxableIncome: Math.round(chargeableIncome / 12),
    cra: Math.round(totalCRA / 12),
    pension: Math.round(pensionMonthly),
    monthlyTax,
    effectiveRate,
  };
}

/**
 * Calculates attendance penalties from biometric logs (BAS)
 */
async function calculateAttendancePenalty(staffId: string, month: number, year: number, baseSalary: number) {
  try {
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const logs = await prisma.staffAttendance.findMany({
      where: {
        staffId,
        date: { gte: startDate, lte: endDate },
      },
      select: {
        isLate: true,
        latenessMinutes: true,
        date: true,
      }
    });

    const lateLogs = logs.filter(l => l.isLate);
    const lateCount = lateLogs.length;
    const totalLateMinutes = lateLogs.reduce((sum, l) => sum + (l.latenessMinutes || 0), 0);

    // Standard attendance policy: ₦500 per late arrival occurrence
    const penalty = lateCount * 500;
    const cappedPenalty = Math.min(penalty, baseSalary * 0.20); // capped at 20% of base

    return {
      lateCount,
      totalLateMinutes,
      penalty: cappedPenalty,
      report: JSON.stringify({
        totalLogs: logs.length,
        lateCount,
        totalLateMinutes,
        penalty: cappedPenalty,
      })
    };
  } catch (error) {
    console.error("[calculateAttendancePenalty] error:", error);
    return { lateCount: 0, totalLateMinutes: 0, penalty: 0, report: null };
  }
}

/**
 * Calculates active staff loan deductions
 */
async function calculateStaffLoanDeduction(userId: string) {
  try {
    const loans = await prisma.staffLoan.findMany({
      where: {
        userId,
        status: "APPROVED",
        remainingBalance: { gt: 0 }
      }
    });

    let totalDeduction = 0;
    const details: { loanId: string; deduction: number; balance: number }[] = [];

    for (const loan of loans) {
      const deduction = Math.min(loan.monthlyDeduction, loan.remainingBalance);
      totalDeduction += deduction;
      details.push({
        loanId: loan.id,
        deduction,
        balance: loan.remainingBalance,
      });
    }

    return { totalDeduction, details };
  } catch (error) {
    console.error("[calculateStaffLoanDeduction] error:", error);
    return { totalDeduction: 0, details: [] };
  }
}

export async function getPayrollRecords(
  month: number,
  year: number,
  options?: { hideZeroSalary?: boolean; departmentId?: string; search?: string }
) {
  const where: any = { month, year };

  // By default, filter out zero baseSalary accounts unless requested
  if (options?.hideZeroSalary !== false) {
    where.baseAmount = { gt: 0 };
  }

  if (options?.departmentId && options.departmentId !== "ALL") {
    where.user = { departmentId: options.departmentId };
  }

  const records = await prisma.payroll.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          staffId: true,
          bankName: true,
          accountNumber: true,
          accountName: true,
          department: { select: { id: true, name: true } },
        }
      }
    },
    orderBy: { user: { firstName: 'asc' } }
  });

  // Client-side search filtering if provided
  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    return records.filter(r => {
      const name = `${r.user.firstName} ${r.user.lastName}`.toLowerCase();
      const staffId = (r.user.staffId || "").toLowerCase();
      const dept = (r.user.department?.name || "").toLowerCase();
      return name.includes(q) || staffId.includes(q) || dept.includes(q);
    });
  }

  return records;
}

export async function generateMonthlyPayroll(
  month: number,
  year: number,
  options?: {
    applyAttendance?: boolean;
    applyPaye?: boolean;
    applyLoans?: boolean;
    includeZeroSalary?: boolean;
    defaultSalary?: number;
  }
) {
  // Check if we already generated payroll for this month/year
  const existingCount = await prisma.payroll.count({
    where: { month, year }
  });

  if (existingCount > 0) {
    throw new Error(`Payroll batch for ${month}/${year} has already been generated. Delete or edit existing records to re-process.`);
  }

  // Fetch all active staff
  const staff = await prisma.user.findMany({
    where: {
      ...STAFF_FILTER,
      status: { in: ["active", "ACTIVE"] }
    },
    include: {
      department: true,
      allowances: { where: { isRecurring: true } },
    }
  });

  if (staff.length === 0) {
    throw new Error("No active staff found in the system.");
  }

  let generatedCount = 0;
  const applyAttendance = options?.applyAttendance !== false;
  const applyPaye = options?.applyPaye !== false;
  const applyLoans = options?.applyLoans !== false;

  for (const s of staff) {
    let baseAmount = s.baseSalary || 0;

    // Filter out zero-salary accounts if not requested
    if (baseAmount <= 0) {
      if (options?.includeZeroSalary) {
        baseAmount = 0;
      } else {
        // Skip accounts without configured salary
        continue;
      }
    }

    // 1. Calculate Allowances
    const totalAllowances = (s.allowances || []).reduce((sum, a) => sum + a.amount, 0);
    const bonuses = 0;
    const grossMonthly = baseAmount + totalAllowances + bonuses;

    // 2. Statutory Pension (8% of Base + Qualifying Allowances)
    const pension = grossMonthly > 0 ? Math.round(grossMonthly * 0.08) : 0;

    // 3. Statutory Nigerian PAYE Tax
    let tax = 0;
    if (applyPaye && grossMonthly > 0) {
      const taxResult = calculateNigerianPaye(grossMonthly, pension);
      tax = taxResult.monthlyTax;
    }

    // 4. Biometric Attendance Penalties
    let attendancePenalty = 0;
    let basReport: string | null = null;
    if (applyAttendance && baseAmount > 0) {
      const attResult = await calculateAttendancePenalty(s.id, month, year, baseAmount);
      attendancePenalty = attResult.penalty;
      basReport = attResult.report;
    }

    // 5. Staff Loan Recoveries
    let loanDeduction = 0;
    if (applyLoans) {
      const loanResult = await calculateStaffLoanDeduction(s.id);
      loanDeduction = loanResult.totalDeduction;
    }

    // Total deductions & Net Pay
    const totalDeductions = tax + pension + attendancePenalty + loanDeduction;
    const netAmount = Math.max(0, grossMonthly - totalDeductions);

    await prisma.payroll.create({
      data: {
        userId: s.id,
        month,
        year,
        baseAmount,
        allowances: totalAllowances,
        bonuses,
        tax,
        pension,
        attendancePenalty,
        loanDeduction,
        deductions: totalDeductions,
        netAmount,
        basReport,
        status: "pending"
      }
    });

    generatedCount++;
  }

  safeRevalidatePath("/dashboard/finance/payroll");
  return { generatedCount };
}

export async function holdSalary(payrollId: string, reason: string) {
  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error("A reason is mandatory when placing a salary on hold.");
  }

  const record = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!record) throw new Error("Payroll record not found");
  if (record.status === "paid") throw new Error("Cannot place an already disbursed salary on hold.");

  let actorId: string | null = null;
  try {
    const session = await auth();
    actorId = (session?.user as any)?.id || null;
  } catch {}

  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: "held",
      holdReason: trimmedReason,
      heldAt: new Date(),
      heldById: actorId,
    }
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true, message: "Salary placed on hold." };
}

export async function releaseSalaryHold(payrollId: string) {
  const record = await prisma.payroll.findUnique({ where: { id: payrollId } });
  if (!record) throw new Error("Payroll record not found");
  if (record.status !== "held") throw new Error("This record is not currently on hold.");

  await prisma.payroll.update({
    where: { id: payrollId },
    data: {
      status: "pending",
      holdReason: null,
      heldAt: null,
      heldById: null,
    }
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true, message: "Salary hold released. Record is now eligible for disbursement." };
}

export async function disburseBatch(month: number, year: number) {
  const pendingRecords = await prisma.payroll.findMany({
    where: {
      month,
      year,
      status: "pending" // Skips 'held' and 'paid' records
    },
    include: {
      user: true
    }
  });

  if (pendingRecords.length === 0) {
    throw new Error("No pending salary records found to disburse for this batch.");
  }

  let actorId: string | undefined;
  try {
    const session = await auth();
    actorId = (session?.user as any)?.id;
  } catch {}

  if (!actorId) {
    const fallback = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"] } },
      select: { id: true }
    });
    actorId = fallback?.id;
  }

  const totalDisbursed = pendingRecords.reduce((sum, r) => sum + r.netAmount, 0);

  // Execute in transaction: update records, deduct loans, create expense
  await prisma.$transaction(async (tx) => {
    // 1. Mark payroll records as paid
    await tx.payroll.updateMany({
      where: {
        month,
        year,
        status: "pending"
      },
      data: {
        status: "paid",
        paidAt: new Date(),
        disbursedById: actorId,
      }
    });

    // 2. Reduce remaining balance on active loans
    for (const r of pendingRecords) {
      if (r.loanDeduction > 0) {
        const userLoans = await tx.staffLoan.findMany({
          where: {
            userId: r.userId,
            status: "APPROVED",
            remainingBalance: { gt: 0 }
          }
        });

        let remainingDeduction = r.loanDeduction;
        for (const loan of userLoans) {
          if (remainingDeduction <= 0) break;
          const toDeduct = Math.min(loan.remainingBalance, remainingDeduction);
          const newBal = Math.max(0, loan.remainingBalance - toDeduct);
          remainingDeduction -= toDeduct;

          await tx.staffLoan.update({
            where: { id: loan.id },
            data: {
              remainingBalance: newBal,
              status: newBal <= 0 ? "COMPLETED" : "APPROVED",
            }
          });
        }
      }
    }

    // 3. Log expense record for general ledger
    await tx.expense.create({
      data: {
        category: "Payroll",
        description: `Monthly Payroll Batch Disbursement (${month}/${year}) for ${pendingRecords.length} staff members`,
        amount: totalDisbursed,
        date: new Date(),
        department: "Administration",
        recordedBy: actorId || pendingRecords[0].userId,
      }
    });
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  safeRevalidatePath("/dashboard/finance/expenses");
  safeRevalidatePath("/dashboard/finance/reports");

  return {
    success: true,
    count: pendingRecords.length,
    totalDisbursed,
    message: `Successfully disbursed ₦${totalDisbursed.toLocaleString()} to ${pendingRecords.length} staff members.`,
  };
}

export async function markPayrollPaid(id: string) {
  const record = await prisma.payroll.findUnique({
    where: { id },
    include: { user: true }
  });
  if (!record) throw new Error("Payroll record not found");
  if (record.status === "paid") throw new Error("Already paid");
  if (record.status === "held") throw new Error("Cannot disburse a record currently on hold. Release the hold first.");

  let adminId: string | undefined;
  try {
    const session = await auth();
    adminId = (session?.user as any)?.id;
  } catch {}

  if (!adminId) {
    const fallback = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN", "ACCOUNTANT"] } },
      select: { id: true }
    });
    adminId = fallback?.id || record.userId;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payroll.update({
      where: { id },
      data: {
        status: "paid",
        paidAt: new Date(),
        disbursedById: adminId,
      }
    });

    // Reduce loan balance if applicable
    if (record.loanDeduction > 0) {
      const loans = await tx.staffLoan.findMany({
        where: { userId: record.userId, status: "APPROVED", remainingBalance: { gt: 0 } }
      });
      let remaining = record.loanDeduction;
      for (const loan of loans) {
        if (remaining <= 0) break;
        const deduct = Math.min(loan.remainingBalance, remaining);
        const newBal = Math.max(0, loan.remainingBalance - deduct);
        remaining -= deduct;
        await tx.staffLoan.update({
          where: { id: loan.id },
          data: {
            remainingBalance: newBal,
            status: newBal <= 0 ? "COMPLETED" : "APPROVED"
          }
        });
      }
    }

    await tx.expense.create({
      data: {
        category: "Payroll",
        description: `Individual salary payout for ${record.user.firstName} ${record.user.lastName} (${record.month}/${record.year})`,
        amount: record.netAmount,
        date: new Date(),
        department: record.user.role,
        recordedBy: adminId
      }
    });
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  safeRevalidatePath("/dashboard/finance/expenses");
  safeRevalidatePath("/dashboard/finance/reports");
  return { success: true };
}

export async function updatePayrollRecord(
  id: string,
  data: { bonuses?: number; deductions?: number; tax?: number; allowances?: number }
) {
  const record = await prisma.payroll.findUnique({ where: { id } });
  if (!record) throw new Error("Payroll record not found");
  if (record.status === "paid") throw new Error("Cannot edit an already disbursed payroll record");

  const bonuses = data.bonuses !== undefined ? data.bonuses : record.bonuses;
  const allowances = data.allowances !== undefined ? data.allowances : record.allowances;
  const tax = data.tax !== undefined ? data.tax : record.tax;
  const otherDeductions = data.deductions !== undefined ? data.deductions : (record.deductions - record.tax - record.pension - record.attendancePenalty - record.loanDeduction);

  const totalDeductions = tax + record.pension + record.attendancePenalty + record.loanDeduction + Math.max(0, otherDeductions);
  const netAmount = Math.max(0, record.baseAmount + allowances + bonuses - totalDeductions);

  await prisma.payroll.update({
    where: { id },
    data: {
      bonuses,
      allowances,
      tax,
      deductions: totalDeductions,
      netAmount,
    }
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true };
}

export async function getStaffSalaryList(options?: { hideZeroSalary?: boolean }) {
  const where: any = {
    ...STAFF_FILTER,
    status: { in: ["active", "ACTIVE"] }
  };

  if (options?.hideZeroSalary) {
    where.baseSalary = { gt: 0 };
  }

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      staffId: true,
      baseSalary: true,
      bankName: true,
      accountNumber: true,
      accountName: true,
      department: { select: { id: true, name: true } },
    },
    orderBy: { firstName: "asc" }
  });
}

export async function updateStaffSalary(userId: string, baseSalary: number) {
  if (baseSalary < 0) throw new Error("Base salary cannot be negative");

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { baseSalary },
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true, user: updated };
}

export async function updateStaffBankDetails(
  userId: string,
  data: { bankName: string; accountNumber: string; accountName?: string }
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      bankName: data.bankName?.trim() || null,
      accountNumber: data.accountNumber?.trim() || null,
      accountName: data.accountName?.trim() || null,
    }
  });

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true, user: updated };
}

export async function seedDefaultStaffSalaries() {
  const staff = await prisma.user.findMany({
    where: STAFF_FILTER
  });

  const roleDefaults: Record<string, number> = {
    ADMIN: 250000,
    SUPER_ADMIN: 300000,
    PRINCIPAL: 300000,
    SLT: 280000,
    HOD: 200000,
    ACCOUNTANT: 220000,
    EXAM_OFFICER: 190000,
    TEACHER: 150000,
  };

  let count = 0;
  for (const s of staff) {
    const salary = roleDefaults[s.role] || 120000;
    await prisma.user.update({
      where: { id: s.id },
      data: { baseSalary: salary }
    });
    count++;
  }

  safeRevalidatePath("/dashboard/finance/payroll");
  return { success: true, count };
}

export async function getPayslip(payrollId: string) {
  const record = await prisma.payroll.findUnique({
    where: { id: payrollId },
    include: {
      user: {
        include: {
          department: true
        }
      }
    }
  });

  if (!record) throw new Error("Payroll record not found");

  const school = await prisma.systemProfile.findFirst() || {
    name: "Proxima SMS Academy",
    address: "School Campus",
    email: "bursary@proximaschools.edu",
    phone: "+234 (0) 800 123 4567",
    currencySymbol: "₦",
  };

  return { record, school };
}

export async function sendStaffPayslip(payrollId: string) {
  const { record, school } = await getPayslip(payrollId);
  const user = record.user;

  if (!user.email && !user.phone) {
    throw new Error("No registered email or phone number found for this staff member.");
  }

  const currency = (school as any)?.currencySymbol || "₦";
  const monthName = new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long' });
  const staffName = `${user.firstName} ${user.lastName}`;

  const messageText = `OFFICIAL SALARY PAYSLIP - ${monthName.toUpperCase()} ${record.year}
Dear ${staffName},
Your payslip for ${monthName} ${record.year} is ready:
• Base Salary: ${currency}${record.baseAmount.toLocaleString()}
• Allowances: ${currency}${record.allowances.toLocaleString()}
• Gross Earnings: ${currency}${(record.baseAmount + record.allowances + record.bonuses).toLocaleString()}
• Statutory PAYE Tax: -${currency}${record.tax.toLocaleString()}
• Pension Deduction: -${currency}${record.pension.toLocaleString()}
• Loan Repayment: -${currency}${record.loanDeduction.toLocaleString()}
• Attendance Deductions: -${currency}${record.attendancePenalty.toLocaleString()}
• NET PAYABLE: ${currency}${record.netAmount.toLocaleString()}
Status: ${record.status.toUpperCase()}
Issued by ${school.name} Bursary.`;

  if (user.email) {
    await CommEngine.sendEmail({
      to: user.email,
      subject: `Salary Payslip: ${monthName} ${record.year} - ${school.name}`,
      text: messageText,
    });
  } else if (user.phone) {
    await CommEngine.sendWhatsApp(user.phone, messageText);
  }

  await prisma.payroll.update({
    where: { id: payrollId },
    data: { payslipSentAt: new Date() }
  });

  return { success: true, message: `Payslip dispatched to ${user.email || user.phone}` };
}

export async function getPayrollComparison(month: number, year: number) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [currentRecords, prevRecords] = await Promise.all([
    prisma.payroll.findMany({ where: { month, year } }),
    prisma.payroll.findMany({ where: { month: prevMonth, year: prevYear } }),
  ]);

  const currentTotal = currentRecords.reduce((sum, r) => sum + r.netAmount, 0);
  const prevTotal = prevRecords.reduce((sum, r) => sum + r.netAmount, 0);

  const diffAmount = currentTotal - prevTotal;
  const diffPercent = prevTotal > 0 ? Math.round((diffAmount / prevTotal) * 1000) / 10 : 0;

  return {
    currentTotal,
    prevTotal,
    diffAmount,
    diffPercent,
    currentCount: currentRecords.length,
    prevCount: prevRecords.length,
  };
}

export async function getDepartmentTotals(month: number, year: number) {
  const records = await prisma.payroll.findMany({
    where: { month, year },
    include: {
      user: {
        select: {
          department: { select: { name: true } }
        }
      }
    }
  });

  const deptMap: { [dept: string]: { name: string; totalNet: number; count: number; totalBase: number } } = {};

  records.forEach(r => {
    const deptName = r.user.department?.name || "Unassigned";
    if (!deptMap[deptName]) {
      deptMap[deptName] = { name: deptName, totalNet: 0, count: 0, totalBase: 0 };
    }
    deptMap[deptName].totalNet += r.netAmount;
    deptMap[deptName].totalBase += r.baseAmount;
    deptMap[deptName].count += 1;
  });

  return Object.values(deptMap).sort((a, b) => b.totalNet - a.totalNet);
}

export async function getPayrollDepartments() {
  return await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });
}

export async function getActiveStaffLoans() {
  return await prisma.staffLoan.findMany({
    where: { status: "APPROVED", remainingBalance: { gt: 0 } },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          staffId: true,
          role: true,
          department: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}
