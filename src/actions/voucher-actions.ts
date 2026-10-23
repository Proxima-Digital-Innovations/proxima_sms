'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export type VoucherStage = 'CREATION' | 'CHECKING' | 'VERIFICATION' | 'APPROVAL' | 'POSTED' | 'CANCELLED';
export type VoucherStatus = 'DRAFT' | 'CHECKED' | 'VERIFIED' | 'APPROVED' | 'POSTED' | 'CANCELLED';

// Helper: Resolve active user or fallback to system administrative account
async function getActiveUser(providedUserId?: string) {
  if (providedUserId) {
    const user = await prisma.user.findUnique({ where: { id: providedUserId } });
    if (user) return user;
  }
  try {
    const session = await auth();
    if (session?.user && (session.user as any).id) {
      const user = await prisma.user.findUnique({ where: { id: (session.user as any).id } });
      if (user) return user;
    }
  } catch {}

  // Fallback to primary admin / finance account
  const fallback = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] } }
  }) || await prisma.user.findFirst();

  return fallback;
}

// Generate sequential reference (e.g. PV2026102200001)
async function generateVoucherReference(voucherClass: string = 'PAYMENT') {
  const prefix = voucherClass === 'RECEIPT' ? 'RV' : voucherClass === 'JOURNAL' ? 'JV' : 'PV';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await prisma.paymentVoucher.count({
    where: {
      voucherNumber: { startsWith: `${prefix}${dateStr}` }
    }
  });
  const seq = (countToday + 1).toString().padStart(5, '0');
  return `${prefix}${dateStr}${seq}`;
}

// ==============================================================================
// 1. FETCH VOUCHERS REGISTRY & FILTERING
// ==============================================================================

export async function getVouchersList(filter?: {
  status?: string;
  voucherClass?: string;
  search?: string;
}) {
  try {
    const where: any = {};
    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }
    if (filter?.voucherClass && filter.voucherClass !== 'ALL') {
      where.voucherClass = filter.voucherClass;
    }
    if (filter?.search) {
      where.OR = [
        { voucherNumber: { contains: filter.search } },
        { payeeName: { contains: filter.search } },
        { narration: { contains: filter.search } },
        { bankTransferRef: { contains: filter.search } },
      ];
    }

    const vouchers = await prisma.paymentVoucher.findMany({
      where,
      include: {
        sourceAccount: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        checkedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        postedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        cancelledBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        lines: { include: { account: true } },
        auditTrail: {
          include: { actor: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: vouchers };
  } catch (error: any) {
    console.error('Error fetching vouchers list:', error);
    return { success: false, error: error.message || 'Failed to fetch vouchers.' };
  }
}

// Fetch single voucher details
export async function getVoucherById(id: string) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id },
      include: {
        sourceAccount: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
        checkedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        postedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        cancelledBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        journalEntry: {
          include: {
            lines: { include: { account: true } }
          }
        },
        lines: {
          include: { account: { include: { category: true } } }
        },
        auditTrail: {
          include: { actor: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!voucher) return { success: false, error: 'Payment voucher not found.' };
    return { success: true, data: voucher };
  } catch (error: any) {
    console.error('Error fetching voucher:', error);
    return { success: false, error: error.message };
  }
}

// Fetch dropdown options: Bank/Cash accounts, Expense accounts, Users for simulation
export async function getVoucherFormDropdowns() {
  try {
    const accounts = await prisma.accountCode.findMany({
      include: { category: true },
      orderBy: { code: 'asc' }
    });

    const sourceAccounts = accounts.filter(acc => {
      const cat = (acc.category?.name || '').toLowerCase();
      return cat.includes('asset') && (acc.name.toLowerCase().includes('bank') || acc.name.toLowerCase().includes('cash'));
    });

    const debitAccounts = accounts.filter(acc => {
      const cat = (acc.category?.name || '').toLowerCase();
      return cat.includes('expense') || cat.includes('asset') || cat.includes('liability');
    });

    const users = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'SLT', 'HOD'] }
      },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
      orderBy: { firstName: 'asc' }
    });

    return {
      success: true,
      data: {
        allAccounts: accounts,
        sourceAccounts: sourceAccounts.length > 0 ? sourceAccounts : accounts,
        debitAccounts,
        users
      }
    };
  } catch (error: any) {
    console.error('Error fetching voucher dropdowns:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 2. CREATE VOUCHER (STAGE: CREATION / DRAFT)
// ==============================================================================

export async function createPaymentVoucherAction(data: {
  voucherClass?: string;
  voucherDate?: string;
  branchOrCampus?: string;
  paymentMethod?: string;
  payeeCategory?: string;
  payeeName: string;
  payeeAddress?: string;
  payeePhone?: string;
  sourceAccountId: string;
  bankTransferRef?: string;
  chequeNumber?: string;
  narration: string;
  whtRate?: number;
  lines: {
    accountId: string;
    description?: string;
    amount: number;
  }[];
  actorUserId?: string;
}) {
  try {
    if (!data.payeeName?.trim()) throw new Error('Payee / Beneficiary Name is required.');
    if (!data.sourceAccountId) throw new Error('Source Bank or Cash Account is required.');
    if (!data.narration?.trim()) throw new Error('Voucher narration / payment purpose is required.');
    if (!data.lines || data.lines.length === 0) throw new Error('At least one debited account line item is required.');

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized user session is required.');

    const grossAmount = data.lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    if (grossAmount <= 0) throw new Error('Gross voucher amount must be greater than zero.');

    const whtRate = Number(data.whtRate) || 0.0;
    const whtAmount = (grossAmount * whtRate) / 100;
    const netAmount = grossAmount - whtAmount;

    const voucherNumber = await generateVoucherReference(data.voucherClass || 'PAYMENT');

    const voucher = await prisma.$transaction(async (tx) => {
      const created = await tx.paymentVoucher.create({
        data: {
          voucherNumber,
          voucherClass: data.voucherClass || 'PAYMENT',
          voucherDate: data.voucherDate ? new Date(data.voucherDate) : new Date(),
          branchOrCampus: data.branchOrCampus || 'Main Campus',
          paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
          payeeCategory: data.payeeCategory || 'SUPPLIER',
          payeeName: data.payeeName.trim(),
          payeeAddress: data.payeeAddress?.trim() || null,
          payeePhone: data.payeePhone?.trim() || null,
          sourceAccountId: data.sourceAccountId,
          bankTransferRef: data.bankTransferRef?.trim() || null,
          chequeNumber: data.chequeNumber?.trim() || null,
          narration: data.narration.trim(),
          grossAmount,
          whtRate,
          whtAmount,
          netAmount,
          status: 'DRAFT',
          currentStage: 'CREATION',
          createdById: user.id,
          lines: {
            create: data.lines.map(l => ({
              accountId: l.accountId,
              description: l.description?.trim() || null,
              amount: Number(l.amount) || 0
            }))
          },
          auditTrail: {
            create: {
              actorId: user.id,
              fromStatus: 'NONE',
              toStatus: 'DRAFT',
              action: 'CREATED',
              remarks: 'Initial voucher creation and draft compilation.'
            }
          }
        },
        include: { lines: true, auditTrail: true }
      });

      return created;
    });

    revalidatePath('/dashboard/finance/vouchers');
    return { success: true, data: voucher, message: `Voucher ${voucherNumber} raised successfully!` };
  } catch (error: any) {
    console.error('Error creating voucher:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 3. EDIT VOUCHER (PERMITTED ONLY IN CREATION/DRAFT STAGE BY CREATOR OR AUTHORIZED)
// ==============================================================================

export async function updatePaymentVoucherAction(data: {
  voucherId: string;
  payeeName?: string;
  payeeAddress?: string;
  payeePhone?: string;
  sourceAccountId?: string;
  paymentMethod?: string;
  bankTransferRef?: string;
  chequeNumber?: string;
  narration?: string;
  whtRate?: number;
  lines?: {
    accountId: string;
    description?: string;
    amount: number;
  }[];
  actorUserId?: string;
  editRemarks?: string;
}) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: data.voucherId },
      include: { lines: true }
    });

    if (!voucher) throw new Error('Voucher not found.');

    // LIFECYCLE RULE ENFORCEMENT:
    // Once checked, verified, approved, or posted, creator cannot edit!
    // Must be in 'DRAFT' status / 'CREATION' stage to be directly edited.
    if (voucher.status !== 'DRAFT' || voucher.currentStage !== 'CREATION') {
      throw new Error(
        `Voucher is locked at stage [${voucher.currentStage} / ${voucher.status}]. It cannot be directly modified unless returned to Creation by an authorized Checker, Verifier, or Approver.`
      );
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized user session is required.');

    let grossAmount = voucher.grossAmount;
    let whtRate = data.whtRate !== undefined ? Number(data.whtRate) : voucher.whtRate;
    let whtAmount = voucher.whtAmount;
    let netAmount = voucher.netAmount;

    if (data.lines && data.lines.length > 0) {
      grossAmount = data.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      whtAmount = (grossAmount * whtRate) / 100;
      netAmount = grossAmount - whtAmount;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If lines updated, recreate them
      if (data.lines && data.lines.length > 0) {
        await tx.paymentVoucherLine.deleteMany({ where: { voucherId: voucher.id } });
        await tx.paymentVoucherLine.createMany({
          data: data.lines.map(l => ({
            voucherId: voucher.id,
            accountId: l.accountId,
            description: l.description?.trim() || null,
            amount: Number(l.amount) || 0
          }))
        });
      }

      const v = await tx.paymentVoucher.update({
        where: { id: voucher.id },
        data: {
          payeeName: data.payeeName?.trim() || voucher.payeeName,
          payeeAddress: data.payeeAddress !== undefined ? data.payeeAddress.trim() : voucher.payeeAddress,
          payeePhone: data.payeePhone !== undefined ? data.payeePhone.trim() : voucher.payeePhone,
          sourceAccountId: data.sourceAccountId || voucher.sourceAccountId,
          paymentMethod: data.paymentMethod || voucher.paymentMethod,
          bankTransferRef: data.bankTransferRef !== undefined ? data.bankTransferRef.trim() : voucher.bankTransferRef,
          chequeNumber: data.chequeNumber !== undefined ? data.chequeNumber.trim() : voucher.chequeNumber,
          narration: data.narration?.trim() || voucher.narration,
          grossAmount,
          whtRate,
          whtAmount,
          netAmount,
          auditTrail: {
            create: {
              actorId: user.id,
              fromStatus: voucher.status,
              toStatus: voucher.status,
              action: 'EDITED',
              remarks: data.editRemarks?.trim() || 'Voucher modified by creator prior to inspection.'
            }
          }
        },
        include: { lines: true, auditTrail: true }
      });

      return v;
    });

    revalidatePath('/dashboard/finance/vouchers');
    return { success: true, data: updated, message: 'Voucher updated successfully.' };
  } catch (error: any) {
    console.error('Error updating voucher:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 4. CHECK VOUCHER (STAGE: CHECKING)
// Checker can forward to VERIFIED or RETURN to CREATOR with remarks
// ==============================================================================

export async function processCheckVoucherAction(data: {
  voucherId: string;
  action: 'CHECK_AND_FORWARD' | 'RETURN_TO_CREATOR';
  remarks?: string;
  actorUserId?: string;
}) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({ where: { id: data.voucherId } });
    if (!voucher) throw new Error('Voucher not found.');

    if (voucher.status !== 'DRAFT' && voucher.status !== 'CHECKED') {
      throw new Error(`Cannot check voucher in status [${voucher.status}]. Must be in DRAFT.`);
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized Checker user is required.');

    let newStatus = voucher.status;
    let newStage = voucher.currentStage;
    let auditAction = '';

    if (data.action === 'CHECK_AND_FORWARD') {
      newStatus = 'CHECKED';
      newStage = 'CHECKING';
      auditAction = 'CHECKED';
    } else {
      // RETURN_TO_CREATOR: unlocks voucher back to DRAFT / CREATION
      if (!data.remarks?.trim()) {
        throw new Error('Checker must provide remarks explaining why the voucher is returned to the creator.');
      }
      newStatus = 'DRAFT';
      newStage = 'CREATION';
      auditAction = 'RETURNED_TO_CREATOR';
    }

    const updated = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: newStatus,
        currentStage: newStage,
        checkedById: user.id,
        checkedAt: new Date(),
        auditTrail: {
          create: {
            actorId: user.id,
            fromStatus: voucher.status,
            toStatus: newStatus,
            action: auditAction,
            remarks: data.remarks?.trim() || 'Checked by Internal Audit & Accounts Compliance.'
          }
        }
      }
    });

    revalidatePath('/dashboard/finance/vouchers');
    return {
      success: true,
      data: updated,
      message: data.action === 'CHECK_AND_FORWARD'
        ? 'Voucher successfully checked and forwarded to Verification.'
        : 'Voucher returned to creator for correction with remarks.'
    };
  } catch (error: any) {
    console.error('Error processing voucher check:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 5. VERIFY VOUCHER (STAGE: VERIFICATION)
// Verifier can forward to APPROVED or RETURN to CHECKER or CREATOR
// ==============================================================================

export async function processVerifyVoucherAction(data: {
  voucherId: string;
  action: 'VERIFY_AND_FORWARD' | 'RETURN_TO_CHECKER' | 'RETURN_TO_CREATOR';
  remarks?: string;
  actorUserId?: string;
}) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({ where: { id: data.voucherId } });
    if (!voucher) throw new Error('Voucher not found.');

    if (voucher.status !== 'CHECKED' && voucher.status !== 'VERIFIED') {
      throw new Error(`Cannot verify voucher in status [${voucher.status}]. Must be CHECKED first.`);
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized Verifier user is required.');

    let newStatus = voucher.status;
    let newStage = voucher.currentStage;
    let auditAction = '';

    if (data.action === 'VERIFY_AND_FORWARD') {
      newStatus = 'VERIFIED';
      newStage = 'VERIFICATION';
      auditAction = 'VERIFIED';
    } else if (data.action === 'RETURN_TO_CHECKER') {
      if (!data.remarks?.trim()) {
        throw new Error('Verifier remarks are required when returning to checker.');
      }
      newStatus = 'DRAFT';
      newStage = 'CHECKING';
      auditAction = 'RETURNED_TO_CHECKER';
    } else {
      if (!data.remarks?.trim()) {
        throw new Error('Verifier remarks are required when returning to creator.');
      }
      newStatus = 'DRAFT';
      newStage = 'CREATION';
      auditAction = 'RETURNED_TO_CREATOR';
    }

    const updated = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: newStatus,
        currentStage: newStage,
        verifiedById: user.id,
        verifiedAt: new Date(),
        auditTrail: {
          create: {
            actorId: user.id,
            fromStatus: voucher.status,
            toStatus: newStatus,
            action: auditAction,
            remarks: data.remarks?.trim() || 'Verified by Chief Auditor / Deputy Bursar.'
          }
        }
      }
    });

    revalidatePath('/dashboard/finance/vouchers');
    return {
      success: true,
      data: updated,
      message: data.action === 'VERIFY_AND_FORWARD'
        ? 'Voucher verified and forwarded to Executive Approver.'
        : `Voucher returned to ${data.action === 'RETURN_TO_CHECKER' ? 'Checker' : 'Creator'} with remarks.`
    };
  } catch (error: any) {
    console.error('Error processing voucher verification:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 6. APPROVE VOUCHER (STAGE: APPROVAL)
// Approver can APPROVE or RETURN with remarks to Verifier, Checker, or Creator.
// Once APPROVED, voucher CANNOT be edited or modified by anyone!
// ==============================================================================

export async function processApproveVoucherAction(data: {
  voucherId: string;
  action: 'APPROVE' | 'RETURN_TO_VERIFIER' | 'RETURN_TO_CHECKER' | 'RETURN_TO_CREATOR';
  remarks?: string;
  actorUserId?: string;
}) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({ where: { id: data.voucherId } });
    if (!voucher) throw new Error('Voucher not found.');

    if (voucher.status !== 'VERIFIED' && voucher.status !== 'APPROVED') {
      throw new Error(`Cannot approve voucher in status [${voucher.status}]. Must be VERIFIED first.`);
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized Approver user is required.');

    let newStatus = voucher.status;
    let newStage = voucher.currentStage;
    let auditAction = '';

    if (data.action === 'APPROVE') {
      newStatus = 'APPROVED';
      newStage = 'APPROVAL';
      auditAction = 'APPROVED';
    } else {
      if (!data.remarks?.trim()) {
        throw new Error('Approver remarks are required when returning a voucher.');
      }
      if (data.action === 'RETURN_TO_VERIFIER') {
        newStatus = 'CHECKED';
        newStage = 'VERIFICATION';
        auditAction = 'RETURNED_TO_VERIFIER';
      } else if (data.action === 'RETURN_TO_CHECKER') {
        newStatus = 'DRAFT';
        newStage = 'CHECKING';
        auditAction = 'RETURNED_TO_CHECKER';
      } else {
        newStatus = 'DRAFT';
        newStage = 'CREATION';
        auditAction = 'RETURNED_TO_CREATOR';
      }
    }

    const updated = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: newStatus,
        currentStage: newStage,
        approvedById: data.action === 'APPROVE' ? user.id : voucher.approvedById,
        approvedAt: data.action === 'APPROVE' ? new Date() : voucher.approvedAt,
        auditTrail: {
          create: {
            actorId: user.id,
            fromStatus: voucher.status,
            toStatus: newStatus,
            action: auditAction,
            remarks: data.remarks?.trim() || (data.action === 'APPROVE' ? 'Officially Approved by Bursar / Vice Chancellor.' : 'Returned with remarks.')
          }
        }
      }
    });

    revalidatePath('/dashboard/finance/vouchers');
    return {
      success: true,
      data: updated,
      message: data.action === 'APPROVE'
        ? 'Payment Voucher APPROVED! The voucher is now locked against all modifications and ready for posting.'
        : `Voucher returned to ${data.action.replace('RETURN_TO_', '')} with remarks.`
    };
  } catch (error: any) {
    console.error('Error processing voucher approval:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 7. POST VOUCHER TO GENERAL LEDGER (DOUBLE-ENTRY POSTING)
// Debits all line accounts, Credits Source Bank/Cash, and creates JournalEntry
// ==============================================================================

export async function postVoucherToLedgerAction(data: {
  voucherId: string;
  remarks?: string;
  actorUserId?: string;
}) {
  try {
    const voucher = await prisma.paymentVoucher.findUnique({
      where: { id: data.voucherId },
      include: {
        lines: { include: { account: { include: { category: true } } } },
        sourceAccount: { include: { category: true } }
      }
    });

    if (!voucher) throw new Error('Voucher not found.');

    if (voucher.status !== 'APPROVED') {
      throw new Error(`Only APPROVED vouchers can be posted to the General Ledger. Current status: [${voucher.status}].`);
    }

    if (voucher.journalEntryId) {
      throw new Error('This voucher has already been posted to the General Ledger.');
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized Posting Officer session is required.');

    // Build Double-Entry Journal Lines
    // Debits: all voucher line items
    // Credit: source bank/cash account for net amount (plus WHT liability if applicable)
    const journalLines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // Add debit lines
    voucher.lines.forEach(l => {
      journalLines.push({
        accountId: l.accountId,
        debit: Number(l.amount) || 0,
        credit: 0.0,
        description: l.description || `Disbursement: ${voucher.payeeName}`
      });
    });

    // If Withholding Tax exists, credit WHT Payable
    if (voucher.whtAmount > 0) {
      // Find or link a WHT payable account (liability)
      const whtAccount = await prisma.accountCode.findFirst({
        where: {
          OR: [
            { code: '2100' },
            { name: { contains: 'Tax' } },
            { name: { contains: 'Payable' } }
          ]
        }
      });
      if (whtAccount) {
        journalLines.push({
          accountId: whtAccount.id,
          debit: 0.0,
          credit: voucher.whtAmount,
          description: `Withholding Tax (${voucher.whtRate}%) deduction on ${voucher.voucherNumber}`
        });
      }
    }

    // Add credit line for source bank/cash
    journalLines.push({
      accountId: voucher.sourceAccountId,
      debit: 0.0,
      credit: voucher.whtAmount > 0 ? voucher.netAmount : voucher.grossAmount,
      description: `Payment to ${voucher.payeeName} (${voucher.bankTransferRef || voucher.paymentMethod})`
    });

    // Verify mathematical equality: Sum(Dr) === Sum(Cr)
    const totalDr = journalLines.reduce((s, l) => s + l.debit, 0);
    const totalCr = journalLines.reduce((s, l) => s + l.credit, 0);

    if (Math.abs(totalDr - totalCr) > 0.01) {
      throw new Error(`Double-entry imbalance: Total Debits (₦${totalDr}) does not match Total Credits (₦${totalCr}).`);
    }

    // Execute atomic ACID transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create General Ledger Journal Entry
      const je = await tx.journalEntry.create({
        data: {
          reference: voucher.voucherNumber,
          date: voucher.voucherDate,
          description: `VOUCHER [${voucher.voucherNumber}]: ${voucher.narration} (Payee: ${voucher.payeeName})`,
          recordedById: user.id,
          lines: {
            create: journalLines.map(jl => ({
              accountId: jl.accountId,
              debit: jl.debit,
              credit: jl.credit,
              description: jl.description
            }))
          }
        }
      });

      // 2. Update AccountCode balances according to normal balance rules
      for (const jl of journalLines) {
        const acc = await tx.accountCode.findUnique({
          where: { id: jl.accountId },
          include: { category: true }
        });
        const catName = (acc?.category?.name || '').toLowerCase();
        const isCreditNormal = catName.includes('liability') || catName.includes('equity') || catName.includes('revenue');
        const netChange = isCreditNormal ? (jl.credit - jl.debit) : (jl.debit - jl.credit);

        await tx.accountCode.update({
          where: { id: jl.accountId },
          data: { balance: { increment: netChange } }
        });
      }

      // 3. Mark Voucher as POSTED and link journalEntryId
      const updatedVoucher = await tx.paymentVoucher.update({
        where: { id: voucher.id },
        data: {
          status: 'POSTED',
          currentStage: 'POSTED',
          postedById: user.id,
          postedAt: new Date(),
          journalEntryId: je.id,
          auditTrail: {
            create: {
              actorId: user.id,
              fromStatus: 'APPROVED',
              toStatus: 'POSTED',
              action: 'POSTED',
              remarks: data.remarks?.trim() || `Disbursed and posted to General Ledger (JE: ${je.reference}). Double-entry balance confirmed.`
            }
          }
        },
        include: { lines: true, auditTrail: true, journalEntry: true }
      });

      return { voucher: updatedVoucher, journalEntry: je };
    });

    revalidatePath('/dashboard/finance/vouchers');
    revalidatePath('/dashboard/finance/ledger');
    revalidatePath('/dashboard/finance/chart-of-accounts');

    return {
      success: true,
      data: result.voucher,
      message: `Voucher ${voucher.voucherNumber} successfully posted to General Ledger! Reference: ${result.journalEntry.reference}`
    };
  } catch (error: any) {
    console.error('Error posting voucher to ledger:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================================================
// 8. CANCEL VOUCHER (CAN ONLY BE CANCELLED ONCE APPROVED OR ACTIVE)
// ==============================================================================

export async function cancelPaymentVoucherAction(data: {
  voucherId: string;
  reason: string;
  actorUserId?: string;
}) {
  try {
    if (!data.reason?.trim()) throw new Error('Cancellation reason is strictly required.');

    const voucher = await prisma.paymentVoucher.findUnique({ where: { id: data.voucherId } });
    if (!voucher) throw new Error('Voucher not found.');

    if (voucher.status === 'CANCELLED') {
      throw new Error('Voucher is already cancelled.');
    }

    const user = await getActiveUser(data.actorUserId);
    if (!user) throw new Error('Authorized user session is required.');

    const updated = await prisma.paymentVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'CANCELLED',
        currentStage: 'CANCELLED',
        cancelledById: user.id,
        cancelledAt: new Date(),
        cancellationReason: data.reason.trim(),
        auditTrail: {
          create: {
            actorId: user.id,
            fromStatus: voucher.status,
            toStatus: 'CANCELLED',
            action: 'CANCELLED',
            remarks: `Cancelled: ${data.reason.trim()}`
          }
        }
      }
    });

    revalidatePath('/dashboard/finance/vouchers');
    return { success: true, data: updated, message: `Voucher ${voucher.voucherNumber} has been officially cancelled.` };
  } catch (error: any) {
    console.error('Error cancelling voucher:', error);
    return { success: false, error: error.message };
  }
}
