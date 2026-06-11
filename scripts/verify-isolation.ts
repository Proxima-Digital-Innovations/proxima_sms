import { prisma } from '@/lib/prisma';
import { withTenant } from '@/lib/tenant-context';

async function verifyIsolation() {
  console.log('🔍 Starting Multi-Tenancy Isolation Verification...');

  // 1. Get Schools
  const schools = await prisma.school.findMany({
    where: { slug: { in: ['kings-college', 'queens-academy'] } }
  });

  const kings = schools.find(s => s.slug === 'kings-college')!;
  const queens = schools.find(s => s.slug === 'queens-academy')!;

  console.log(`Test Subject 1: ${kings.name} (${kings.id})`);
  console.log(`Test Subject 2: ${queens.name} (${queens.id})`);

  // 2. Test King's College Context
  console.log('\n--- Test 1: Accessing King\'s College context ---');
  const kingsStudents = await withTenant(kings.id, async () => {
    return await prisma.student.findMany();
  });

  console.log(`Found ${kingsStudents.length} students in King's context.`);
  const hasQueenData = kingsStudents.some((s: any) => s.studentId === 'QUEEN-001');
  
  if (hasQueenData) {
    console.error('❌ FAILURE: Queen\'s Academy data leaked into King\'s context!');
  } else {
    console.log('✅ SUCCESS: No data leak detected in King\'s context.');
  }

  // 3. Test Queen's Academy Context
  console.log('\n--- Test 2: Accessing Queen\'s Academy context ---');
  const queensStudents = await withTenant(queens.id, async () => {
    return await prisma.student.findMany();
  });

  console.log(`Found ${queensStudents.length} students in Queen's context.`);
  const hasKingData = queensStudents.some((s: any) => s.studentId === 'KING-001');

  if (hasKingData) {
    console.error('❌ FAILURE: King\'s College data leaked into Queen\'s context!');
  } else {
    console.log('✅ SUCCESS: No data leak detected in Queen\'s context.');
  }

  // 4. Test Missing Context Failsafe
  console.log('\n--- Test 3: Accessing WITHOUT context (Failsafe) ---');
  try {
    await prisma.student.findMany();
    console.error('❌ FAILURE: Query succeeded without tenant context (Zero Tolerance bypass)!');
  } catch (error: any) {
    console.log(`✅ SUCCESS: Query blocked as expected. Error: ${error.message}`);
  }

  console.log('\n🏁 Verification Finished.');
}

verifyIsolation().catch(console.error);
