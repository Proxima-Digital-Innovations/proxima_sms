import { prisma } from '@/lib/prisma';
const p: any = prisma;
export class WebsiteRepository {
  async getUser(userId: string) {
    return await p.user.findUnique({ where: { id: userId } });
  }
  async getPublicWebsiteConfig() {
    return await p.publicWebsiteConfig.findUnique({ where: {} });
  }
  async upsertPublicWebsiteConfig(data: any) {
    return await p.publicWebsiteConfig.upsert({
      where: {}, update: data, create: { ...data }
    });
  }
  async getCarouselSlides() {
    return await p.carouselSlide.findMany({ where: {}, orderBy: { order: 'asc' } });
  }
  async createCarouselSlide(data: any) {
    return await p.carouselSlide.create({ data: { ...data } });
  }
  async deleteCarouselSlide(id: string, ) {
    return await p.carouselSlide.delete({ where: { id } });
  }
  async getPublicEvents() {
    return await p.publicEvent.findMany({ where: {}, orderBy: { time: 'asc' } });
  }
  async createPublicEvent(data: any) {
    return await p.publicEvent.create({ data: { ...data } });
  }
  async getBlogPosts() {
    return await p.blogPost.findMany({ where: {}, orderBy: { postedAt: 'desc' } });
  }
  async createBlogPost(data: any) {
    return await p.blogPost.create({ data: { ...data } });
  }
  async getGalleryImages() {
    return await p.galleryImage.findMany({ where: {}, orderBy: { order: 'asc' } });
  }
  async createGalleryImage(data: any) {
    return await p.galleryImage.create({ data: { ...data } });
  }
  async getPublicStaffProfiles() {
    return await p.publicStaffProfile.findMany({ where: {}, orderBy: { order: 'asc' } });
  }
  async createPublicStaffProfile(data: any) {
    return await p.publicStaffProfile.create({ data: { ...data } });
  }
}
