"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { AuthService } from "@/lib/services/auth-service";
import { requireAdmin } from "@/lib/guards";
import { requireSchoolId } from "@/lib/server-context";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or Staff ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function loginAction(identifier: string, password: string) {
  try {
    const validated = loginSchema.parse({ identifier, password });

    await signIn("credentials", {
      identifier: validated.identifier,
      password: validated.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
}

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "SLT", "HOD", "TEACHER", "ACCOUNTANT", "EXAM_OFFICER", "PARENT"]),
});

export async function signupAction(data: { name: string; email: string; password: string; role: any }) {
  try {
    // Only admins can create new user accounts
    
    await requireAdmin();

    const validated = signupSchema.parse(data);

    await AuthService.registerUser({ ...validated, });

    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    if (error.code === 'P2002') {
      return { error: "A user with this email already exists." };
    }
    return { error: error.message || "Failed to create account." };
  }
}
