
import { prisma } from './prisma';

/**
 * Maps Firestore collection names to Prisma model names.
 * Firestore usually uses plurals (e.g., 'users'), while Prisma uses singular (e.g., 'user').
 */
const modelMap: Record<string, string> = {
    'users': 'user',
    'students': 'student',
    'departments': 'department',
    'classes': 'class',
    'subjects': 'subject',
    'lesson-notes': 'lessonNote',
    'scores': 'score',
    'notifications': 'notification',
    'announcements': 'announcement',
    'attendance': 'attendance',
    'guardians': 'guardian',
};

export const dbService = {
    /**
     * Get a single document by ID
     */
    getDoc: async <T>(collectionName: string, id: string): Promise<T | null> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);
        
        return await model.findUnique({
            where: { id }
        }) as T | null;
    },

    /**
     * Get multiple documents, optionally with simple filtering
     */
    getDocs: async <T>(collectionName: string, filters?: any): Promise<T[]> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        // Basic findMany - for complex queries, use prisma directly in the action
        return await model.findMany({
            where: filters || {}
        }) as T[];
    },

    /**
     * Set a document (Upsert)
     */
    setDoc: async (collectionName: string, id: string, data: any): Promise<void> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        await model.upsert({
            where: { id },
            update: data,
            create: { id, ...data }
        });
    },

    /**
     * Add a new document (Auto-generated ID)
     */
    addDoc: async (collectionName: string, data: any): Promise<{ id: string }> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        const result = await model.create({ data });
        return { id: result.id };
    },

    /**
     * Update an existing document
     */
    updateDoc: async (collectionName: string, id: string, data: any): Promise<void> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        await model.update({
            where: { id },
            data
        });
    },

    /**
     * Delete a document
     */
    deleteDoc: async (collectionName: string, id: string): Promise<void> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        await model.delete({
            where: { id }
        });
    },

    /**
     * Count documents matching a query
     */
    getCountFromServer: async (collectionName: string, filters?: any): Promise<number> => {
        const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
        const model = (prisma as any)[prismaModel];
        if (!model) throw new Error(`Model ${prismaModel} not found in Prisma client`);

        return await model.count({
            where: filters || {}
        });
    },

    /**
     * Create a batch of operations to be executed in a transaction
     */
    createBatch: () => {
        const operations: any[] = [];
        return {
            set: (collectionName: string, id: string, data: any) => {
                const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
                const model = (prisma as any)[prismaModel];
                operations.push(model.upsert({ where: { id }, update: data, create: { id, ...data } }));
            },
            update: (collectionName: string, id: string, data: any) => {
                const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
                const model = (prisma as any)[prismaModel];
                operations.push(model.update({ where: { id }, data }));
            },
            delete: (collectionName: string, id: string) => {
                const prismaModel = modelMap[collectionName.toLowerCase()] || collectionName;
                const model = (prisma as any)[prismaModel];
                operations.push(model.delete({ where: { id } }));
            },
            commit: async () => {
                await prisma.$transaction(operations);
            },
        };
    }
};
