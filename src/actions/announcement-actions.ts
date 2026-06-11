'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createSecureAction } from '@/lib/secure-action';
import { Role } from '@prisma/client';

const announcementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  content: z.string().min(10, 'Content must be at least 10 characters long.'),
});

/**
 * Saves or updates an announcement.
 * This action is fully secured:
 * 1. Auth checked automatically.
 * 2. SchoolId injected into database queries automatically.
 * 3. Input validated against Zod schema.
 */
export const saveAnnouncement = createSecureAction(
  announcementSchema,
  async (data, session) => {
    // 4. Role Authorization (Custom check)
    if (![Role.ADMIN, Role.SLT].includes(session.user.role)) {
      throw new Error("Access Denied: You do not have permission to manage announcements.");
    }

    const { id, title, content } = data;

    if (id) {
      // Fetch announcement to verify it belongs to the user's school
      const announcement = await prisma.announcement.findUnique({ where: { id } });
      if (!announcement || announcement.schoolId !== session.user.schoolId) {
        throw new Error("Access Denied: Announcement not found or belongs to another school.");
      }

      await prisma.announcement.update({
        where: { id },
        data: { title, content }
      });
    } else {
      // Create new announcement under the session's schoolId
      await prisma.announcement.create({
        data: {
          title,
          content,
          schoolId: session.user.schoolId,
          authorId: session.user.id
        }
      });
    }

    revalidatePath('/dashboard/announcements');
    return { success: true };
  }
);

/**
 * Deletes an announcement.
 * Secured via automatic tenant isolation.
 */
export const deleteAnnouncement = createSecureAction(
  z.string(),
  async (id, session) => {
    if (session.user.role !== Role.ADMIN) {
      throw new Error("Access Denied: Only admins can delete announcements.");
    }

    // Verify tenant boundary before deletion
    const announcement = await prisma.announcement.findUnique({ where: { id } });
    if (!announcement || announcement.schoolId !== session.user.schoolId) {
      throw new Error("Access Denied: Announcement not found or belongs to another school.");
    }

    await prisma.announcement.delete({ where: { id } });
    
    revalidatePath('/dashboard/announcements');
    return { success: true };
  }
);
