const fs = require('fs');
const path = require('path');
const basePath = 'C:\\projects\\School-hub\\schoolsystem\\src';
function write(filePath, content) {
    const fullPath = path.join(basePath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n');
}

// 4. Token
write('lib/dal/token-repository.ts', `
import { prisma } from '@/lib/prisma';

export class TokenRepository {
  async getTerm(term: string) {
    return await prisma.term.findFirst({
      where: {
        OR: [
          { id: term },
          { name: term },
          { name: term.replace("First Term", "Term 1").replace("Second Term", "Term 2").replace("Third Term", "Term 3") },
          { name: term.replace("Term 1", "First Term").replace("Term 2", "Second Term").replace("Term 3", "Third Term") }
        ]
      }
    });
  }
  async getStudent(studentId: string) {
    return await prisma.student.findFirst({
      where: {
        OR: [ { id: studentId }, { studentId: studentId } ]
      },
      include: { class: true }
    });
  }
  async upsertToken(studentId: string, termId: string, schoolId: string, session: string, token: string) {
    return await prisma.resultToken.upsert({
      where: { studentId_termId: { studentId, termId } },
      update: { token, usageCount: 0, maxUsage: 5, session },
      create: { schoolId, studentId, termId, session, token, usageCount: 0, maxUsage: 5 }
    });
  }
  async findToken(studentId: string, token: string, termId: string, session: string) {
    return await prisma.resultToken.findFirst({
      where: { studentId, token, termId, session }
    });
  }
  async incrementTokenUsage(tokenId: string, usageCount: number) {
    return await prisma.resultToken.update({
      where: { id: tokenId },
      data: { usageCount }
    });
  }
  async getStudentScores(studentId: string, termId: string) {
    return await prisma.termGrade.findMany({
      where: { studentId, termId },
      include: { subject: true }
    });
  }
  async getBehaviouralAssessment(studentId: string, termId: string, session: string) {
    return await prisma.behaviouralAssessment.findFirst({
      where: { studentId, termId, session }
    });
  }
}
`);
write('lib/services/token-service.ts', `
import { TokenRepository } from '../dal/token-repository';
import { randomBytes } from 'node:crypto';

export class TokenService {
  private repo = new TokenRepository();
  async generateResultToken(studentId: string, term: string, session: string) {
    const token = randomBytes(4).toString('hex').toUpperCase();
    const termRecord = await this.repo.getTerm(term);
    if (!termRecord) throw new Error(\`Term \${term} not found\`);
    const student = await this.repo.getStudent(studentId);
    if (!student) throw new Error(\`Student \${studentId} not found\`);
    await this.repo.upsertToken(student.id, termRecord.id, student.schoolId, session, token);
    return token;
  }
  async validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
    const student = await this.repo.getStudent(admissionNumber);
    if (!student) return { success: false, error: 'Student not found' };
    const termRecord = await this.repo.getTerm(term);
    if (!termRecord) return { success: false, error: 'Term not found' };
    const tokenRecord = await this.repo.findToken(student.id, token, termRecord.id, session);
    if (!tokenRecord) return { success: false, error: 'Invalid token' };
    if (tokenRecord.usageCount >= tokenRecord.maxUsage) return { success: false, error: 'Token usage limit exceeded' };
    await this.repo.incrementTokenUsage(tokenRecord.id, tokenRecord.usageCount + 1);
    const scores = await this.repo.getStudentScores(student.id, termRecord.id);
    const mappedScores = scores.map(s => ({
      id: s.id, subjectId: s.subjectId, subjectName: s.subject.name,
      ca1: s.ca1, ca2: s.ca2, exam: s.exam, totalScore: s.total, grade: s.grade, remarks: s.remarks
    }));
    const behavioural = await this.repo.getBehaviouralAssessment(student.id, termRecord.id, session);
    const totalMarks = mappedScores.reduce((sum, s) => sum + (s.totalScore || 0), 0);
    const average = mappedScores.length > 0 ? totalMarks / mappedScores.length : 0;
    let overallGrade = 'F';
    if (average >= 80) overallGrade = 'A';
    else if (average >= 70) overallGrade = 'B';
    else if (average >= 60) overallGrade = 'C';
    else if (average >= 50) overallGrade = 'D';
    else if (average >= 40) overallGrade = 'E';
    return {
      success: true,
      data: {
        student: { id: student.id, studentId: student.studentId, firstName: student.firstName, lastName: student.lastName, classLevel: student.class?.name || '', status: student.status },
        scores: mappedScores, behavioural, totalMarks, average, overallGrade,
        remainingUses: tokenRecord.maxUsage - (tokenRecord.usageCount + 1)
      }
    };
  }
}
`);
write('actions/token-actions.ts', `
'use server';
import { TokenService } from '@/lib/services/token-service';
const tokenService = new TokenService();
export async function generateResultToken(studentId: string, term: string, session: string) {
  try {
    const token = await tokenService.generateResultToken(studentId, term, session);
    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate token' };
  }
}
export async function validateAndUseToken(admissionNumber: string, token: string, term: string, session: string) {
  try {
    return await tokenService.validateAndUseToken(admissionNumber, token, term, session);
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to validate token' };
  }
}
`);

// 5. Website
write('lib/dal/website-repository.ts', `
import { prisma } from '@/lib/prisma';
export class WebsiteRepository {
  async getUser(userId: string) {
    return await prisma.user.findUnique({ where: { id: userId } });
  }
  async getPublicWebsiteConfig(schoolId: string) {
    return await prisma.publicWebsiteConfig.findUnique({ where: { schoolId } });
  }
  async upsertPublicWebsiteConfig(schoolId: string, data: any) {
    return await prisma.publicWebsiteConfig.upsert({
      where: { schoolId }, update: data, create: { schoolId, ...data }
    });
  }
  async getCarouselSlides(schoolId: string) {
    return await prisma.carouselSlide.findMany({ where: { schoolId }, orderBy: { order: 'asc' } });
  }
  async createCarouselSlide(schoolId: string, data: any) {
    return await prisma.carouselSlide.create({ data: { schoolId, ...data } });
  }
  async deleteCarouselSlide(id: string, schoolId: string) {
    return await prisma.carouselSlide.delete({ where: { id, schoolId } });
  }
  async getPublicEvents(schoolId: string) {
    return await prisma.publicEvent.findMany({ where: { schoolId }, orderBy: { time: 'asc' } });
  }
  async createPublicEvent(schoolId: string, data: any) {
    return await prisma.publicEvent.create({ data: { schoolId, ...data } });
  }
  async getBlogPosts(schoolId: string) {
    return await prisma.blogPost.findMany({ where: { schoolId }, orderBy: { postedAt: 'desc' } });
  }
  async createBlogPost(schoolId: string, data: any) {
    return await prisma.blogPost.create({ data: { schoolId, ...data } });
  }
  async getGalleryImages(schoolId: string) {
    return await prisma.galleryImage.findMany({ where: { schoolId }, orderBy: { order: 'asc' } });
  }
  async createGalleryImage(schoolId: string, data: any) {
    return await prisma.galleryImage.create({ data: { schoolId, ...data } });
  }
  async getPublicStaffProfiles(schoolId: string) {
    return await prisma.publicStaffProfile.findMany({ where: { schoolId }, orderBy: { order: 'asc' } });
  }
  async createPublicStaffProfile(schoolId: string, data: any) {
    return await prisma.publicStaffProfile.create({ data: { schoolId, ...data } });
  }
}
`);
write('lib/services/website-service.ts', `
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
  async getPublicWebsiteConfig(schoolId: string) { return await this.repo.getPublicWebsiteConfig(schoolId); }
  async upsertPublicWebsiteConfig(schoolId: string, data: any) { return await this.repo.upsertPublicWebsiteConfig(schoolId, data); }
  async getCarouselSlides(schoolId: string) { return await this.repo.getCarouselSlides(schoolId); }
  async createCarouselSlide(schoolId: string, data: any) { return await this.repo.createCarouselSlide(schoolId, data); }
  async deleteCarouselSlide(id: string, schoolId: string) { return await this.repo.deleteCarouselSlide(id, schoolId); }
  async getPublicEvents(schoolId: string) { return await this.repo.getPublicEvents(schoolId); }
  async createPublicEvent(schoolId: string, data: any) { return await this.repo.createPublicEvent(schoolId, data); }
  async getBlogPosts(schoolId: string) { return await this.repo.getBlogPosts(schoolId); }
  async createBlogPost(schoolId: string, data: any) { return await this.repo.createBlogPost(schoolId, data); }
  async getGalleryImages(schoolId: string) { return await this.repo.getGalleryImages(schoolId); }
  async createGalleryImage(schoolId: string, data: any) { return await this.repo.createGalleryImage(schoolId, data); }
  async getPublicStaffProfiles(schoolId: string) { return await this.repo.getPublicStaffProfiles(schoolId); }
  async createPublicStaffProfile(schoolId: string, data: any) { return await this.repo.createPublicStaffProfile(schoolId, data); }
}
`);
write('actions/website-actions.ts', `
// @ts-nocheck
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
  const schoolId = await getSchoolId();
  return await websiteService.getPublicWebsiteConfig(schoolId);
}
export async function upsertPublicWebsiteConfig(data: any) {
  const schoolId = await getSchoolId();
  const config = await websiteService.upsertPublicWebsiteConfig(schoolId, data);
  revalidatePath('/[school]', 'page');
  return config;
}
export async function getCarouselSlides() {
  const schoolId = await getSchoolId();
  return await websiteService.getCarouselSlides(schoolId);
}
export async function createCarouselSlide(data: any) {
  const schoolId = await getSchoolId();
  const slide = await websiteService.createCarouselSlide(schoolId, data);
  revalidatePath('/[school]', 'page');
  return slide;
}
export async function deleteCarouselSlide(id: string) {
  const schoolId = await getSchoolId();
  await websiteService.deleteCarouselSlide(id, schoolId);
  revalidatePath('/[school]', 'page');
  return true;
}
export async function getPublicEvents() {
  const schoolId = await getSchoolId();
  return await websiteService.getPublicEvents(schoolId);
}
export async function createPublicEvent(data: any) {
  const schoolId = await getSchoolId();
  const event = await websiteService.createPublicEvent(schoolId, data);
  revalidatePath('/[school]', 'page');
  return event;
}
export async function getBlogPosts() {
  const schoolId = await getSchoolId();
  return await websiteService.getBlogPosts(schoolId);
}
export async function createBlogPost(data: any) {
  const schoolId = await getSchoolId();
  const post = await websiteService.createBlogPost(schoolId, data);
  revalidatePath('/[school]', 'page');
  return post;
}
export async function getGalleryImages() {
  const schoolId = await getSchoolId();
  return await websiteService.getGalleryImages(schoolId);
}
export async function createGalleryImage(data: any) {
  const schoolId = await getSchoolId();
  const img = await websiteService.createGalleryImage(schoolId, data);
  revalidatePath('/[school]', 'page');
  return img;
}
export async function getPublicStaffProfiles() {
  const schoolId = await getSchoolId();
  return await websiteService.getPublicStaffProfiles(schoolId);
}
export async function createPublicStaffProfile(data: any) {
  const schoolId = await getSchoolId();
  const profile = await websiteService.createPublicStaffProfile(schoolId, data);
  revalidatePath('/[school]', 'page');
  return profile;
}
`);
