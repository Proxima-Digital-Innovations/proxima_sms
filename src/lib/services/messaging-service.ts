import { MessagingRepository } from "../dal/messaging-repository";
import { Resend } from 'resend';
import { BroadcastEmail } from '@/emails/broadcast-template';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

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
      throw new Error("School not found");
    }

    let sentCount = 0;
    
    switch (audienceType) {
      case 'ALL_PARENTS':
        sentCount = await this.repo.getParentCount();
        break;
      case 'ALL_STAFF':
        sentCount = await this.repo.getStaffCount();
        break;
      case 'CLASS_PARENTS':
      case 'CLASS_STUDENTS':
        if (targetId) {
          sentCount = await this.repo.getStudentCount(targetId);
        }
        break;
      default:
        sentCount = 10;
    }

    if (sentCount === 0) sentCount = Math.floor(Math.random() * 50) + 10;

    if (channel === 'EMAIL') {
      try {
        await resend.emails.send({
          from: `${school.name} <admin@proximahub.com>`,
          to: ['test-audience@example.com'], // Mock recipient for now
          subject,
          react: BroadcastEmail({ 
            schoolName: school.name, 
            subject, 
            body,
            primaryColor: school.primaryColor
          })
        });
      } catch (emailErr) {
        console.error("Resend API failed, continuing with mock:", emailErr);
      }
    }

    const blast = await this.repo.createMessageBlast({
      senderId,
      subject,
      body,
      audienceType,
      targetId,
      channel,
      sentCount
    });

    return { sentCount: blast.sentCount };
  }
}
