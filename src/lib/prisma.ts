import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { PUBLIC_KEY } from './license-keys';

const globalForPrisma = globalThis as unknown as {
  prisma: any | undefined;
  licenseStatus: { status: string, message: string, expiresAt: number } | null;
};

const basePrisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === 'true'
    ? ['query', 'error', 'warn']
    : process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
});

export const prisma = globalForPrisma.prisma ?? basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const isMutation = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'].includes(operation);
        
        // Prevent all mutations if license is invalid, except for SystemLicense and AuditLog
        if (isMutation && model !== 'SystemLicense' && model !== 'AuditLog') {
           const now = Date.now();
           
           // Cache license validation for 60 seconds to prevent DB/Crypto overhead on every mutation
           if (!globalForPrisma.licenseStatus || globalForPrisma.licenseStatus.expiresAt < now) {
               try {
                   const license = await basePrisma.systemLicense.findFirst({ orderBy: { createdAt: 'desc' } });
                   
                   if (!license || !license.licenseKey) {
                       throw new Error('System subscription not activated. Please provide an activation key.');
                   }
                   if (!license.licenseKey.includes('.')) {
                       throw new Error('Invalid subscription key format.');
                   }
                   
                   const [base64Payload, signature] = license.licenseKey.split('.');
                   const payloadString = Buffer.from(base64Payload, 'base64').toString('utf8');
                   const payload = JSON.parse(payloadString);
                   
                   const verify = crypto.createVerify('SHA256');
                   verify.update(payloadString);
                   verify.end();
                   
                   if (!verify.verify(PUBLIC_KEY, signature, 'base64')) {
                       throw new Error('Subscription signature verification failed. The key has been tampered with.');
                   }
                   
                   const expiresAt = new Date(payload.expiresAt);
                   if (expiresAt.getTime() < now) {
                       throw new Error('Your enterprise subscription has expired. Please renew to restore full access.');
                   }
                   
                   globalForPrisma.licenseStatus = { status: 'ACTIVE', message: '', expiresAt: now + 60000 };
               } catch (e: any) {
                   // If invalid, cache the error state for 5 seconds to prevent spamming DB on repeated clicks
                   globalForPrisma.licenseStatus = { status: 'INVALID', message: e.message || 'Invalid subscription.', expiresAt: now + 5000 };
               }
           }
           
           if (globalForPrisma.licenseStatus?.status !== 'ACTIVE') {
               throw new Error(globalForPrisma.licenseStatus!.message);
           }
        }
        
        return query(args);
      }
    }
  }
});

globalForPrisma.prisma = prisma;
