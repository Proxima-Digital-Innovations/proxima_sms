import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { validateSystemLicense } from "./lib/license-utils";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ identifier: z.string(), password: z.string().min(6), rememberMe: z.string().optional() })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { identifier, password, rememberMe } = parsedCredentials.data;
        
        // Find user in DB with Roles and Permissions
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { staffId: identifier.toUpperCase() },
              { username: identifier }
            ]
          },
          include: {
            permissions: true,
            accessRoles: {
              include: { permissions: true }
            }
          }
        });

        if (!user || !user.passwordHash) return null;

        // Brute-force protection: check if account is locked
        if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
          return null;
        }

        // Verify password with Argon2
        const isValid = await argon2.verify(user.passwordHash, password);

        if (!isValid) {
          // Increment failed login attempts
          const newAttempts = (user.failedLoginAttempts || 0) + 1;
          const updateData: Record<string, unknown> = { failedLoginAttempts: newAttempts };

          // Lock account if threshold exceeded
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockoutUntil = new Date();
            lockoutUntil.setMinutes(lockoutUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
            updateData.lockoutUntil = lockoutUntil;
          }

          try {
            await prisma.user.update({
              where: { id: user.id },
              data: updateData,
            });
          } catch (e) {
            // Ignore DB update errors during login
            console.warn("Failed to record failed login attempt due to DB restriction.");
          }

          return null;
        }

        // Successful login: reset failed attempts and record login metadata
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null,
              lastLoginAt: new Date(),
            },
          });
        } catch (e) {
          // Ignore DB update errors during login
          console.warn("Failed to record successful login metadata due to DB restriction.");
        }

        // Validate License and extract Modules
        const licenseResult = await validateSystemLicense();
        let activeModules = licenseResult.status === 'ACTIVE' && licenseResult.payload?.features 
            ? licenseResult.payload.features 
            : ['CORE'];
            
        // If enterprise, grant everything
        if (licenseResult.payload?.tier === 'ENTERPRISE') {
           activeModules = ['CORE', 'FINANCE', 'HR', 'CBT', 'LMS'];
        }

        // Flatten all permissions (direct + role-based) into string array
        const userPerms = new Set<string>();
        if (user.isSuperAdmin || user.role === 'SUPER_ADMIN') {
           userPerms.add('super_admin');
        } else {
           user.permissions.forEach(p => userPerms.add(`${p.action}:${p.resource}`));
           user.accessRoles.forEach(r => {
             r.permissions.forEach(p => userPerms.add(`${p.action}:${p.resource}`));
           });
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role as any,
          isSuperAdmin: user.isSuperAdmin,
          activeModules: activeModules,
          rbacPermissions: Array.from(userPerms),
          rememberMe: rememberMe === 'true',
          requiresPasswordChange: (user as any).requiresPasswordChange || false,
        };
      },
    }),
  ],
});
