import { prisma } from '@/lib/prisma';
import { StaffMemo } from '@prisma/client';

/**
 * Triggered automatically when a LEAVE_REQUEST memo is APPROVED.
 * Creates an AttendanceLog entry marking the staff as on leave for the requested dates.
 */
export async function handleLeaveRequestApproval(memo: StaffMemo) {
  if (!memo.metadata) return;
  
  try {
    const meta = JSON.parse(memo.metadata);
    const startDateStr = meta.startDate; // e.g., "2026-08-10"
    const endDateStr = meta.endDate; // e.g., "2026-08-12"
    
    if (!startDateStr || !endDateStr) return;
    
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    // We will generate an attendance log for every day in the date range
    let currentDate = new Date(start);
    while (currentDate <= end) {
      // 3 means "On Leave / Authorized Absence" in our generic BAS mapping
      await prisma.staffAttendance.create({
        data: {
          staffId: memo.senderId,
          date: new Date(currentDate),
          type: 3, 
          source: 'COMMUNICATION_HUB_MEMO',
          memoId: memo.id,
        }
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`Leave Request ${memo.reference} processed and logged to BAS.`);
  } catch (err) {
    console.error("Failed to parse memo metadata or update BAS", err);
  }
}

/**
 * Triggered automatically when a CASH_VOUCHER memo is APPROVED.
 * Creates an Expense record in the Finance module for reimbursement or tracking.
 */
export async function handleVoucherApproval(memo: StaffMemo, approvedById: string) {
  if (!memo.metadata) return;
  
  try {
    const meta = JSON.parse(memo.metadata);
    const amount = Number(meta.amount);
    
    if (isNaN(amount)) return;

    await prisma.expense.create({
      data: {
        category: 'Cash Voucher',
        description: `Voucher Ref: ${memo.reference} - ${memo.title}`,
        amount: amount,
        date: new Date(),
        department: meta.department || 'General',
        recordedBy: approvedById,
        memoId: memo.id,
      }
    });
    console.log(`Cash Voucher ${memo.reference} processed and Expense created.`);
  } catch (err) {
    console.error("Failed to parse memo metadata or update Finance", err);
  }
}
