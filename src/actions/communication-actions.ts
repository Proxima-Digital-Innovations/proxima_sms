'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";

/**
 * Fetch historical message blasts
 */
export async function getMessageHistory() {
  try {
    const schoolId = await requireSchoolId();
    const history = await prisma.messageBlast.findMany({
      where: { schoolId },
      include: {
        sender: { select: { firstName: true, lastName: true } }
      },
      orderBy: { sentAt: 'desc' }
    });
    return { success: true, history };
  } catch (error: any) {
    return { success: false, history: [], message: error.message };
  }
}

/**
 * Send a mass broadcast message (Mock dispatch)
 */
export async function sendMassMessage(
  audienceType: string,
  channel: string,
  subject: string,
  body: string,
  targetId?: string
) {
  try {
    const schoolId = await requireSchoolId();
    // 1. Get the sender (Scoped to school)
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', schoolId } });
    if (!admin) throw new Error("No authorized admin found in this school to send messages.");

    // 2. Determine target audience count (Scoped to school)
    let targetCount = 0;
    if (audienceType === 'ALL_PARENTS') {
      targetCount = await prisma.guardian.count({ where: { schoolId } });
    } else if (audienceType === 'ALL_TEACHERS') {
      targetCount = await prisma.user.count({ where: { role: 'TEACHER', schoolId } });
    } else if (audienceType === 'CLASS_SPECIFIC' && targetId) {
      targetCount = await prisma.student.count({ where: { classId: targetId, schoolId } });
    }

    // 3. Create the log
    const blast = await prisma.messageBlast.create({
      data: {
        senderId: admin.id,
        schoolId,
        subject,
        body,
        audienceType,
        targetId,
        channel,
        sentCount: targetCount
      }
    });

    // 4. Simulate dispatch delay
    // await new Promise(resolve => setTimeout(resolve, 1000));

    revalidatePath("/admin/communications");
    return { success: true, blast };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
