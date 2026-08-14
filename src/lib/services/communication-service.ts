import { CommunicationRepository } from "../dal/communication-repository";

export class CommunicationService {
  private repo = new CommunicationRepository();

  async getMessageHistory() {
    return this.repo.getMessageHistory();
  }

  async sendMassMessage(
    audienceType: string,
    channel: string,
    subject: string,
    body: string,
    targetId?: string
  ) {
    const admin = await this.repo.getAdmin();
    if (!admin) throw new Error("No authorized admin found in this school to send messages.");

    let targetCount = 0;
    if (audienceType === 'ALL_PARENTS') {
      targetCount = await this.repo.getParentCount();
    } else if (audienceType === 'ALL_TEACHERS') {
      targetCount = await this.repo.getTeacherCount();
    } else if (audienceType === 'CLASS_SPECIFIC' && targetId) {
      targetCount = await this.repo.getStudentCount(targetId);
    }

    const blast = await this.repo.createMessageBlast({
      senderId: admin.id,
      subject,
      body,
      audienceType,
      targetId,
      channel,
      sentCount: targetCount
    });

    return blast;
  }
}
