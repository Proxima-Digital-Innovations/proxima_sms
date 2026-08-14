import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ identifier: z.string(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { identifier, password } = parsedCredentials.data;
        
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

          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });

          return null;
        }

        // Successful login: reset failed attempts and record login metadata
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockoutUntil: null,
            lastLoginAt: new Date(),
          },
        });

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
          activeModules: ['CORE', 'FINANCE'],
          rbacPermissions: Array.from(userPerms),
        };
      },
    }),
  ],
});
