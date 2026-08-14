'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, getDay } from 'date-fns';
import { isLate } from '@/lib/bas-utils';
import { requireFinanceAccess } from '@/lib/guards';

/**
 * Generate monthly payroll for all active staff
 * Deducts daily rate for unapproved absences.
 * Deducts latenessPenalty for late arrivals.
 */
export async function generateMonthlyPayroll(month: number, year: number, latenessPenalty = 1000) {
  try {
    await requireFinanceAccess();

    const startDate = new Date(year, month - 1, 1);
    const endDate = endOfMonth(startDate);
    
    // Check if payroll already generated for this month
    const existing = await prisma.payroll.findFirst({
      where: { month, year }
    });
    
    if (existing) {
      return { success: false, message: 'Payroll for this month has already been generated.' };
    }

    const activeStaff = await prisma.user.findMany({
      where: { status: 'active', role: { not: 'STUDENT' } },
      include: { shift: true }
    });

    const activeSubscriptions = await prisma.staffPayrollSubscription.findMany({
      where: { status: 'ACTIVE' },
      include: { subscriptionType: true }
    });

    const approvedLeaves = await prisma.staffMemo.findMany({
      where: {
        type: 'LEAVE_REQUEST',
        status: 'APPROVED'
      }
    });

    const holidays = await prisma.holiday.findMany({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });

    const holidayDateStrings: string[] = [];
    for (const h of holidays) {
      const days = eachDayOfInterval({
        start: new Date(Math.max(h.startDate.getTime(), startDate.getTime())),
        end: new Date(Math.min(h.endDate.getTime(), endDate.getTime()))
      });
      for (const d of days) {
        holidayDateStrings.push(format(d, 'yyyy-MM-dd'));
      }
    }

    let processedCount = 0;

    for (const staff of activeStaff) {
      const baseSalary = staff.baseSalary || 0;
      if (baseSalary === 0) continue; // Skip staff with no salary configured

      const attendanceLogs = await prisma.staffAttendance.findMany({
        where: {
          staffId: staff.id,
          date: { gte: startDate, lte: endDate }
        }
      });

      let lateDays = 0;
      let absentDays = 0;
      const basReportLines: string[] = [];
      const presentDateStrings = new Set(attendanceLogs.filter(a => a.type === 1).map(a => format(new Date(a.date), 'yyyy-MM-dd')));

      // Extract all approved leave dates for this staff member
      const staffLeaves = approvedLeaves.filter(l => l.senderId === staff.id);
      const leaveDateStrings = new Set<string>();
      
      for (const leaveMemo of staffLeaves) {
        if (leaveMemo.metadata) {
          try {
            const meta = JSON.parse(leaveMemo.metadata);
            if (meta.startDate && meta.endDate) {
               const leaveDays = eachDayOfInterval({
                 start: new Date(meta.startDate),
                 end: new Date(meta.endDate)
               });
               leaveDays.forEach(d => leaveDateStrings.add(format(d, 'yyyy-MM-dd')));
            }
          } catch(e) {}
        }
      }

      // Calculate working days in the month
      const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
      let totalWorkingDays = 0;
      
      const restDays = (staff.restDays || '6,7').split(',').map((d: string) => parseInt(d.trim()));

      for (const day of daysInMonth) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeekIso = day.getDay() === 0 ? 7 : day.getDay();
        const isRestDay = restDays.includes(dayOfWeekIso);
        const isHoliday = holidayDateStrings.includes(dateStr);
        const isOnLeave = leaveDateStrings.has(dateStr);

        if (!isRestDay && !isHoliday && !isOnLeave) {
          totalWorkingDays++;
          // Check for absence
          if (!presentDateStrings.has(dateStr)) {
            absentDays++;
            basReportLines.push(`Absent on ${dateStr}`);
          }
        } else if (isOnLeave && !isRestDay && !isHoliday) {
          basReportLines.push(`Approved Leave on ${dateStr} (Excused)`);
        }
      }

      // Check for lates and incomplete logs
      let incompleteLogs = 0;
      for (const log of attendanceLogs) {
        if (log.type === 1) { // CLOCK IN
          // 1. Check Lateness
          if (log.isLate || isLate(log, staff)) {
            lateDays++;
            basReportLines.push(`Late on ${format(new Date(log.date), 'yyyy-MM-dd')} (${log.timeIn})`);
          }
          
          // 2. Check Incomplete Logs (No clock out)
          if (!log.timeOut && format(new Date(log.date), 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd')) {
            // If they didn't clock out and it's not today, flag it
            incompleteLogs++;
            basReportLines.push(`Incomplete Log on ${format(new Date(log.date), 'yyyy-MM-dd')} (Did not clock out)`);
          }
        }
      }

      const dailyRate = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : 0;
      const absenceDeduction = absentDays * dailyRate;
      
      // We apply the lateness penalty for both late arrivals and incomplete logs
      const latenessDeduction = (lateDays * latenessPenalty) + (incompleteLogs * latenessPenalty);
      let totalDeductions = absenceDeduction + latenessDeduction;

      // 3. Process Subscriptions
      const staffSubs = activeSubscriptions.filter(s => s.userId === staff.id);
      let subscriptionDeduction = 0;
      const subReportLines: any[] = [];

      for (const sub of staffSubs) {
        let amount = sub.subscriptionType.amount;
        if (sub.subscriptionType.isPercentage) {
          amount = baseSalary * (amount / 100);
        }
        subscriptionDeduction += amount;
        subReportLines.push({
          name: sub.subscriptionType.name,
          amount: amount
        });
      }

      totalDeductions += subscriptionDeduction;

      let netAmount = baseSalary - totalDeductions;
      if (netAmount < 0) netAmount = 0;

      await prisma.payroll.create({
        data: {
          userId: staff.id,
          month,
          year,
          baseAmount: baseSalary,
          deductions: totalDeductions,
          bonuses: 0,
          netAmount: netAmount,
          status: 'pending',
          basReport: JSON.stringify({
            lateDays,
            absentDays,
            incompleteLogs,
            absenceDeduction,
            latenessDeduction,
            logs: basReportLines
          }),
          subscriptionsReport: JSON.stringify({
            total: subscriptionDeduction,
            breakdown: subReportLines
          })
        }
      });
      
      processedCount++;
    }

    revalidatePath('/dashboard/finance/payroll');
    return { success: true, count: processedCount, message: `Successfully processed payroll for ${processedCount} staff members.` };

  } catch (error: any) {
    console.error('Payroll generation error:', error);
    return { success: false, message: error.message };
  }
}

export async function getPayrollHistory() {
  try {
    await requireFinanceAccess();
    const payrolls = await prisma.payroll.findMany({
      include: { user: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });
    return { success: true, history: payrolls };
  } catch (error: any) {
    return { success: false, history: [], message: error.message };
  }
}

export const runPayroll = generateMonthlyPayroll;

export async function getMonthlyPayroll(month: number, year: number) {
  try {
    await requireFinanceAccess();
    const payrolls = await prisma.payroll.findMany({
      where: { month, year },
      include: { user: true }
    });
    return { success: true, payrolls };
  } catch (error: any) {
    return { success: false, payrolls: [], message: error.message };
  }
}

export async function approvePayrollBatch(month: number, year: number) {
  try {
    await requireFinanceAccess();
    await prisma.payroll.updateMany({
      where: { month, year, status: 'pending' },
      data: { status: 'approved' }
    });
    revalidatePath('/dashboard/finance/payroll');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function markPayrollPaid(id: string) {
  try {
    await requireFinanceAccess();
    await prisma.payroll.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() }
    });
    revalidatePath('/dashboard/finance/payroll');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createPayrollSubscriptionType(data: { name: string, amount: number, isPercentage: boolean, description?: string }) {
  try {
    await requireFinanceAccess();
    const type = await prisma.payrollSubscriptionType.create({ data });
    revalidatePath('/dashboard/finance/payroll/subscriptions');
    return { success: true, type };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getPayrollSubscriptionTypes() {
  try {
    const types = await prisma.payrollSubscriptionType.findMany({ where: { isActive: true } });
    return { success: true, types };
  } catch (error: any) {
    return { success: false, types: [], message: error.message };
  }
}


