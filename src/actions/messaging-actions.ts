'use server';

import { auth } from "@/auth";
import { MessagingService } from "@/lib/services/messaging-service";
import { revalidatePath } from "next/cache";

const service = new MessagingService();

export async function sendMessageBlast(data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized: Please log in to send broadcasts." };
    }

    // Safely unwrap data whether passed as FormData, plain object, or wrapped payload
    let payload: any = {};
    if (data instanceof FormData) {
      payload = Object.fromEntries(data.entries());
    } else if (data && typeof data === 'object') {
      payload = data.data || data;
    }

    const audienceType = payload.audienceType || payload.audience || 'ALL_PARENTS';
    const channel = payload.channel || 'EMAIL';
    const subject = payload.subject?.trim() || 'Broadcast Announcement';
    const body = payload.body?.trim();
    const targetId = payload.targetId && payload.targetId !== 'ALL' ? payload.targetId : null;

    if (!body) {
      return { success: false, error: "Message body cannot be empty." };
    }

    const result = await service.sendMessageBlast(
      session.user.id,
      audienceType,
      channel,
      subject,
      body,
      targetId
    );

    revalidatePath('/dashboard/messaging');
    return {
      success: true,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      warning: result.warning,
    };
  } catch (error: any) {
    console.error("Failed to send message blast:", error);
    return { success: false, error: error.message || "Failed to send message" };
  }
}
