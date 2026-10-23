'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAcademicData() {
    try {
        const [classes, subjects, departments, terms, sessions] = await Promise.all([
            prisma.class.findMany({ orderBy: { name: 'asc' } }),
            prisma.subject.findMany({ orderBy: { name: 'asc' }, include: { department: true } }),
            prisma.department.findMany({ orderBy: { name: 'asc' } }),
            prisma.term.findMany({ orderBy: { startDate: 'desc' } }),
            prisma.academicSession.findMany({ orderBy: { startDate: 'desc' } }),
        ]);

        return {
            classes: classes.map(c => ({ 
                id: c.id, 
                name: c.name,
                teacherId: c.teacherId,
                subjectIds: c.subjectIds ? JSON.parse(c.subjectIds) : [],
                subjectTeachers: c.subjectTeachers ? JSON.parse(c.subjectTeachers) : {}
            })),
            subjects: subjects.map(s => ({ id: s.id, name: s.name, departmentId: s.departmentId })),
            departments: departments.map(d => ({ id: d.id, name: d.name })),
            terms: terms.map(t => ({ id: t.id, name: t.name, isActive: t.isActive })),
            sessions: sessions.map(s => ({ id: s.id, name: s.name, isActive: s.isActive })),
        };
    } catch (error) {
        console.error('Failed to fetch academic data:', error);
        return { classes: [], subjects: [], departments: [], terms: [], sessions: [] };
    }
}

export async function addClass(name: string) {
    try {
        await prisma.class.create({ data: { name } });
        revalidatePath('/dashboard/system/classes-subjects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteClass(id: string) {
    try {
        await prisma.class.delete({ where: { id } });
        revalidatePath('/dashboard/system/classes-subjects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addSubject(name: string, departmentId: string) {
    try {
        await prisma.subject.create({ data: { name, departmentId } });
        revalidatePath('/dashboard/system/classes-subjects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSubject(id: string) {
    try {
        await prisma.subject.delete({ where: { id } });
        revalidatePath('/dashboard/system/classes-subjects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function assignSubjectToDepartment(subjectId: string, departmentId: string) {
    try {
        await prisma.subject.update({ where: { id: subjectId }, data: { departmentId } });
        revalidatePath('/dashboard/system/classes-subjects');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateClassConfiguration(id: string, data: { teacherId: string | null, subjectIds: string[], subjectTeachers: Record<string, string> }) {
    try {
        await prisma.class.update({
            where: { id },
            data: {
                teacherId: data.teacherId,
                subjectIds: JSON.stringify(data.subjectIds),
                subjectTeachers: JSON.stringify(data.subjectTeachers)
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getDepartmentsData() {
    try {
        const [departments, faculties] = await Promise.all([
            prisma.department.findMany({
                orderBy: { name: 'asc' },
                include: {
                    faculty: {
                        select: { id: true, code: true, name: true }
                    },
                    users: {
                        select: { id: true }
                    },
                    subjects: {
                        select: { id: true }
                    },
                    programs: {
                        select: { id: true }
                    }
                }
            }),
            prisma.faculty.findMany({
                orderBy: { name: 'asc' },
                include: {
                    campus: { select: { id: true, name: true, code: true } },
                    dean: {
                        include: {
                            user: { select: { firstName: true, lastName: true, email: true } }
                        }
                    },
                    _count: {
                        select: { departments: true, programs: true }
                    }
                }
            })
        ]);

        const hodIds = departments.map(d => d.hodId).filter(Boolean) as string[];
        const hodUsers = hodIds.length > 0 ? await prisma.user.findMany({
            where: { id: { in: hodIds } },
            select: { id: true, firstName: true, lastName: true }
        }) : [];
        const hodMap = new Map(hodUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`.trim()]));

        return { 
            success: true, 
            data: departments.map(d => ({
                id: d.id,
                name: d.name,
                hodId: d.hodId,
                hodName: d.hodId ? (hodMap.get(d.hodId) || 'Assigned') : undefined,
                facultyId: d.facultyId,
                facultyName: d.faculty?.name || undefined,
                facultyCode: d.faculty?.code || undefined,
                teacherCount: d.users.length,
                studentCount: d.subjects.length,
                programCount: d.programs.length,
            })),
            faculties: faculties.map(f => ({
                id: f.id,
                code: f.code,
                name: f.name,
                campusName: f.campus?.name || 'Main Campus',
                deanName: f.dean?.user ? `${f.dean.user.firstName} ${f.dean.user.lastName}`.trim() : undefined,
                departmentCount: f._count.departments,
                programCount: f._count.programs,
            }))
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
