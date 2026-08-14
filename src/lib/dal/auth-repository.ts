import { prisma } from "@/lib/prisma";

export class AuthRepository {
  /**
   * Finds the first active school (for default signup fallback if needed).
   */
  static async getFirstSchool() {
    return prisma.systemProfile.findFirst();
  }

  /**
   * Creates a new user in the database.
   */
  static async createUser(data: { email: string; firstName: string; lastName: string; passwordHash: string; role: any; }) {
    return prisma.user.create({ data });
  }
}
