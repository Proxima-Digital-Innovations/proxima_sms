import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { withGlobal } from "@/lib/tenant-context";
import argon2 from "argon2";
import { z } from "zod";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        const { email, password } = parsedCredentials.data;
        
        // Find user in DB (Server-side only)
        const user = await withGlobal(async () => {
          return await prisma.user.findUnique({
            where: { email },
            include: { school: true }
          });
        });

        if (!user || !user.passwordHash) return null;

        // Verify password with Argon2 (using verify method per argon2 docs)
        const isValid = await argon2.verify(user.passwordHash, password);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          schoolId: user.schoolId,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
});
