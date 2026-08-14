import { WebsiteRepository } from '../dal/website-repository';
export class WebsiteService {
  private repo = new WebsiteRepository();
  async verifyWebsiteAdmin(sessionUser: any) {
    if (!sessionUser?.id) throw new Error("Unauthorized");
    const user = await this.repo.getUser(sessionUser.id);
    if (!user || (!user.isSuperAdmin && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      throw new Error("Unauthorized. Only admins can edit the public website.");
    }
    return user.schoolId;
  }
  async getPublicWebsiteConfig() { return await this.repo.getPublicWebsiteConfig(); }
  async upsertPublicWebsiteConfig(data: any) { return await this.repo.upsertPublicWebsiteConfig(data); }
  async getCarouselSlides() { return await this.repo.getCarouselSlides(); }
  async createCarouselSlide(data: any) { return await this.repo.createCarouselSlide(data); }
  async deleteCarouselSlide(id: string, ) { return await this.repo.deleteCarouselSlide(id); }
  async getPublicEvents() { return await this.repo.getPublicEvents(); }
  async createPublicEvent(data: any) { return await this.repo.createPublicEvent(data); }
  async getBlogPosts() { return await this.repo.getBlogPosts(); }
  async createBlogPost(data: any) { return await this.repo.createBlogPost(data); }
  async getGalleryImages() { return await this.repo.getGalleryImages(); }
  async createGalleryImage(data: any) { return await this.repo.createGalleryImage(data); }
  async getPublicStaffProfiles() { return await this.repo.getPublicStaffProfiles(); }
  async createPublicStaffProfile(data: any) { return await this.repo.createPublicStaffProfile(data); }
}
