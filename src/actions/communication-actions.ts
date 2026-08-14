'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { CommunicationService } from "@/lib/services/communication-service";

const service = new CommunicationService();

/**
 * Fetch historical message blasts
 */
export async function getMessageHistory() {
  try {
    
    const history = await service.getMessageHistory();
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
    
    const blast = await service.sendMassMessage(audienceType, channel, subject, body, targetId);

    revalidatePath("/admin/communications");
    return { success: true, blast };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
