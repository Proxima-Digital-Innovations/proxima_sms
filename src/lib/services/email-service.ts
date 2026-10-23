import { prisma } from '@/lib/prisma';
import { CommEngine } from './comm-engine';
import { BroadcastEmail } from '@/emails/broadcast-template';

export async function sendEmailToGuardians(options: {
  subject: string;
  body: string;
  classId?: string; // Optional: restrict to a specific class
}) {
  try {
    const school = await prisma.systemProfile.findFirst();
    const schoolName = school?.schoolName || school?.name || 'Proxima SMS Academy';
    const primaryColor = school?.primaryColor || '#0f172a';

    let guardians: any[] = [];

    if (options.classId) {
      // Find guardians of active students in the specific class
      guardians = await prisma.guardian.findMany({
        where: {
          student: {
            classId: options.classId,
          },
        },
        select: { email: true, fullName: true },
      });
    } else {
      // Find all guardians
      guardians = await prisma.guardian.findMany({
        select: { email: true, fullName: true },
      });
    }

    // Also include any users with role: 'PARENT'
    const parentUsers = await prisma.user.findMany({
      where: {
        role: { in: ['PARENT', 'parent', 'Parent'] },
        email: { not: '' },
      },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    // Filter out missing or invalid emails
    const validEmails = [
      ...guardians.map((g) => g.email?.trim()),
      ...parentUsers.map((u) => u.email?.trim()),
    ].filter((email) => email && email.includes('@')) as string[];

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(validEmails));

    if (uniqueEmails.length === 0) {
      return { success: true, sentCount: 0, message: 'No registered parent emails found.' };
    }

    const config = await CommEngine.getConfig();
    const senderFrom = config.smtp?.fromEmail || config.resend?.fromEmail || 'announcements@proximasms.com';

    // Dispatch emails via CommEngine (BCC for parent privacy)
    const result = await CommEngine.sendEmail({
      to: senderFrom,
      bcc: uniqueEmails,
      subject: options.subject,
      react: BroadcastEmail({
        schoolName,
        subject: options.subject,
        body: options.body,
        primaryColor,
      }),
      text: options.body,
    });

    // Also create in-app notifications for parent portal accounts
    if (parentUsers.length > 0) {
      try {
        await prisma.notification.createMany({
          data: parentUsers.map((u) => ({
            userId: u.id,
            title: options.subject,
            body: options.body.slice(0, 200),
            type: 'ANNOUNCEMENT',
            read: false,
          })),
        });
      } catch (notifErr) {
        console.warn('In-app parent notification write skipped:', notifErr);
      }
    }

    return {
      success: result.success,
      sentCount: uniqueEmails.length,
      failedCount: result.failedCount,
      warning: result.warning,
      provider: result.provider,
    };
  } catch (error: any) {
    console.error('Error in sendEmailToGuardians:', error);
    return { success: false, error: error.message || 'Failed to send emails.' };
  }
}

