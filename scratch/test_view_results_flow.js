const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTest() {
  console.log('Testing Results View & Batch actions against database...');

  // 1. Check classes, terms, sessions
  const classes = await prisma.class.findMany({ take: 2 });
  const terms = await prisma.term.findMany({ take: 2, include: { session: true } });

  console.log(`Found ${classes.length} classes and ${terms.length} terms.`);
  if (classes.length === 0 || terms.length === 0) {
    console.log('No data to test against, exiting cleanly.');
    return;
  }

  const testClass = classes[0];
  const testTerm = terms[0];

  console.log(`Testing with Class: "${testClass.name}" (${testClass.id}) and Term: "${testTerm.name}" (${testTerm.id})`);

  // 2. Test dynamic term resolution (both ID and Name)
  const termById = await prisma.term.findUnique({
    where: { id: testTerm.id },
    include: { session: true }
  });
  console.log(`Term by ID check: ${termById ? 'OK' : 'FAIL'}`);

  const termByName = await prisma.term.findFirst({
    where: { name: testTerm.name, session: { name: testTerm.session?.name } },
    include: { session: true }
  });
  console.log(`Term by Name check: ${termByName ? 'OK' : 'FAIL'}`);

  // 3. Test student fetch for batch cards
  const students = await prisma.student.findMany({
    where: { classId: testClass.id, status: 'Active' },
    take: 5
  });
  console.log(`Active students found in class: ${students.length}`);

  if (students.length > 0) {
    const studentIds = students.map(s => s.id);
    const grades = await prisma.termGrade.findMany({
      where: { termId: testTerm.id, studentId: { in: studentIds } },
      include: { subject: true }
    });
    console.log(`Grades found for batch: ${grades.length}`);
  }

  console.log('Test completed successfully!');
}

runTest()
  .catch(err => {
    console.error('Error during test:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
