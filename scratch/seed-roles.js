const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const password = "password123";
  const passwordHash = await argon2.hash(password);

  const roles = [
    { role: 'SLT', username: 'slt', email: 'slt@proxima.com' },
    { role: 'HOD', username: 'hod', email: 'hod@proxima.com' },
    { role: 'TEACHER', username: 'teacher', email: 'teacher@proxima.com' },
    { role: 'ACCOUNTANT', username: 'accountant', email: 'accountant@proxima.com' },
    { role: 'EXAM_OFFICER', username: 'exam', email: 'exam@proxima.com' },
  ];

  for (const r of roles) {
    const exists = await prisma.user.findFirst({
      where: { OR: [{ username: r.username }, { role: r.role }] }
    });

    if (!exists) {
      await prisma.user.create({
        data: {
          username: r.username,
          email: r.email,
          firstName: r.role,
          lastName: 'User',
          role: r.role,
          passwordHash: passwordHash,
          status: 'Active'
        }
      });
      console.log(`Created ${r.role} user: username = ${r.username}, password = ${password}`);
    } else {
      await prisma.user.update({
        where: { id: exists.id },
        data: {
          username: r.username,
          passwordHash: passwordHash
        }
      });
      console.log(`Updated ${r.role} user: username = ${r.username}, password = ${password}`);
    }
  }

  // Also ensure admin has a memorable password
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { username: 'admin', passwordHash: passwordHash }
    });
    console.log(`Updated ADMIN user: username = admin, password = ${password}`);
  } else {
    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@proxima.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        passwordHash: passwordHash,
        status: 'Active'
      }
    });
    console.log(`Created ADMIN user: username = admin, password = ${password}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
