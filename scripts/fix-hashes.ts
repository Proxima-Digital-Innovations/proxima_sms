import { prisma } from '../src/lib/prisma';

async function main() {
  const result = await prisma.user.updateMany({
    data: { requiresPasswordChange: false }
  });
  console.log(`Updated requiresPasswordChange to false for ${result.count} users.`);
}

main().finally(() => prisma.$disconnect());
