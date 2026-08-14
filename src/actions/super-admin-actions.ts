'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { SuperAdminService } from "@/lib/services/super-admin-service";
import { requireSuperAdmin } from "@/lib/guards";

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
    await requireSuperAdmin();
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

export async function updateSchoolLicense(data: { licenseStatus: string, expiresAt: string, activeModules: string[] }) {
  try {
    await requireSuperAdmin();
    const result = await superAdminService.updateSchoolLicense(data);
    if (result.success) {
      revalidatePath('/super-admin');
    }
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update license" };
  }
}
