import { AuthRepository } from '../dal/auth-repository';
import argon2 from "argon2";

export class AuthService {
  /**
   * Enforces business logic for signing up a new user.
   * Hashes passwords and formats names before persisting to DAL.
   */
  static async registerUser(data: { name: string; email: string; password: string; role: any; schoolId?: string }) {
    const passwordHash = await argon2.hash(data.password);
    const [firstName, ...lastNameParts] = data.name.split(" ");
    
    // Resolve School ID
    let finalSchoolId = data.schoolId;
    if (!finalSchoolId) {
        // Fallback to first school if none provided (for legacy compatibility)
        const defaultSchool = await AuthRepository.getFirstSchool();
        if (!defaultSchool) throw new Error("System not initialized. No school found.");
        finalSchoolId = defaultSchool.id;
    }

    return AuthRepository.createUser({
      email: data.email,
      firstName,
      lastName: lastNameParts.join(" "),
      passwordHash,
      role: data.role,
      });
  }
}
