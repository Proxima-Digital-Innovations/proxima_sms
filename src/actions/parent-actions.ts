'use server';

import { ParentService } from "@/lib/services/parent-service";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

const service = new ParentService();

/**
 * Fetches the holistic dashboard data for a Parent (Secondary & Tertiary Wards)
 */
export async function getParentDashboardData(selectedStudentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getParentDashboardData(userId || undefined, userEmail || undefined, selectedStudentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Links a Secondary School Student (by Admission ID e.g. STU-20001) or Tertiary Undergraduate
 * (by Matriculation Number e.g. U2025/CSC/001 or Student Email) to the currently logged-in Parent account.
 */
export async function linkChildToParentAction(identifier: string, relationship: string = "Parent / Sponsor") {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const cleanId = (identifier || "").trim();
    if (!cleanId) {
      return { success: false, message: "Please enter a valid Student Admission ID or University Matriculation Number." };
    }

    // Resolve parent user
    let parentUser = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : userEmail
      ? await prisma.user.findUnique({ where: { email: userEmail } })
      : null;

    if (!parentUser) {
      parentUser = await prisma.user.findFirst({ where: { role: "PARENT" } });
    }

    if (!parentUser) {
      return { success: false, message: "Parent account not found. Please log in again." };
    }

    const parentFullName = `${parentUser.firstName} ${parentUser.lastName}`.trim();

    // 1. Check Tertiary Undergraduate (by Matric Number or Student Email)
    const tertiaryStudent = await prisma.studentProfile.findFirst({
      where: {
        OR: [
          { matricNumber: cleanId },
          { user: { email: cleanId } },
        ],
      },
      include: {
        user: true,
        program: true,
      },
    });

    if (tertiaryStudent) {
      await prisma.studentProfile.update({
        where: { id: tertiaryStudent.id },
        data: {
          guardianUserId: parentUser.id,
          guardianName: parentFullName,
          guardianEmail: parentUser.email,
          guardianPhone: parentUser.phone || "+234 800 000 0000",
          guardianRelationship: relationship || "Parent / Sponsor",
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/parent/profile");
      revalidatePath("/dashboard/parent/results");
      revalidatePath("/dashboard/parent/invoices");

      return {
        success: true,
        wardId: tertiaryStudent.id,
        tier: "TERTIARY",
        message: `Successfully linked Tertiary Undergraduate: ${tertiaryStudent.user.firstName} ${tertiaryStudent.user.lastName} (${tertiaryStudent.matricNumber} • ${tertiaryStudent.currentLevel}L ${tertiaryStudent.program.code}).`,
      };
    }

    // 2. Check Secondary School Student (by studentId e.g. STU-20001 or id)
    const secondaryStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId: cleanId },
          { id: cleanId },
        ],
      },
      include: { class: true },
    });

    if (secondaryStudent) {
      const existingGuardianForStudent = await prisma.guardian.findFirst({
        where: {
          studentId: secondaryStudent.id,
          email: parentUser.email,
        },
      });

      if (!existingGuardianForStudent) {
        const userAlreadyLinkedOnGuardian = await prisma.guardian.findFirst({
          where: { userId: parentUser.id },
        });

        await prisma.guardian.create({
          data: {
            userId: userAlreadyLinkedOnGuardian ? null : parentUser.id,
            fullName: parentFullName,
            relationship: relationship || "Parent / Guardian",
            phone: parentUser.phone || "+234 800 000 0000",
            email: parentUser.email,
            address: parentUser.address || "Registered Family Residence",
            isPrimary: true,
            studentId: secondaryStudent.id,
          },
        });
      }

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/parent/profile");
      revalidatePath("/dashboard/parent/results");
      revalidatePath("/dashboard/parent/invoices");

      return {
        success: true,
        wardId: secondaryStudent.id,
        tier: "SECONDARY",
        message: `Successfully linked Secondary Student: ${secondaryStudent.firstName} ${secondaryStudent.lastName} (${secondaryStudent.studentId} • ${secondaryStudent.class?.name || "Secondary"}).`,
      };
    }

    return {
      success: false,
      message: `No Secondary Student or Tertiary Undergraduate found matching "${cleanId}". Check the Admission ID (e.g. STU-...) or Matriculation Number (e.g. U2025/CSC/001).`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to link student to parent profile." };
  }
}

/**
 * Administrative action to link or provision a Parent/Sponsor for a Secondary or Tertiary student
 */
export async function adminLinkStudentGuardianAction(params: {
  targetType: "SECONDARY" | "TERTIARY";
  targetId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
  relationship?: string;
}) {
  try {
    const cleanEmail = params.guardianEmail.trim().toLowerCase();
    const cleanName = params.guardianName.trim();
    if (!cleanEmail || !cleanName) {
      return { success: false, message: "Parent Name and Email are required." };
    }

    const nameParts = cleanName.split(" ");
    const firstName = nameParts[0] || "Parent";
    const lastName = nameParts.slice(1).join(" ") || "Guardian";

    return await prisma.$transaction(async (tx) => {
      // Ensure a User with role PARENT exists or find existing user
      let parentUser = await tx.user.findUnique({ where: { email: cleanEmail } });
      if (!parentUser) {
        const defaultHash = await bcrypt.hash("Parent@123", 10);
        parentUser = await tx.user.create({
          data: {
            firstName,
            lastName,
            email: cleanEmail,
            phone: params.guardianPhone || "+234 800 000 0000",
            passwordHash: defaultHash,
            role: "PARENT",
            status: "active",
            requiresPasswordChange: false,
          },
        });
      }

      if (params.targetType === "TERTIARY") {
        const updated = await tx.studentProfile.update({
          where: { id: params.targetId },
          data: {
            guardianUserId: parentUser.id,
            guardianName: cleanName,
            guardianEmail: cleanEmail,
            guardianPhone: params.guardianPhone || parentUser.phone || "+234 800 000 0000",
            guardianRelationship: params.relationship || "Parent / Sponsor",
          },
          include: { user: true },
        });

        revalidatePath("/dashboard/students");
        revalidatePath("/dashboard");

        return {
          success: true,
          message: `Linked ${cleanName} (${cleanEmail}) as Parent/Sponsor for ${updated.user.firstName} ${updated.user.lastName} (${updated.matricNumber}).`,
        };
      } else {
        const existingGuardian = await tx.guardian.findFirst({
          where: { studentId: params.targetId, email: cleanEmail },
        });

        if (existingGuardian) {
          await tx.guardian.update({
            where: { id: existingGuardian.id },
            data: {
              fullName: cleanName,
              phone: params.guardianPhone || existingGuardian.phone,
              relationship: params.relationship || existingGuardian.relationship,
            },
          });
        } else {
          const userAlreadyLinked = await tx.guardian.findFirst({
            where: { userId: parentUser.id },
          });
          await tx.guardian.create({
            data: {
              userId: userAlreadyLinked ? null : parentUser.id,
              fullName: cleanName,
              email: cleanEmail,
              phone: params.guardianPhone || parentUser.phone || "+234 800 000 0000",
              relationship: params.relationship || "Parent / Guardian",
              address: "Registered Family Residence",
              isPrimary: true,
              studentId: params.targetId,
            },
          });
        }

        revalidatePath("/dashboard/students");
        revalidatePath("/dashboard");

        return {
          success: true,
          message: `Linked ${cleanName} (${cleanEmail}) as Parent/Guardian for Secondary Student.`,
        };
      }
    });
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to link parent/sponsor." };
  }
}

/**
 * Fetches the complete terminal report card / university statement of result for the parent's ward
 */
export async function getWardReportCard(studentId?: string, termId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardReportCard(userId || undefined, userEmail || undefined, studentId, termId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches invoices and official receipts for the parent's ward
 */
export async function getWardInvoicesAndReceipts(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardInvoicesAndReceipts(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches daily attendance records and stats for the parent's ward
 */
export async function getWardAttendanceHistory(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardAttendanceHistory(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches the class timetable for the parent's ward
 */
export async function getWardTimetable(studentId?: string) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getWardTimetable(userId || undefined, userEmail || undefined, studentId);

    return {
      success: true,
      ...data
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetches guardian profile details and linked wards (Secondary & Tertiary) for the parent profile page
 */
export async function getParentProfile() {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    const data = await service.getParentDashboardData(userId || undefined, userEmail || undefined);

    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(userEmail ? [{ email: userEmail }] : [])
        ]
      }
    });

    const parentUser = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : userEmail
      ? await prisma.user.findUnique({ where: { email: userEmail } })
      : null;

    return {
      success: true,
      guardian: guardian
        ? {
            fullName: guardian.fullName,
            phone: guardian.phone,
            email: guardian.email,
            address: guardian.address,
            relationship: guardian.relationship,
          }
        : parentUser
        ? {
            fullName: `${parentUser.firstName} ${parentUser.lastName}`,
            phone: parentUser.phone || "+234 800 000 0000",
            email: parentUser.email,
            address: parentUser.address || "Registered Family Residence",
            relationship: "Parent / Sponsor",
          }
        : null,
      wards: data.wards || [],
      wallet: data.wallet || null
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
