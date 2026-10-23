'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { canAdmitStudents } from '@/lib/services/license-capacity';
import { auth } from '@/auth';

function safeRevalidatePath(path: string) {
    try {
        revalidatePath(path);
    } catch {}
}

export async function generateNextStudentId(prefix: string = 'STU'): Promise<string> {
    try {
        const students = await prisma.student.findMany({
            select: { studentId: true },
        });

        let highestNumber = 20000;
        for (const s of students) {
            if (!s.studentId) continue;
            const match = s.studentId.match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > highestNumber && num < 1000000) {
                    highestNumber = num;
                }
            }
        }

        const nextNum = highestNumber + 1;
        return `${prefix}-${nextNum}`;
    } catch {
        return `${prefix}-${Date.now().toString().slice(-5)}`;
    }
}

export async function getStudents(classId?: string) {
    try {
        const whereClause = classId ? { classId } : {};
        const students = await prisma.student.findMany({
            where: whereClause,
            include: { class: true }
        });
        return { success: true, data: students };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStudentDashboardData(targetStudentId?: string) {
    try {
        let studentWhere: any = null;
        if (targetStudentId) {
            studentWhere = { OR: [{ id: targetStudentId }, { studentId: targetStudentId }] };
        } else {
            const session = await auth();
            const sessionUser = session?.user as any;
            if (sessionUser) {
                const matchedStudent = await prisma.student.findFirst({
                    where: {
                        OR: [
                            { studentId: sessionUser.staffId || sessionUser.username || '' },
                            { id: sessionUser.id },
                        ]
                    }
                });
                if (matchedStudent) {
                    studentWhere = { id: matchedStudent.id };
                }
            }
            if (!studentWhere) {
                studentWhere = { status: { in: ['Active', 'ACTIVE'] } };
            }
        }

        const student = await prisma.student.findFirst({
            where: studentWhere,
            include: { class: true },
            orderBy: { createdAt: 'desc' }
        });

        if (!student) {
            return {
                success: true,
                data: {
                    profile: { firstName: 'Student', lastName: '', studentId: 'N/A', class: { name: 'General' } },
                    stats: { attendanceRate: 100, totalBalance: 0 },
                    upcomingAssignments: [],
                    availableQuizzes: [],
                    recentModules: [],
                }
            };
        }

        const [totalAtt, presentAtt, unpaidInvoices, upcomingAssignments, availableQuizzes, recentModules] = await Promise.all([
            prisma.attendance.count({ where: { studentId: student.id } }),
            prisma.attendance.count({ where: { studentId: student.id, status: { in: ['PRESENT', 'Present'] } } }),
            prisma.invoice.findMany({
                where: { studentId: student.id, status: { in: ['UNPAID', 'PARTIAL'] } }
            }),
            student.classId
                ? prisma.assignment.findMany({
                    where: { classId: student.classId },
                    include: { subject: true },
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                })
                : Promise.resolve([]),
            student.classId
                ? prisma.quiz.findMany({
                    where: { module: { classId: student.classId } },
                    include: { module: { include: { subject: true } } },
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                })
                : Promise.resolve([]),
            student.classId
                ? prisma.lmsModule.findMany({
                    where: { classId: student.classId },
                    include: { subject: true, content: true },
                    take: 4,
                    orderBy: { updatedAt: 'desc' }
                })
                : Promise.resolve([])
        ]);

        const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 95;
        const totalBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0);

        return {
            success: true,
            data: {
                profile: student,
                stats: {
                    attendanceRate,
                    totalBalance,
                },
                upcomingAssignments,
                availableQuizzes,
                recentModules,
            }
        };
    } catch (error: any) {
        console.error("Error in getStudentDashboardData:", error);
        return { success: false, error: error.message };
    }
}

export async function createStudent(data: any) { return admitStudent(data); }

export async function bulkCreateStudents(studentsList: any[]): Promise<{
    success: boolean;
    error?: string;
    importedCount?: number;
    errorCount?: number;
    invalidRecords?: any[];
    data?: any;
    warning?: string;
}> {
    try {
        if (!Array.isArray(studentsList) || studentsList.length === 0) {
            return { success: false, error: 'No student records provided.' };
        }

        // Pre-flight check: capacity & grace buffer for batch
        const capacityCheck = await canAdmitStudents(studentsList.length);
        if (!capacityCheck.allowed) {
            return {
                success: false,
                error: capacityCheck.message,
                importedCount: 0,
                errorCount: studentsList.length,
                invalidRecords: [],
            };
        }

        let importedCount = 0;
        const invalidRecords: any[] = [];

        // Preload classes for fast in-memory name matching
        const allClasses = await prisma.class.findMany();
        const classMap = new Map<string, string>();
        for (const c of allClasses) {
            classMap.set(c.name.toLowerCase().trim(), c.id);
            if (c.code) classMap.set(c.code.toLowerCase().trim(), c.id);
        }

        for (const item of studentsList) {
            try {
                const firstName = item.firstName?.toString().trim();
                const lastName = item.lastName?.toString().trim();
                if (!firstName || !lastName) {
                    invalidRecords.push({ 
                        firstName: firstName || 'N/A', 
                        lastName: lastName || 'N/A', 
                        error: 'Missing required first name or last name' 
                    });
                    continue;
                }

                // Resolve classId: direct ID or match class name from spreadsheet
                let resolvedClassId = item.classId || null;
                if (!resolvedClassId && item.class) {
                    const targetName = item.class.toString().toLowerCase().trim();
                    resolvedClassId = classMap.get(targetName) || null;
                    if (!resolvedClassId) {
                        for (const [name, id] of classMap.entries()) {
                            if (targetName.includes(name) || name.includes(targetName)) {
                                resolvedClassId = id;
                                break;
                            }
                        }
                    }
                }

                const guardianName = item.guardianName?.toString().trim() || item.guardianFullName?.toString().trim();
                const guardianContact = item.guardianContact?.toString().trim() || item.guardianPhone?.toString().trim();
                const guardianEmail = item.guardianEmail?.toString().trim();

                const studentId = item.studentId?.toString().trim() || await generateNextStudentId();

                await prisma.student.create({
                    data: {
                        firstName,
                        lastName,
                        middleName: item.middleName?.toString().trim() || null,
                        studentId,
                        gender: (item.gender?.toString().trim().toLowerCase() === 'female' ? 'Female' : 'Male'),
                        dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : new Date(2010, 0, 1),
                        admissionDate: item.admissionDate ? new Date(item.admissionDate) : new Date(),
                        status: item.status || 'Active',
                        sessionYear: item.sessionYear || item.session || '2024/2025',
                        classId: resolvedClassId,
                        guardians: guardianName ? {
                            create: {
                                fullName: guardianName,
                                relationship: item.guardianRelationship?.toString().trim() || "Guardian",
                                phone: guardianContact || '',
                                email: guardianEmail || '',
                                address: item.address?.toString().trim() || item.guardianAddress?.toString().trim() || ''
                            }
                        } : undefined
                    }
                });
                importedCount++;
            } catch (err: any) {
                invalidRecords.push({ 
                    firstName: item.firstName || 'N/A', 
                    lastName: item.lastName || '', 
                    error: err.message || 'Database error during student creation' 
                });
            }
        }

        safeRevalidatePath('/dashboard/students');
        safeRevalidatePath('/dashboard/system/license');
        return {
            success: true,
            importedCount,
            errorCount: invalidRecords.length,
            invalidRecords,
            warning: capacityCheck.willEnterGrace ? capacityCheck.message : undefined,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function admitStudent(data: any) {
    try {
        // Pre-flight check: capacity & grace buffer
        const capacityCheck = await canAdmitStudents(1);
        if (!capacityCheck.allowed) {
            return {
                success: false,
                error: capacityCheck.message,
                isCapacityBlocked: true,
                capacity: capacityCheck,
            };
        }

        const studentId = data.studentId?.toString().trim() || await generateNextStudentId();

        const student = await prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                studentId,
                gender: data.gender || 'NOT_SPECIFIED',
                dateOfBirth: new Date(data.dateOfBirth || new Date()),
                admissionDate: new Date(),
                status: 'ACTIVE',
                sessionYear: data.sessionYear || data.session || '2024/2025',
                classId: data.classId || null,
                guardians: (data.guardianName || data.guardianFullName) ? {
                    create: {
                        fullName: data.guardianName || data.guardianFullName,
                        relationship: data.guardianRelationship || "Guardian",
                        phone: data.guardianContact || data.guardianPhone || '',
                        email: data.guardianEmail || '',
                        address: data.address || data.guardianAddress || ''
                    }
                } : undefined
            }
        });

        safeRevalidatePath('/dashboard/students');
        safeRevalidatePath('/dashboard/system/license');
        return {
            success: true,
            data: student,
            warning: capacityCheck.willEnterGrace ? capacityCheck.message : undefined,
            isGraceAdmission: capacityCheck.willEnterGrace,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function promoteStudents(studentIds: string[], targetClassId: string) {
    try {
        await prisma.student.updateMany({
            where: { id: { in: studentIds } },
            data: { classId: targetClassId }
        });
        safeRevalidatePath('/dashboard/students');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
