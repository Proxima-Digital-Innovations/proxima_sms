import { AnnouncementRepository } from "../dal/announcement-repository";

export class AnnouncementService {
  private repo = new AnnouncementRepository();

  async saveAnnouncement(session: any, data: { id?: string, title: string, content: string }) {
    if (!['ADMIN', 'SLT', 'SUPER_ADMIN'].includes(session.user.role)) {
      throw new Error("Access Denied: You do not have permission to manage announcements.");
    }

    const { id, title, content } = data;

    if (id) {
      const announcement = await this.repo.getAnnouncement(id);
      if (!announcement) {
        throw new Error("Access Denied: Announcement not found.");
      }

      await this.repo.updateAnnouncement(id, { title, content });
    } else {
      await this.repo.createAnnouncement({
        title,
        content,
        authorId: session.user.id
      });
    }
  }

  async deleteAnnouncement(session: any, id: string) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      throw new Error("Access Denied: Only admins can delete announcements.");
    }

    const announcement = await this.repo.getAnnouncement(id);
    if (!announcement) {
      throw new Error("Access Denied: Announcement not found.");
    }

    await this.repo.deleteAnnouncement(id);
  }
}
