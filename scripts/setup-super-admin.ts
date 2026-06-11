import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@proximahub.com';
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!password) {
    console.error("ERROR: SUPER_ADMIN_PASSWORD environment variable is not set.");
    process.exit(1);
  }

  // Ensure only ONE school exists for the system/platform context if needed, 
  // but super-admins are typically global.
  // In our schema, User belongs to a School. Let's create a 'Platform' school for the super-admin.
  
  let platformSchool = await prisma.school.findUnique({
    where: { slug: 'platform' }
  });

  if (!platformSchool) {
    platformSchool = await prisma.school.create({
      data: {
        name: 'Proxima Hub Platform',
        slug: 'platform',
        subdomain: 'admin',
        expiresAt: new Date('2099-12-31'),
        licenseStatus: 'ACTIVE',
        licenseType: 'ENTERPRISE',
      }
    });
    console.log("Created Platform School.");
  }

  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log("Super Admin already exists. Updating password...");
    await prisma.user.update({
      where: { email },
      data: {
        passwordHash: await hash(password),
        isSuperAdmin: true,
        role: 'ADMIN', // Highest role
      }
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hash(password),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
        isSuperAdmin: true,
        schoolId: platformSchool.id,
      }
    });
    console.log("Super Admin created successfully.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
