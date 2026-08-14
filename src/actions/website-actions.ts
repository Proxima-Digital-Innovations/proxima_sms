'use server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { WebsiteService } from '@/lib/services/website-service';
const websiteService = new WebsiteService();
async function getSchoolId() {
  const session = await auth();
  return await websiteService.verifyWebsiteAdmin(session?.user);
}
export async function getPublicWebsiteConfig() {
  
  return await websiteService.getPublicWebsiteConfig();
}
export async function upsertPublicWebsiteConfig(data: any) {
  
  const config = await websiteService.upsertPublicWebsiteConfig(data);
  revalidatePath('/[school]', 'page');
  return config;
}
export async function getCarouselSlides() {
  
  return await websiteService.getCarouselSlides();
}
export async function createCarouselSlide(data: any) {
  
  const slide = await websiteService.createCarouselSlide(data);
  revalidatePath('/[school]', 'page');
  return slide;
}
export async function deleteCarouselSlide(id: string) {
  
  await websiteService.deleteCarouselSlide(id, );
  revalidatePath('/[school]', 'page');
  return true;
}
export async function getPublicEvents() {
  
  return await websiteService.getPublicEvents();
}
export async function createPublicEvent(data: any) {
  
  const event = await websiteService.createPublicEvent(data);
  revalidatePath('/[school]', 'page');
  return event;
}
export async function getBlogPosts() {
  
  return await websiteService.getBlogPosts();
}
export async function createBlogPost(data: any) {
  
  const post = await websiteService.createBlogPost(data);
  revalidatePath('/[school]', 'page');
  return post;
}
export async function getGalleryImages() {
  
  return await websiteService.getGalleryImages();
}
export async function createGalleryImage(data: any) {
  
  const img = await websiteService.createGalleryImage(data);
  revalidatePath('/[school]', 'page');
  return img;
}
export async function getPublicStaffProfiles() {
  
  return await websiteService.getPublicStaffProfiles();
}
export async function createPublicStaffProfile(data: any) {
  
  const profile = await websiteService.createPublicStaffProfile(data);
  revalidatePath('/[school]', 'page');
  return profile;
}
