'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { handleLeaveRequestApproval, handleVoucherApproval } from '@/lib/services/integration-service';

function generateReference() {
  return `MEMO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function createMemo(data: {
  senderId: string;
  type: string;
  title: string;
  content: string;
  currentHandlerId?: string;
  metadata?: any;
}) {
  try {
    const memo = await prisma.staffMemo.create({
      data: {
        reference: generateReference(),
        type: data.type,
        title: data.title,
        content: data.content,
        senderId: data.senderId,
        currentHandlerId: data.currentHandlerId,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        history: {
          create: {
            actorId: data.senderId,
            action: 'CREATED',
            notes: 'Memo originated'
          }
        }
      }
    });
    revalidatePath('/dashboard/communication');
    return { success: true, memo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getMyMemos(userId: string) {
  try {
    const memos = await prisma.staffMemo.findMany({
      where: {
        OR: [
          { senderId: userId },
          { currentHandlerId: userId }
        ]
      },
      include: {
        sender: { select: { firstName: true, lastName: true, role: true } },
        currentHandler: { select: { firstName: true, lastName: true, role: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, memos };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getMemoDetails(memoId: string) {
  try {
    const memo = await prisma.staffMemo.findUnique({
      where: { id: memoId },
      include: {
        sender: true,
        currentHandler: true,
        history: {
          include: { actor: true },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    return { success: true, memo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function processMemo(data: {
  memoId: string;
  actorId: string;
  action: 'FORWARDED' | 'APPROVED' | 'REJECTED' | 'KIV';
  notes: string;
  nextHandlerId?: string; // required if action is FORWARDED
}) {
  try {
    const updateData: any = {
      status: data.action === 'FORWARDED' ? 'PENDING' : data.action,
    };
    
    if (data.action === 'FORWARDED' && data.nextHandlerId) {
      updateData.currentHandlerId = data.nextHandlerId;
    }

    const memo = await prisma.staffMemo.update({
      where: { id: data.memoId },
      data: {
        ...updateData,
        history: {
          create: {
            actorId: data.actorId,
            action: data.action,
            notes: data.notes
          }
        }
      }
    });
    
    // IF APPROVED, WE TRIGGER SIDE EFFECTS BASED ON TYPE
    if (data.action === 'APPROVED') {
      if (memo.type === 'CASH_VOUCHER') {
         await handleVoucherApproval(memo as any, data.actorId);
      }
      else if (memo.type === 'LEAVE_REQUEST') {
         await handleLeaveRequestApproval(memo as any);
      }
    }

    revalidatePath('/dashboard/communication');
    return { success: true, memo };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getStaffList() {
    try {
        const staff = await prisma.user.findMany({
            where: { role: { not: 'STUDENT' } },
            select: { id: true, firstName: true, lastName: true, role: true }
        });
        return { success: true, staff };
    } catch(err: any) {
        return { success: false, staff: [], message: err.message };
    }
}
