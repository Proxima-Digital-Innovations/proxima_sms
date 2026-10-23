import { prisma } from '../src/lib/prisma';
import argon2 from 'argon2';

async function checkAndProvisionParent() {
  console.log('--- Checking for Existing Parents & Guardians ---');
  const demoEmail = 'parent@proximahub.com';
  const demoPassword = 'Password123!';
  const passwordHash = await argon2.hash(demoPassword);

  let demoParent = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!demoParent) {
    console.log(`\nCreating standard demo parent: ${demoEmail}`);
    demoParent = await prisma.user.create({
      data: {
        email: demoEmail,
        firstName: 'Ibrahim',
        lastName: 'Danladi',
        role: 'PARENT',
        passwordHash,
        status: 'active',
        requiresPasswordChange: false,
      },
    });
  } else {
    console.log(`\nUpdating standard demo parent password hash for: ${demoEmail}`);
    demoParent = await prisma.user.update({
      where: { id: demoParent.id },
      data: {
        firstName: 'Ibrahim',
        lastName: 'Danladi',
        role: 'PARENT',
        passwordHash,
        status: 'active',
        requiresPasswordChange: false,
        lockoutUntil: null,
        failedLoginAttempts: 0,
      },
    });
  }

  // Find two active students with classes to link to this parent
  const students = await prisma.student.findMany({
    take: 2,
    include: { class: true },
  });

  console.log(`\nLinking ${students.length} students to parent ${demoEmail}:`);
  for (let i = 0; i < students.length; i++) {
    const st = students[i];
    const existingGuardian = await prisma.guardian.findFirst({
      where: {
        studentId: st.id,
        email: demoEmail,
      },
    });

    if (!existingGuardian) {
      await prisma.guardian.create({
        data: {
          fullName: 'Alhaji Ibrahim Danladi',
          relationship: 'Father',
          phone: '08031234567',
          email: demoEmail,
          address: 'No 15 Crescent, GRA, Kaduna',
          isPrimary: true,
          studentId: st.id,
          userId: i === 0 ? demoParent.id : null,
        },
      });
      console.log(`  Linked ward: ${st.firstName} ${st.lastName} (${st.studentId}) in class ${st.class?.name}`);
    } else {
      console.log(`  Ward already linked: ${st.firstName} ${st.lastName} (${st.studentId})`);
    }
  }

  // Check linked wards through our ParentRepository logic
  const linkedGuardians = await prisma.guardian.findMany({
    where: { email: demoEmail },
    include: { student: { include: { class: true } } },
  });

  console.log('\n=============================================');
  console.log('PARENT CREDENTIALS READY FOR LOGIN:');
  console.log(`  Login URL:      http://localhost:3000/login`);
  console.log(`  Email:          ${demoEmail}`);
  console.log(`  Password:       ${demoPassword}`);
  console.log(`  Wards linked:   ${linkedGuardians.map(g => `${g.student?.firstName} ${g.student?.lastName} (${g.student?.class?.name})`).join(', ')}`);
  console.log('=============================================');
}

checkAndProvisionParent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
