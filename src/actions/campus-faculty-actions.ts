'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCampusesWithFaculties() {
  try {
    const campuses = await prisma.campus.findMany({
      include: {
        faculties: {
          include: {
            dean: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
            departments: true,
            programs: true,
          },
        },
        venues: true,
        _count: { select: { faculties: true, venues: true } },
      },
      orderBy: { isMain: 'desc' },
    });

    const unassignedFaculties = await prisma.faculty.findMany({
      where: { campusId: null },
      include: {
        dean: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        departments: true,
        programs: true,
      },
    });

    return { success: true, data: { campuses, unassignedFaculties } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCampusAction(data: {
  code: string;
  name: string;
  address?: string;
  isMain?: boolean;
}) {
  try {
    const campus = await prisma.campus.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        address: data.address || null,
        isMain: data.isMain || false,
      },
    });

    revalidatePath('/dashboard/tertiary/campuses');
    return { success: true, data: campus };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createFacultyAction(data: {
  code: string;
  name: string;
  campusId?: string;
  deanId?: string;
}) {
  try {
    const faculty = await prisma.faculty.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        campusId: data.campusId || null,
        deanId: data.deanId || null,
      },
    });

    revalidatePath('/dashboard/tertiary/campuses');
    return { success: true, data: faculty };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createLectureVenueAction(data: {
  name: string;
  capacity: number;
  campusId?: string;
  building?: string;
}) {
  try {
    const venue = await prisma.lectureVenue.create({
      data: {
        name: data.name,
        capacity: data.capacity || 100,
        campusId: data.campusId || null,
        building: data.building || null,
      },
    });

    revalidatePath('/dashboard/tertiary/campuses');
    revalidatePath('/dashboard/tertiary/timetable');
    return { success: true, data: venue };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
