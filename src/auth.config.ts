import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 8 * 60 * 60, // 8 hours — sessions expire after a school day
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
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.isSuperAdmin = user.isSuperAdmin;
        token.activeModules = (user as any).activeModules;
        token.rbacPermissions = (user as any).rbacPermissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as any;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        (session.user as any).activeModules = token.activeModules as string;
        (session.user as any).rbacPermissions = token.rbacPermissions as string[];
      }
      return session;
    },
  },
  providers: [], // Providers are added in the main auth.ts
} satisfies NextAuthConfig;
