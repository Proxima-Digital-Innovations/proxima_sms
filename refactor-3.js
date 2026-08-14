const fs = require('fs');
const path = require('path');
const basePath = 'C:\\projects\\School-hub\\schoolsystem\\src';
function write(filePath, content) {
    const fullPath = path.join(basePath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim() + '\n');
}

// 6. Super Admin
write('lib/dal/super-admin-repository.ts', `
import { prisma } from "@/lib/prisma";

export class SuperAdminRepository {
  async getSchoolBySubdomainOrSlug(subdomain: string) {
    return await prisma.school.findFirst({
      where: {
        OR: [
          { subdomain: subdomain },
          { slug: subdomain }
        ]
      }
    });
  }

  async createSchool(data: any) {
    return await prisma.school.create({ data });
  }

  async createAcademicSession(data: any) {
    return await prisma.academicSession.create({ data });
  }

  async createTerm(data: any) {
    return await prisma.term.create({ data });
  }

  async createUser(data: any) {
    return await prisma.user.create({ data });
  }

  async updateSchoolLicense(schoolId: string, data: any) {
    return await prisma.school.update({
      where: { id: schoolId },
      data
    });
  }
}
`);
write('lib/services/super-admin-service.ts', `
import { SuperAdminRepository } from '../dal/super-admin-repository';
import bcrypt from "bcryptjs";

export class SuperAdminService {
  private repo = new SuperAdminRepository();

  async createSchool(validatedData: any) {
    const existingSchool = await this.repo.getSchoolBySubdomainOrSlug(validatedData.subdomain);
    if (existingSchool) {
      return { success: false, error: "Subdomain or slug already in use" };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.trialDays);

    const school = await this.repo.createSchool({
      name: validatedData.name,
      subdomain: validatedData.subdomain,
      slug: validatedData.subdomain,
      primaryColor: validatedData.primaryColor,
      secondaryColor: validatedData.secondaryColor,
      licenseStatus: 'TRIAL',
      expiresAt: expiresAt,
      maxUsers: 50,
      maxStudents: 500
    });

    const session = await this.repo.createAcademicSession({
      schoolId: school.id,
      name: \`\${new Date().getFullYear()}/\${new Date().getFullYear() + 1}\`,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    });

    await this.repo.createTerm({
      schoolId: school.id,
      sessionId: session.id,
      name: "First Term",
      isActive: true,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    });

    const passwordHash = await bcrypt.hash('password123', 10);
    await this.repo.createUser({
      schoolId: school.id,
      firstName: "Admin",
      lastName: "User",
      email: \`admin@\${validatedData.subdomain}.proximahub.com\`,
      passwordHash: passwordHash,
      role: "ADMIN",
      status: "active",
    });

    return { success: true, school };
  }

  async updateSchoolLicense(schoolId: string, data: { licenseStatus: string, expiresAt: string, activeModules: string[] }) {
    await this.repo.updateSchoolLicense(schoolId, {
      licenseStatus: data.licenseStatus,
      expiresAt: new Date(data.expiresAt),
      activeModules: JSON.stringify(data.activeModules)
    });
    return { success: true };
  }
}
`);
write('actions/super-admin-actions.ts', `
// @ts-nocheck
'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { SuperAdminService } from "@/lib/services/super-admin-service";

const CreateSchoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  subdomain: z.string()
    .min(2, "Subdomain must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color"),
  trialDays: z.number().min(1, "Trial days must be at least 1"),
});

const superAdminService = new SuperAdminService();

export async function createSchool(formData: z.infer<typeof CreateSchoolSchema>) {
  try {
    const validatedData = CreateSchoolSchema.parse(formData);
    const result = await superAdminService.createSchool(validatedData);
    if (result.success) {
      revalidatePath('/super-admin');
    }
    return result;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: error.message || "Failed to create school" };
  }
}

export async function updateSchoolLicense(schoolId: string, data: { licenseStatus: string, expiresAt: string, activeModules: string[] }) {
  try {
    const result = await superAdminService.updateSchoolLicense(schoolId, data);
    if (result.success) {
      revalidatePath('/super-admin');
    }
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update license" };
  }
}
`);

// 7. Upload
write('lib/dal/upload-repository.ts', `
import { prisma } from '@/lib/prisma';

export class UploadRepository {
    async findSubject(idOrName: string) {
        return await prisma.subject.findFirst({
            where: {
                OR: [
                    { id: idOrName },
                    { name: idOrName }
                ]
            }
        });
    }

    async getFirstSchool() {
        return await prisma.school.findFirst();
    }

    async createSubject(schoolId: string, name: string) {
        return await prisma.subject.create({
            data: {
                schoolId: schoolId,
                name: name
            }
        });
    }

    async findTerm(term: string) {
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

    async findStudent(idOrStudentId: string) {
        return await prisma.student.findFirst({
            where: {
                OR: [
                    { id: idOrStudentId },
                    { studentId: idOrStudentId }
                ]
            }
        });
    }

    async upsertTermGrade(studentId: string, subjectId: string, termId: string, schoolId: string, ca1: number, exam: number, total: number, grade: string) {
        return await prisma.termGrade.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId,
                    subjectId,
                    termId
                }
            },
            update: {
                ca1,
                exam,
                total,
                grade
            },
            create: {
                schoolId,
                studentId,
                subjectId,
                termId,
                ca1,
                exam,
                total,
                grade
            }
        });
    }

    async upsertMidtermResult(studentId: string, subjectId: string, termId: string, schoolId: string, score: number, achievement: string, session: string) {
        return await prisma.midtermResult.upsert({
            where: {
                studentId_subjectId_termId: {
                    studentId,
                    subjectId,
                    termId
                }
            },
            update: {
                score,
                achievement,
                session
            },
            create: {
                schoolId,
                studentId,
                subjectId,
                termId,
                session,
                score,
                achievement
            }
        });
    }

    async findStudentsByClassLevel(classLevel: string) {
        return await prisma.student.findMany({
            where: {
                class: {
                    name: classLevel
                },
                status: 'Active'
            }
        });
    }
}
`);
write('lib/services/upload-service.ts', `
import { UploadRepository } from '../dal/upload-repository';

export class UploadService {
    private repo = new UploadRepository();

    async resolveSubject(subject: string) {
        let subjectRecord = await this.repo.findSubject(subject);
        if (!subjectRecord) {
            const firstSchool = await this.repo.getFirstSchool();
            if (!firstSchool) throw new Error("No school found in the system");
            
            subjectRecord = await this.repo.createSubject(firstSchool.id, subject);
        }
        return subjectRecord;
    }

    async resolveTerm(term: string) {
        const termRecord = await this.repo.findTerm(term);
        if (!termRecord) throw new Error(\`Term \${term} not found\`);
        return termRecord;
    }

    async resolveStudent(studentId: string) {
        return await this.repo.findStudent(studentId);
    }

    async processScoreRow(studentId: string, caScore: number, examScore: number, subjectRecord: any, termRecord: any) {
        const student = await this.resolveStudent(studentId);
        if (!student) throw new Error(\`Student \${studentId} not found\`);

        const totalScore = caScore + examScore;
        let grade = 'F';
        if (totalScore >= 80) grade = 'A';
        else if (totalScore >= 70) grade = 'B';
        else if (totalScore >= 60) grade = 'C';
        else if (totalScore >= 50) grade = 'D';
        else if (totalScore >= 40) grade = 'E';

        await this.repo.upsertTermGrade(student.id, subjectRecord.id, termRecord.id, student.schoolId, caScore, examScore, totalScore, grade);
    }

    async processMidtermRow(studentId: string, score: number, achievement: string, session: string, subjectRecord: any, termRecord: any) {
        const student = await this.resolveStudent(studentId);
        if (!student) throw new Error(\`Student \${studentId} not found\`);

        await this.repo.upsertMidtermResult(student.id, subjectRecord.id, termRecord.id, student.schoolId, score, achievement, session);
    }

    async getStudentsDataForTemplate(classLevel: string, isMidterm: boolean) {
        const students = await this.repo.findStudentsByClassLevel(classLevel);
        return students.map(s => {
            const base = {
                'Student ID': s.id,
                'Student Name': \`\${s.firstName} \${s.lastName}\`,
                'Admission Number': s.studentId
            };
            if (isMidterm) {
                return { ...base, 'Score': 0, 'Achievement': '' };
            } else {
                return { ...base, 'CA Score': 0, 'Exam Score': 0 };
            }
        });
    }
}
`);
write('actions/upload-actions.ts', `
'use server';

import * as XLSX from 'xlsx';
import { UploadService } from '@/lib/services/upload-service';

const uploadService = new UploadService();

export async function uploadScoresFromExcel(
    file: File, 
    subject: string, 
    classLevel: string, 
    term: string, 
    session: string
) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        const subjectRecord = await uploadService.resolveSubject(subject);
        const termRecord = await uploadService.resolveTerm(term);

        for (const rowData of data) {
            try {
                const row = rowData as any;
                const studentId = row['Student ID'] || row['studentId'];
                const caScore = Number(row['CA Score'] || row['caScore'] || 0);
                const examScore = Number(row['Exam Score'] || row['examScore'] || 0);
                
                if (!studentId) {
                    errors.push(\`Row missing student ID\`);
                    errorCount++;
                    continue;
                }

                if (caScore < 0 || caScore > 40 || examScore < 0 || examScore > 60) {
                    errors.push(\`Invalid scores for student \${studentId}\`);
                    errorCount++;
                    continue;
                }

                await uploadService.processScoreRow(studentId, caScore, examScore, subjectRecord, termRecord);
                successCount++;
            } catch (error: any) {
                errors.push(\`Error processing row: \${error.message}\`);
                errorCount++;
            }
        }

        return { success: true, successCount, errorCount, errors };
    } catch (error) {
        console.error('Error uploading scores:', error);
        throw new Error('Failed to upload scores');
    }
}

export async function uploadMidtermFromExcel(
    file: File, 
    subject: string, 
    classLevel: string, 
    term: string, 
    session: string
) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        const subjectRecord = await uploadService.resolveSubject(subject);
        const termRecord = await uploadService.resolveTerm(term);

        for (const rowData of data) {
            try {
                const row = rowData as any;
                const studentId = row['Student ID'] || row['studentId'];
                const score = Number(row['Score'] || row['score'] || 0);
                const achievement = row['Achievement'] || row['achievement'] || '';
                
                if (!studentId) {
                    errors.push(\`Row missing student ID\`);
                    errorCount++;
                    continue;
                }

                if (score < 0 || score > 20) {
                    errors.push(\`Invalid score for student \${studentId}\`);
                    errorCount++;
                    continue;
                }

                await uploadService.processMidtermRow(studentId, score, achievement, session, subjectRecord, termRecord);
                successCount++;
            } catch (error: any) {
                errors.push(\`Error processing row: \${error.message}\`);
                errorCount++;
            }
        }

        return { success: true, successCount, errorCount, errors };
    } catch (error) {
        console.error('Error uploading midterm:', error);
        throw new Error('Failed to upload midterm results');
    }
}

export async function generateScoreTemplate(classLevel: string) {
    try {
        const studentsData = await uploadService.getStudentsDataForTemplate(classLevel, false);
        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}

export async function generateMidtermTemplate(classLevel: string) {
    try {
        const studentsData = await uploadService.getStudentsDataForTemplate(classLevel, true);
        const worksheet = XLSX.utils.json_to_sheet(studentsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generating template:', error);
        throw new Error('Failed to generate template');
    }
}
`);
