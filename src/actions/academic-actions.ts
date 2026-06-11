
'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireSchoolId } from '@/lib/server-context';

// --- Standards Management ---

export async function createStandard(data: { code: string; description: string; subjectId: string }) {
    try {
        const schoolId = await requireSchoolId();
        const standard = await prisma.standard.create({
            data: {
                ...data,
                schoolId
            }
        });
        revalidatePath('/dashboard/admin/academics/standards');
        return { success: true, standard };
    } catch (error: any) {
        console.error('Error creating standard:', error);
        return { error: error.message };
    }
}

export async function getStandards(subjectId?: string) {
    return await prisma.standard.findMany({
        where: subjectId ? { subjectId } : {},
        include: { subject: true }
    });
}

// --- Assignment Management ---

const assignmentSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.date(),
    maxPoints: z.number().positive(),
    classId: z.string().min(1),
    subjectId: z.string().min(1),
    standardId: z.string().optional(),
});

export async function createAssignment(formData: FormData) {
    try {
        const data = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            dueDate: new Date(formData.get('dueDate') as string),
            maxPoints: Number(formData.get('maxPoints')),
            classId: formData.get('classId') as string,
            subjectId: formData.get('subjectId') as string,
            standardId: (formData.get('standardId') as string) || undefined,
        };

        const parsed = assignmentSchema.parse(data);
        const schoolId = await requireSchoolId();

        // Find the active term to associate with the module
        const activeTerm = await prisma.term.findFirst({
            where: { schoolId, isActive: true }
        });
        if (!activeTerm) {
            throw new Error("No active term found. Cannot create assignment.");
        }

        // Assignments must belong to an LMS module in schema.prisma.
        // We find or create a default module for this class/subject/term.
        let lmsModule = await prisma.lmsModule.findFirst({
            where: {
                classId: parsed.classId,
                subjectId: parsed.subjectId,
                termId: activeTerm.id,
                schoolId
            }
        });

        if (!lmsModule) {
            lmsModule = await prisma.lmsModule.create({
                data: {
                    title: 'General Coursework',
                    classId: parsed.classId,
                    subjectId: parsed.subjectId,
                    termId: activeTerm.id,
                    schoolId
                }
            });
        }

        // Create the assignment linking it to the resolved LMS module
        const assignment = await prisma.assignment.create({
            data: {
                title: parsed.title,
                description: parsed.description,
                points: parsed.maxPoints,
                dueDate: parsed.dueDate,
                classId: parsed.classId,
                subjectId: parsed.subjectId,
                standardId: parsed.standardId || null,
                moduleId: lmsModule.id,
                schoolId
            }
        });

        revalidatePath('/dashboard/teacher/assignments');
        return { success: true, assignment };
    } catch (error: any) {
        console.error('Error creating assignment:', error);
        return { error: error.message };
    }
}

// --- Grading (SBG & Traditional) ---

export async function submitGrades(assignmentId: string, grades: { studentId: string; score: number; feedback?: string }[]) {
    try {
        const schoolId = await requireSchoolId();
        return await prisma.$transaction(async (tx) => {
            const results = await Promise.all(
                grades.map(grade => 
                    tx.submission.create({
                        data: {
                            studentId: grade.studentId,
                            assignmentId,
                            schoolId,
                            score: grade.score,
                            feedback: grade.feedback,
                            gradedAt: new Date()
                        }
                    })
                )
            );
            return { success: true, count: results.length };
        });
    } catch (error: any) {
        console.error('Error submitting grades:', error);
        return { error: error.message };
    }
}

/**
 * Returns high-level admin dashboard statistics from Prisma.
 * Used by the admin dashboard overview cards.
 */
export async function getAdminDashboardStats() {
    try {
        const schoolId = await requireSchoolId();

        // Count active students enrolled in this school
        const totalStudents = await prisma.student.count({
            where: { schoolId, status: 'Active' }
        });

        // Count staff (users that are not super-admins)
        const totalStaff = await prisma.user.count({
            where: { schoolId, isSuperAdmin: false }
        });

        // Sum of total amount paid across all invoices for this school
        const revenueAgg = await prisma.invoice.aggregate({
            where: { schoolId },
            _sum: { amountPaid: true }
        });
        const totalRevenue = revenueAgg._sum.amountPaid || 0;

        // Count invoices with non-zero balance (unpaid/partially paid)
        const pendingPayments = await prisma.invoice.count({
            where: { schoolId, status: { not: 'PAID' } }
        });

        // Count classes in this school
        const activeClasses = await prisma.class.count({
            where: { schoolId }
        });

        // Get recent audit logs as activity feed
        const recentLogs = await prisma.auditLog.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { action: true, entity: true, createdAt: true }
        });

        const recentActivities = recentLogs.map(log => ({
            title: `${log.action} ${log.entity}`,
            time: log.createdAt.toLocaleString(),
            type: log.entity.toLowerCase()
        }));

        return {
            success: true,
            data: { totalStudents, totalStaff, totalRevenue, pendingPayments, activeClasses, recentActivities }
        };
    } catch (error: any) {
        console.error('Error fetching admin dashboard stats:', error);
        return { success: false, data: null, error: error.message };
    }
}

/**
 * Calculates Mastery level for a student on a specific standard
 */
export async function getStandardMastery(studentId: string, standardId: string) {
    const grades = await prisma.submission.findMany({
        where: {
            studentId,
            assignment: {
                standardId
            }
        },
        orderBy: {
            submittedAt: 'desc'
        },
        take: 3 // PowerSchool often uses "Decaying Average" or "Most Recent"
    });

    if (grades.length === 0) return 0;

    // Simple average for now
    const sum = grades.reduce((acc: number, g: any) => acc + (g.score || 0), 0);
    return sum / grades.length;
}
