import { PrismaClient } from '@prisma/client';
import { getTenantId, isGlobalContext } from './tenant-context';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

/**
 * Enhanced Prisma Client with automatic Multi-Tenancy Scoping.
 * This extension intercepts all queries and injects the 'schoolId' from the current context.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const schoolId = getTenantId();
        const isGlobal = isGlobalContext();

        // Models that are NOT multi-tenant (Global models)
        // We add 'FeeItem' here because it is a global configuration model.
        const globalModels = ['School', 'AuditLog', 'FeeItem']; 

        // Cast query args to any to bypass union typescript check when scoping multi-tenant queries.
        const typedArgs = args as any;

        // If we are in a global context or querying a global model, bypass tenant scoping
        if (isGlobal || globalModels.includes(model)) {
          return query(typedArgs);
        }

        // If we have a schoolId in context, inject it into the 'where' clause
        if (schoolId) {
          typedArgs.where = {
            ...typedArgs.where,
            schoolId,
          };

          // For create operations, ensure schoolId is set in 'data'
          if (operation === 'create' || operation === 'createMany') {
            if (Array.isArray(typedArgs.data)) {
              typedArgs.data = typedArgs.data.map((item: any) => ({ ...item, schoolId }));
            } else {
              typedArgs.data = { ...typedArgs.data, schoolId };
            }
          }
          
          // For upsert, ensure schoolId is in both where and data
          if (operation === 'upsert') {
            typedArgs.create = { ...typedArgs.create, schoolId };
            typedArgs.update = { ...typedArgs.update, schoolId };
            typedArgs.where = { ...typedArgs.where, schoolId };
          }
        } else {
          // Prevent accidental global queries if tenant context is missing
          // This is a failsafe for the "Zero Tolerance" policy
          throw new Error(`CRITICAL: Attempted query on multi-tenant model '${model}' without a schoolId context.`);
        }

        return query(typedArgs);
      },
    },
  },
});
