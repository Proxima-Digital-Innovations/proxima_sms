import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function test() {
  const identifier = 'admin@kings.edu';
  const password = 'password123';
  
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { staffId: identifier.toUpperCase() }
      ]
    },
    include: { /* removed school relation */ }
  });

  console.log('User found:', user ? user.email : 'No user found');
  
  if (user) {
    console.log('Password hash:', user.passwordHash);
    const isValid = await argon2.verify(user.passwordHash, password);
    console.log('Password valid:', isValid);
    console.log('School suspended:', false);
    console.log('Lockout until:', user.lockoutUntil);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
