
import { dbService } from './dbService';
import { prisma } from './prisma';

/**
 * Mock Auth Service bridging to SQL
 * In a real production app, this would use NextAuth.js or a similar library.
 */
export const authService = {
    /**
     * Sign in a user by checking their email and password hash
     */
    signIn: async (email: string, password: string) => {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Basic password check (assuming passwordHash is the plain password for now, 
        // would normally use bcrypt)
        if (user.passwordHash !== password) {
            throw new Error('Invalid password');
        }

        return user;
    },

    signOut: async () => {
        // Clear local session storage if any
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user-session');
        }
    },

    /**
     * Monitor auth state changes
     */
    onAuthStateChanged: (callback: (user: any) => void) => {
        // Simple mock for now
        return () => {};
    },

    /**
     * Create a new user in the SQL database.
     * We explicitly map the schoolId and other fields from rest to avoid
     * Prisma type-checking errors since schoolId is required in schema.prisma.
     */
    createUser: async (data: { email: string; password?: string; [key: string]: any }) => {
        const { email, password, ...rest } = data;
        
        // Check if the user already exists by email
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            throw new Error('Email already in use');
        }

        // Ensure schoolId is present since it's a required foreign key relation
        const schoolId = rest.schoolId;
        if (!schoolId) {
            throw new Error('schoolId is required to create a user');
        }

        // Create the user in Prisma, ensuring the role matches the Role enum casing (UPPERCASE)
        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: password || 'defaultPassword',
                firstName: rest.firstName || '',
                lastName: rest.lastName || '',
                role: (rest.role || 'TEACHER').toUpperCase() as any,
                schoolId: schoolId,
                status: rest.status || 'active',
                phone: rest.phone || null,
                staffId: rest.staffId || null,
                isSuperAdmin: rest.isSuperAdmin || false,
                kioskPin: rest.kioskPin || null,
                biometricId: rest.biometricId || null,
                biometricTemplate: rest.biometricTemplate || null,
            }
        });

        return user;
    },
};

