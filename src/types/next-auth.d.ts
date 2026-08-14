import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
type Role = 'ADMIN' | 'SLT' | 'HOD' | 'TEACHER' | 'ACCOUNTANT' | 'EXAM_OFFICER' | 'PARENT';

/**
 * Declaring modifications to the "@auth/core/types" module to support
 * custom fields (role, schoolId, isSuperAdmin) since NextAuth v5
 * delegates core types here.
 */
declare module "@auth/core/types" {
  interface User {
    id?: string;
    role: Role;
    
    isSuperAdmin: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }
}

/**
 * Declaring modifications to the "next-auth" module to support 
 * custom fields (role, schoolId, isSuperAdmin) on User and Session.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      
      isSuperAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: Role;
    
    isSuperAdmin: boolean;
  }
}

/**
 * Declaring modifications to the "next-auth/jwt" module to support 
 * custom fields (role, schoolId, isSuperAdmin) on the JWT payload.
 */
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: Role;
    
    isSuperAdmin: boolean;
  }
}
