const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('--- DATABASE STATE INSPECTION ---');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, firstName: true, lastName: true, isSuperAdmin: true }
  });
  console.log(`Users count: ${users.length}`);
  console.table(users.map(u => ({ id: u.id, email: u.email, role: u.role, name: `${u.firstName} ${u.lastName}` })));

  const sessions = await prisma.academicSession.findMany({
    include: { terms: true }
  });
  console.log(`\nSessions count: ${sessions.length}`);
  for (const s of sessions) {
    console.log(`Session: ${s.name} (Active: ${s.isActive}) - Terms: ${s.terms.map(t => `${t.name} (id: ${t.id}, active: ${t.isActive})`).join(', ')}`);
  }

  const classes = await prisma.class.findMany({
    include: { currentStudents: { select: { id: true, firstName: true, lastName: true } } }
  });
  console.log(`\nClasses count: ${classes.length}`);
  for (const c of classes) {
    console.log(`Class: ${c.name} (Students: ${c.currentStudents.length})`);
  }

  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true }
  });
  console.log(`\nSubjects count: ${subjects.length}`);
  console.log(subjects.map(s => s.name).join(', '));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
