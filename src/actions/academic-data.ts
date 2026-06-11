
'use server';

import { prisma } from '@/lib/prisma';

export async function getAcademicData() {
    try {
        const [classes, subjects, departments] = await Promise.all([
            prisma.class.findMany({ orderBy: { name: 'asc' } }),
            prisma.subject.findMany({ orderBy: { name: 'asc' } }),
            prisma.department.findMany({ orderBy: { name: 'asc' } }),
        ]);

        return {
            classes: classes.map(c => ({ id: c.id, name: c.name })),
            subjects: subjects.map(s => ({ id: s.id, name: s.name })),
            departments: departments.map(d => ({ id: d.id, name: d.name })),
        };
    } catch (error) {
        console.error('Failed to fetch academic data:', error);
        return { classes: [], subjects: [], departments: [] };
    }
}
