'use server';

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

const CreateSchoolSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  subdomain: z.string()
    .min(2, "Subdomain must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens are allowed"),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid 6-character hex color"),
  trialDays: z.number().min(1, "Trial days must be at least 1"),
});

export async function createSchool(formData: z.infer<typeof CreateSchoolSchema>) {
  try {
    const validatedData = CreateSchoolSchema.parse(formData);

    const existingSchool = await prisma.school.findFirst({
      where: {
        OR: [
          { subdomain: validatedData.subdomain },
          { slug: validatedData.subdomain }
        ]
      }
    });

    if (existingSchool) {
      return { success: false, error: "Subdomain or slug already in use" };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validatedData.trialDays);

    const school = await prisma.school.create({
      data: {
        name: validatedData.name,
        subdomain: validatedData.subdomain,
        slug: validatedData.subdomain,
        primaryColor: validatedData.primaryColor,
        secondaryColor: validatedData.secondaryColor,
        licenseStatus: 'TRIAL',
        expiresAt: expiresAt,
        maxUsers: 50,
        maxStudents: 500
      }
    });

    // Create default Session
    const session = await prisma.academicSession.create({
      data: {
        schoolId: school.id,
        name: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      }
    });

    // Create default Term
    await prisma.term.create({
      data: {
        schoolId: school.id,
        sessionId: session.id,
        name: "First Term",
        isActive: true,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      }
    });

    // Create Default Admin User
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        schoolId: school.id,
        firstName: "Admin",
        lastName: "User",
        email: `admin@${validatedData.subdomain}.proximahub.com`,
        passwordHash: passwordHash,
        role: "ADMIN",
        status: "active",
      }
    });

    revalidatePath('/super-admin');
    return { success: true, school };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: error.message || "Failed to create school" };
  }
}
