'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createSecureAction } from '@/lib/secure-action';
import { AnnouncementService } from '@/lib/services/announcement-service';
import { prisma } from '@/lib/prisma';
import { sendEmailToGuardians } from '@/lib/services/email-service';

const service = new AnnouncementService();

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  content: z.string().min(10, 'Content must be at least 10 characters long.'),
  notifyParents: z.boolean().optional(),
});

export async function getAnnouncements() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
         author: { select: { firstName: true, lastName: true } }
      }
    });
    
    // Map it to match the UI expectations which expect authorName and createdAt (though UI uses .seconds from firebase)
    const mapped = announcements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        authorName: a.author ? `${a.author.firstName} ${a.author.lastName}` : 'System',
        createdAt: { seconds: Math.floor(new Date(a.createdAt).getTime() / 1000) } // Mock Firebase timestamp for UI compatibility, or we can just change the UI
    }));
    
    return { success: true, announcements: mapped };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getAnnouncementDetails(id: string) {
  try {
    const a = await prisma.announcement.findUnique({
      where: { id },
      include: { author: { select: { firstName: true, lastName: true } } }
    });
    if (!a) return { success: false, message: 'Not found' };
    
    return { success: true, announcement: {
        id: a.id,
        title: a.title,
        content: a.content,
        authorName: a.author ? `${a.author.firstName} ${a.author.lastName}` : 'System',
        createdAt: { seconds: Math.floor(new Date(a.createdAt).getTime() / 1000) }
    }};
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Saves or updates an announcement.
 */
export const saveAnnouncement = createSecureAction(
  announcementSchema,
  async (data, session) => {
    await service.saveAnnouncement(session, data);
    
    let emailResult: any = null;
    // Dispatch email to parents: default to true for new announcements, or if explicitly checked
    const shouldSendEmail = (!data.id && data.notifyParents !== false) || (data.id && data.notifyParents === true);

    if (shouldSendEmail) {
      try {
        emailResult = await sendEmailToGuardians({
          subject: `${data.id ? 'Updated Announcement' : 'Announcement'}: ${data.title}`,
          body: data.content,
        });
      } catch (err: any) {
        console.error('Failed to dispatch announcement emails:', err);
        emailResult = { success: false, error: err.message };
      }
    }

    revalidatePath('/dashboard/announcements');
    return { success: true, emailResult };
  }
);

/**
 * Deletes an announcement.
 */
export const deleteAnnouncement = createSecureAction(
  z.string(),
  async (id, session) => {
    await service.deleteAnnouncement(session, id);
    revalidatePath('/dashboard/announcements');
    return { success: true };
  }
);
