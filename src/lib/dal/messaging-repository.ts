import { prisma } from "@/lib/prisma";
import { STAFF_FILTER } from "./staff-repository";

export class MessagingRepository {
  async getSchool() {
    return prisma.systemProfile.findFirst();
  }

  async getParentCount(classId?: string) {
    if (classId) {
      return prisma.guardian.count({
        where: {
          student: {
            classId,
            status: 'Active',
          },
        },
      });
    }
    return prisma.guardian.count({
      where: {
        student: {
          status: 'Active',
        },
      },
    });
  }

  async getStaffCount() {
    return prisma.user.count({ where: { status: 'active', ...STAFF_FILTER } });
  }

  async getStudentCount(classId?: string) {
    if (classId) {
      return prisma.student.count({ where: { classId, status: 'Active' } });
    }
    return prisma.student.count({ where: { status: 'Active' } });
  }

  async getParents(classId?: string) {
    const where: any = {
      student: {
        status: 'Active',
      },
    };
    if (classId) {
      where.student.classId = classId;
    }

    return prisma.guardian.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            class: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async getStaff() {
    return prisma.user.findMany({
      where: {
        status: 'active',
        ...STAFF_FILTER,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  async getStudents(classId: string) {
    return prisma.student.findMany({
      where: {
        classId,
        status: 'Active',
      },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        class: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  async createMessageBlast(data: any) {
    return prisma.messageBlast.create({ data });
  }
}
