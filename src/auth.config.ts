import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days maximum, soft-capped to 8 hours in jwt callback if rememberMe is false
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublic = nextUrl.pathname.startsWith("/login") || 
                       nextUrl.pathname.startsWith("/api/auth");
      
      if (!isLoggedIn && !isPublic) {
        return false; // Redirect to login
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // Support session.update({ requiresPasswordChange: false })
      if (trigger === "update" && session) {
        if (session.requiresPasswordChange !== undefined) {
          token.requiresPasswordChange = session.requiresPasswordChange;
        }
        if (session.role) {
          token.role = session.role;
        }
      }

      if (user) {
        token.role = user.role;
        token.isSuperAdmin = user.isSuperAdmin;
        token.activeModules = (user as any).activeModules;
        token.rbacPermissions = (user as any).rbacPermissions;
        token.requiresPasswordChange = (user as any).requiresPasswordChange;
        token.isTertiaryStudent = (user as any).isTertiaryStudent;
        token.institutionTier = (user as any).institutionTier;
        
        // Handle rememberMe custom expiration
        const isRememberMe = (user as any).rememberMe;
        token.customExpiresAt = isRememberMe 
          ? Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
          : Date.now() + 8 * 60 * 60 * 1000;      // 8 hours
      }

      // Check if soft expiration has passed
      if (token.customExpiresAt && Date.now() > (token.customExpiresAt as number)) {
        return null; // Forces NextAuth to invalidate the token
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as any;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        (session.user as any).activeModules = token.activeModules as string[];
        (session.user as any).rbacPermissions = token.rbacPermissions as string[];
        (session.user as any).requiresPasswordChange = token.requiresPasswordChange as boolean;
        (session.user as any).isTertiaryStudent = token.isTertiaryStudent as boolean;
        (session.user as any).institutionTier = token.institutionTier as string;
      }
      return session;
    },
  },
  providers: [], // Providers are added in the main auth.ts
} satisfies NextAuthConfig;
