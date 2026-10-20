import { MessagingRepository } from "../dal/messaging-repository";
import { CommEngine } from './comm-engine';
import { BroadcastEmail } from '@/emails/broadcast-template';
import { prisma } from '@/lib/prisma';

export class MessagingService {
  private repo = new MessagingRepository();

  async sendMessageBlast(
    senderId: string,
    audienceType: string,
    channel: string,
    subject: string,
    body: string,
    targetId: string | null
  ) {
    const school = await this.repo.getSchool();
    if (!school) {
      throw new Error("School profile not configured.");
    }

    // 1. Gather target recipients from database
    let recipientContacts: Array<{ name: string; email?: string | null; phone?: string | null }> = [];

    switch (audienceType) {
      case 'ALL_PARENTS': {
        const parents = await this.repo.getParents();
        recipientContacts = parents.map(p => ({
          name: p.fullName,
          email: p.email,
          phone: p.phone,
        }));
        break;
      }
      case 'CLASS_PARENTS': {
        if (targetId) {
          const parents = await this.repo.getParents(targetId);
          recipientContacts = parents.map(p => ({
            name: p.fullName,
            email: p.email,
            phone: p.phone,
          }));
        }
        break;
      }
      case 'ALL_STAFF': {
        const staff = await this.repo.getStaff();
        recipientContacts = staff.map(s => ({
          name: `${s.firstName} ${s.lastName}`,
          email: s.email,
          phone: s.phone,
        }));
        break;
      }
      case 'CLASS_STUDENTS': {
        if (targetId) {
          const students = await this.repo.getStudents(targetId);
          recipientContacts = students.map(st => ({
            name: `${st.firstName} ${st.lastName}`,
            phone: null,
            email: null,
          }));
        }
        break;
      }
      default:
        recipientContacts = [];
    }

    // Variable interpolation helper
    const interpolate = (template: string, name: string) => {
      return template
        .replace(/\{schoolName\}/gi, school.name)
        .replace(/\{firstName\}/gi, name || 'Valued Member');
    };

    let sentCount = 0;
    let failedCount = 0;
    let deliveryWarning: string | undefined;

    // 2. Dispatch across selected channel
    if (channel === 'EMAIL') {
      // Filter out invalid/empty emails
      const validRecipients = recipientContacts.filter(
        c => c.email && c.email.trim().includes('@')
      );

      const uniqueEmails = Array.from(new Set(validRecipients.map(c => c.email!.trim())));

      if (uniqueEmails.length > 0) {
        const processedBody = interpolate(body, 'Valued Recipient');
        
        const emailResult = await CommEngine.sendEmail({
          to: uniqueEmails,
          subject,
          react: BroadcastEmail({
            schoolName: school.name,
            subject,
            body: processedBody,
            primaryColor: school.primaryColor,
          }),
          text: processedBody,
        });

        sentCount = emailResult.sentCount;
        failedCount = emailResult.failedCount;
        deliveryWarning = emailResult.warning;
      }
    } else if (channel === 'WHATSAPP') {
      // Filter recipients with valid phone numbers
      const validPhoneRecipients = recipientContacts.filter(
        c => c.phone && c.phone.trim().length >= 7
      );

      for (const rec of validPhoneRecipients) {
        const personalizedBody = interpolate(body, rec.name);
        const fullMessage = `*${school.name.toUpperCase()}*\n*${subject}*\n\n${personalizedBody}`;
        
        const res = await CommEngine.sendWhatsApp(rec.phone!, fullMessage);
        if (res.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      }
    } else {
      // Channel === 'SMS' or other: simulate / fallback
      sentCount = recipientContacts.length;
    }

    // 3. Fallback safe sender identification
    let validSenderId = senderId;
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    if (!sender) {
      const fallbackAdmin = await prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      });
      if (fallbackAdmin) {
        validSenderId = fallbackAdmin.id;
      }
    }

    // 4. Record the message blast in database
    const blast = await this.repo.createMessageBlast({
      senderId: validSenderId,
      subject,
      body: interpolate(body, 'Recipient'),
      audienceType,
      targetId,
      channel,
      sentCount: sentCount > 0 ? sentCount : recipientContacts.length,
    });

    return {
      success: true,
      sentCount: blast.sentCount,
      failedCount,
      warning: deliveryWarning,
    };
  }
}
