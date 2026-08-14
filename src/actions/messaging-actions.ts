'use server';

import { auth } from "@/auth";
import { MessagingService } from "@/lib/services/messaging-service";

const service = new MessagingService();

export async function sendMessageBlast(data: any) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await service.sendMessageBlast(
      session.user.id,
      data.data.audienceType,
      data.channel,
      data.subject,
      data.body,
      data.targetId
    );

    return { success: true, sentCount: result.sentCount };
  } catch (error: any) {
    console.error("Failed to send message blast:", error);
    return { success: false, error: error.message || "Failed to send message" };
  }
}
