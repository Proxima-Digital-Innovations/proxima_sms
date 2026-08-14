const fs = require('fs');
const path = require('path');

const basePath = 'C:\\projects\\School-hub\\schoolsystem\\src';

function write(filePath, content) {
    const fullPath = path.join(basePath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n');
}

// 1. Tahfeez
write('lib/dal/tahfeez-repository.ts', `
import { prisma } from '@/lib/prisma';

export class TahfeezRepository {
  async createScores(scores: any[], schoolId: string) {
    return await prisma.$transaction(
      scores.map((score) =>
        prisma.tahfeezScore.create({
          data: {
            schoolId,
            studentId: score.studentId,
            termId:    score.termId,
            session:   score.session,
            surah:     score.surah,
            juz:       score.juz,
            page:      score.page,
            marks:     score.marks,
          },
        })
      )
    );
  }

  async updateScore(scoreId: string, data: any) {
    return await prisma.tahfeezScore.update({
      where: { id: scoreId },
      data,
    });
  }

  async deleteScore(scoreId: string) {
    return await prisma.tahfeezScore.delete({
      where: { id: scoreId },
    });
  }
}
`);

write('lib/services/tahfeez-service.ts', `
import { TahfeezRepository } from '../dal/tahfeez-repository';

export class TahfeezService {
  private repo = new TahfeezRepository();

  async saveTahfeezScores(scores: any[], schoolId: string) {
    await this.repo.createScores(scores, schoolId);
  }

  async updateTahfeezScore(scoreId: string, data: any) {
    await this.repo.updateScore(scoreId, data);
  }

  async deleteTahfeezScore(scoreId: string) {
    await this.repo.deleteScore(scoreId);
  }
}
`);

write('actions/tahfeez-actions.ts', `
'use server';

import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';
import { TahfeezService } from '@/lib/services/tahfeez-service';

type TahfeezScoreInput = {
  studentId: string;
  termId:    string;
  session:   string;
  surah?:    string;
  juz?:      number;
  page?:     number;
  marks:     number;
};

function revalidateTahfeez() {
  revalidatePath('/dashboard/tahfeez');
}

const tahfeezService = new TahfeezService();

export async function saveTahfeezScores(scores: TahfeezScoreInput[]) {
  try {
    const schoolId = await requireSchoolId();
    await tahfeezService.saveTahfeezScores(scores, schoolId);
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error saving Tahfeez scores:', error);
    return { success: false, error: 'Failed to save Tahfeez scores' };
  }
}

export async function updateTahfeezScore(
  scoreId: string,
  data: Partial<TahfeezScoreInput>
) {
  try {
    const updateData = {
      ...(data.studentId !== undefined && { studentId: data.studentId }),
      ...(data.termId    !== undefined && { termId:    data.termId }),
      ...(data.session   !== undefined && { session:   data.session }),
      ...(data.surah     !== undefined && { surah:     data.surah }),
      ...(data.juz       !== undefined && { juz:       data.juz }),
      ...(data.page      !== undefined && { page:      data.page }),
      ...(data.marks     !== undefined && { marks:     data.marks }),
    };
    await tahfeezService.updateTahfeezScore(scoreId, updateData);
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error updating Tahfeez score:', error);
    return { success: false, error: 'Failed to update Tahfeez score' };
  }
}

export async function deleteTahfeezScore(scoreId: string) {
  try {
    await tahfeezService.deleteTahfeezScore(scoreId);
    revalidateTahfeez();
    return { success: true };
  } catch (error) {
    console.error('Error deleting Tahfeez score:', error);
    return { success: false, error: 'Failed to delete Tahfeez score' };
  }
}
`);

// 2. Health
write('lib/dal/health-repository.ts', `
import { prisma } from "@/lib/prisma";

export class HealthRepository {
  async getStudentHealthRecord(studentId: string) {
    return await prisma.healthRecord.findUnique({
      where: { studentId },
      include: {
        immunizations: { orderBy: { dateGiven: 'desc' } },
        clinicVisits: { 
          orderBy: { date: 'desc' },
          include: { nurse: true }
        },
        student: true
      }
    });
  }

  async createStudentHealthRecord(studentId: string, schoolId: string) {
    return await prisma.healthRecord.create({
      data: { studentId, schoolId },
      include: {
        immunizations: true,
        clinicVisits: { include: { nurse: true } },
        student: true
      }
    });
  }

  async updateHealthProfile(studentId: string, data: any, schoolId: string) {
    return await prisma.healthRecord.update({
      where: { studentId },
      data: { ...data, schoolId }
    });
  }

  async logClinicVisit(healthRecordId: string, schoolId: string, data: any) {
    return await prisma.clinicVisit.create({
      data: {
        healthRecordId,
        schoolId,
        ...data,
      }
    });
  }

  async addImmunization(healthRecordId: string, schoolId: string, data: any) {
    return await prisma.immunization.create({
      data: {
        healthRecordId,
        schoolId,
        ...data
      }
    });
  }

  async getStudentsForHealthDashboard(schoolId: string, searchQuery?: string) {
    return await prisma.student.findMany({
      where: {
        schoolId,
        ...(searchQuery ? {
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' } },
            { lastName: { contains: searchQuery, mode: 'insensitive' } },
            { studentId: { contains: searchQuery, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        healthRecord: {
          select: { allergies: true, chronicIllness: true }
        },
        class: true
      },
      take: 50,
      orderBy: { lastName: 'asc' }
    });
  }
}
`);

write('lib/services/health-service.ts', `
import { HealthRepository } from '../dal/health-repository';

export class HealthService {
  private repo = new HealthRepository();

  async getStudentHealthRecord(studentId: string, schoolId: string) {
    let record = await this.repo.getStudentHealthRecord(studentId);
    if (!record) {
      record = await this.repo.createStudentHealthRecord(studentId, schoolId);
    }
    return record;
  }

  async updateHealthProfile(studentId: string, data: any, schoolId: string) {
    return await this.repo.updateHealthProfile(studentId, data, schoolId);
  }

  async logClinicVisit(healthRecordId: string, schoolId: string, data: any) {
    return await this.repo.logClinicVisit(healthRecordId, schoolId, data);
  }

  async addImmunization(healthRecordId: string, schoolId: string, data: any) {
    return await this.repo.addImmunization(healthRecordId, schoolId, data);
  }

  async getStudentsForHealthDashboard(schoolId: string, searchQuery?: string) {
    return await this.repo.getStudentsForHealthDashboard(schoolId, searchQuery);
  }
}
`);

write('actions/health-actions.ts', `
'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { HealthService } from "@/lib/services/health-service";

const healthService = new HealthService();

export async function getStudentHealthRecord(studentId: string) {
  try {
    const schoolId = await requireSchoolId();
    const record = await healthService.getStudentHealthRecord(studentId, schoolId);
    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateHealthProfile(studentId: string, data: any) {
  try {
    const schoolId = await requireSchoolId();
    const record = await healthService.updateHealthProfile(studentId, data, schoolId);
    revalidatePath("/admin/health");
    return { success: true, record };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function logClinicVisit(healthRecordId: string, data: { symptoms: string, diagnosis?: string, treatment?: string, sentHome: boolean, notes?: string }) {
  try {
    const schoolId = await requireSchoolId();
    const visit = await healthService.logClinicVisit(healthRecordId, schoolId, data);
    revalidatePath("/admin/health");
    return { success: true, visit };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addImmunization(healthRecordId: string, data: { vaccineName: string, dateGiven?: Date, status: string, notes?: string }) {
  try {
    const schoolId = await requireSchoolId();
    const immunization = await healthService.addImmunization(healthRecordId, schoolId, data);
    revalidatePath("/admin/health");
    return { success: true, immunization };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getStudentsForHealthDashboard(searchQuery?: string) {
  try {
    const schoolId = await requireSchoolId();
    const students = await healthService.getStudentsForHealthDashboard(schoolId, searchQuery);
    return { success: true, students };
  } catch (error: any) {
    return { success: false, students: [], message: error.message };
  }
}
`);

// 3. Discipline
write('lib/dal/discipline-repository.ts', `
import { prisma } from "@/lib/prisma";

export class DisciplineRepository {
  async getRecentIncidents(schoolId: string, limit: number) {
    return await prisma.behavioralIncident.findMany({
      where: { schoolId },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        student: { select: { firstName: true, lastName: true, studentId: true } },
        reporter: { select: { firstName: true, lastName: true } },
        actions: true
      }
    });
  }

  async getStudentIncidents(studentId: string) {
    return await prisma.behavioralIncident.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
      include: {
        reporter: { select: { firstName: true, lastName: true } },
        actions: { orderBy: { date: 'desc' } }
      }
    });
  }
  
  async getAdminReporter(schoolId: string) {
    return await prisma.user.findFirst({ where: { role: 'ADMIN', schoolId } });
  }

  async createIncident(schoolId: string, reporterId: string, data: any) {
    return await prisma.behavioralIncident.create({
      data: {
        reporterId,
        schoolId,
        ...data,
      }
    });
  }

  async createIncidentAction(schoolId: string, incidentId: string, actionTaken: string, details?: string) {
    return await prisma.incidentAction.create({
      data: {
        incidentId,
        schoolId,
        actionTaken,
        details
      }
    });
  }

  async updateIncidentStatus(incidentId: string, status: string) {
    return await prisma.behavioralIncident.update({
      where: { id: incidentId },
      data: { status }
    });
  }
}
`);

write('lib/services/discipline-service.ts', `
import { DisciplineRepository } from '../dal/discipline-repository';

export class DisciplineService {
  private repo = new DisciplineRepository();

  async getRecentIncidents(schoolId: string, limit: number = 50) {
    return await this.repo.getRecentIncidents(schoolId, limit);
  }

  async getStudentIncidents(studentId: string) {
    return await this.repo.getStudentIncidents(studentId);
  }

  async logIncident(schoolId: string, data: any) {
    const defaultReporter = await this.repo.getAdminReporter(schoolId);
    if (!defaultReporter) throw new Error("No reporter found.");

    return await this.repo.createIncident(schoolId, defaultReporter.id, data);
  }

  async addIncidentAction(schoolId: string, incidentId: string, actionTaken: string, details?: string) {
    return await this.repo.createIncidentAction(schoolId, incidentId, actionTaken, details);
  }

  async updateIncidentStatus(incidentId: string, status: string) {
    return await this.repo.updateIncidentStatus(incidentId, status);
  }
}
`);

write('actions/discipline-actions.ts', `
'use server';

import { revalidatePath } from "next/cache";
import { requireSchoolId } from "@/lib/server-context";
import { DisciplineService } from "@/lib/services/discipline-service";

const disciplineService = new DisciplineService();

export async function getRecentIncidents(limit = 50) {
  try {
    const schoolId = await requireSchoolId();
    const incidents = await disciplineService.getRecentIncidents(schoolId, limit);
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

export async function getStudentIncidents(studentId: string) {
  try {
    const incidents = await disciplineService.getStudentIncidents(studentId);
    return { success: true, incidents };
  } catch (error: any) {
    return { success: false, incidents: [], message: error.message };
  }
}

export async function logIncident(data: { studentId: string, title: string, description: string, severity: string, date?: Date }) {
  try {
    const schoolId = await requireSchoolId();
    const incident = await disciplineService.logIncident(schoolId, data);
    revalidatePath("/admin/discipline");
    return { success: true, incident };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function addIncidentAction(incidentId: string, actionTaken: string, details?: string) {
  try {
    const schoolId = await requireSchoolId();
    const action = await disciplineService.addIncidentAction(schoolId, incidentId, actionTaken, details);
    revalidatePath("/admin/discipline");
    return { success: true, action };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateIncidentStatus(incidentId: string, status: string) {
  try {
    await disciplineService.updateIncidentStatus(incidentId, status);
    revalidatePath("/admin/discipline");
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
`);
