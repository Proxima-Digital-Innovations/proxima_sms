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
    const schoolName = school?.name || 'School';
    const primaryColor = school?.primaryColor || '#0f172a';

    let guardians: any[] = [];

    if (options.classId) {
      // Find guardians of active students in the specific class
      guardians = await prisma.guardian.findMany({
        where: {
          student: {
            classId: options.classId,
            status: 'Active',
          },
        },
        select: { email: true, fullName: true },
      });
    } else {
      // Find all guardians of active students
      guardians = await prisma.guardian.findMany({
        where: {
          student: {
            status: 'Active',
          },
        },
        select: { email: true, fullName: true },
      });
    }

    // Filter out missing or invalid emails
    const validEmails = guardians
      .map((g) => g.email?.trim())
      .filter((email) => email && email.includes('@')) as string[];

    // Deduplicate emails
    const uniqueEmails = Array.from(new Set(validEmails));

    if (uniqueEmails.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const result = await CommEngine.sendEmail({
      to: uniqueEmails,
      subject: options.subject,
      react: BroadcastEmail({
        schoolName,
        subject: options.subject,
        body: options.body,
        primaryColor,
      }),
      text: options.body,
    });

    return {
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      warning: result.warning,
    };
  } catch (error: any) {
    console.error('Error in sendEmailToGuardians:', error);
    return { success: false, error: error.message || 'Failed to send emails.' };
  }
}

