import { prisma } from '../src/lib/prisma';
import { getLicenseCapacityStatus, canAdmitStudents, snapshotTermBaseline } from '../src/lib/services/license-capacity';
import { admitStudent, bulkCreateStudents } from '../src/actions/student-actions';
import { validateSystemLicense } from '../src/lib/license-utils';
const { generateLicense } = require('./generate-license.js');

async function runLicenseCapacitySuite() {
  console.log('================================================================');
  console.log('🧪 TESTING STUDENT CAPACITY, GRACE BUFFER & PAYMENT FREQUENCY');
  console.log('================================================================\n');

  // --- Step 1: Query Baseline Capacity ---
  console.log('Step 1: Inspecting current capacity status:');
  const initialCapacity = await getLicenseCapacityStatus();
  console.log(`   - Active Students in DB: ${initialCapacity.activeStudents}`);
  console.log(`   - Licensed Limit:        ${initialCapacity.licensedLimit}`);
  console.log(`   - Grace Buffer Limit:    ${initialCapacity.graceBufferLimit} (+15%)`);
  console.log(`   - Usage Percentage:      ${initialCapacity.usagePercent}%`);
  console.log(`   - Current Zone:          ${initialCapacity.zone}`);
  console.log(`   - Billing Frequency:     ${initialCapacity.billingFrequency}`);
  console.log('   ✅ Baseline capacity retrieved successfully.\n');

  // --- Step 2: Test Admission Leeway Simulation (Zone Transitions) ---
  console.log('Step 2: Simulating Capacity Zone Transitions (Normal -> Grace -> Hard Stop):');

  // Backup current license
  const currentLicense = await prisma.systemLicense.findFirst({ orderBy: { createdAt: 'desc' } });

  try {
    // Set a controlled test limit where active students (83) is close to limit
    const activeCount = initialCapacity.activeStudents;
    const testLimit = activeCount + 2; // e.g. 85
    const testGraceLimit = Math.floor(testLimit * 1.15); // e.g. 85 * 1.15 = 97

    console.log(`   [Test Setup] Configured Max Limit: ${testLimit}, Grace Ceiling (+15%): ${testGraceLimit}`);

    await prisma.systemLicense.updateMany({
      data: { maxStudents: testLimit },
    });

    // Test A: Normal admission (within regular limit: count = 1 -> active + 1 = 84 <= 85)
    const checkNormal = await canAdmitStudents(1);
    console.log(`   - Check (+1 student): Allowed=${checkNormal.allowed}, WillEnterGrace=${checkNormal.willEnterGrace}`);
    if (!checkNormal.allowed || checkNormal.willEnterGrace) {
      throw new Error('Expected normal admission to be allowed without grace warning!');
    }

    // Test B: Grace Buffer admission (crosses limit but within +15%: count = 5 -> active + 5 = 88 <= 97)
    const checkGrace = await canAdmitStudents(5);
    console.log(`   - Check (+5 students): Allowed=${checkGrace.allowed}, WillEnterGrace=${checkGrace.willEnterGrace}`);
    console.log(`     Message: "${checkGrace.message}"`);
    if (!checkGrace.allowed || !checkGrace.willEnterGrace) {
      throw new Error('Expected admission into grace buffer to be allowed with grace warning!');
    }

    // Test C: Hard Stop admission (exceeds +15% ceiling: count = 50 -> active + 50 = 281 > 267)
    const checkHardStop = await canAdmitStudents(50);
    console.log(`   - Check (+50 students): Allowed=${checkHardStop.allowed}, WillExceedGrace=${checkHardStop.willExceedGrace}`);
    console.log(`     Message: "${checkHardStop.message}"`);
    if (checkHardStop.allowed || !checkHardStop.willExceedGrace) {
      throw new Error('Expected hard stop admission to be rejected!');
    }
    console.log('   ✅ 3-Zone transition logic (Normal -> Grace Buffer -> Hard Stop) verified 100%.\n');

    // --- Step 3: Test Real Admission Action Guarding ---
    console.log('Step 3: Testing Admission Action Guards (admitStudent & bulkCreateStudents):');

    // Attempting bulk admission that exceeds grace limit (50 students: 231 + 50 = 281 > 267)
    const overflowBatch = Array.from({ length: 50 }).map((_, i) => ({
      firstName: `TestUser${i}`,
      lastName: 'Batch',
      class: 'JSS 1',
    }));
    const bulkRejectRes = await bulkCreateStudents(overflowBatch);
    console.log(`   - Bulk create (50 students): Success=${bulkRejectRes.success}, Error="${bulkRejectRes.error}"`);
    if (bulkRejectRes.success) {
      throw new Error('Bulk admission should have been blocked by capacity guard!');
    }
    console.log('   ✅ Bulk admission properly blocked when exceeding grace limit.');

    // Single student admission within grace buffer
    // Set limit such that 1 student enters grace
    await prisma.systemLicense.updateMany({
      data: { maxStudents: activeCount }, // Exactly at limit, next student is in grace
    });

    const testStudentClass = await prisma.class.findFirst();
    const graceAdmitRes = await admitStudent({
      firstName: 'GraceStudent',
      lastName: 'Candidate',
      classId: testStudentClass?.id,
      sessionYear: '2024/2025',
    });
    console.log(`   - Single admit in Grace: Success=${graceAdmitRes.success}, IsGrace=${graceAdmitRes.isGraceAdmission}`);
    console.log(`     Warning: "${graceAdmitRes.warning}"`);
    if (!graceAdmitRes.success || !graceAdmitRes.isGraceAdmission) {
      throw new Error('Single student in grace should succeed with grace warning!');
    }
    console.log('   ✅ Single admission in grace buffer succeeded with actionable warning.\n');

    // Clean up created student
    if (graceAdmitRes.data?.id) {
      await prisma.student.delete({ where: { id: graceAdmitRes.data.id } });
    }

  } finally {
    // Restore original license
    if (currentLicense) {
      await prisma.systemLicense.updateMany({
        data: { maxStudents: currentLicense.maxStudents },
      });
    }
  }

  // --- Step 4: Test Payment Frequency & Upfront Discount License Generation ---
  console.log('Step 4: Testing Payment Frequency (Per Term vs Per Session) & Annual Discount:');

  // Termly License
  const termly = generateLicense({
    schoolName: 'Proxima Academy',
    maxStudents: 200,
    tier: 'PREMIUM',
    frequency: 'PER_TERM',
    discountPercent: 0,
    termName: 'Third Term',
    sessionName: '2024/2025',
  });
  if (termly.payload.billingFrequency !== 'PER_TERM' || termly.payload.discountPercent !== 0) {
    throw new Error('Termly license payload incorrect!');
  }
  console.log('   ✅ Termly license generated with PER_TERM frequency and 0% discount.');

  // Annual License with 7.5% Discount
  const annual = generateLicense({
    schoolName: 'Proxima Academy',
    maxStudents: 500,
    tier: 'ENTERPRISE',
    frequency: 'PER_SESSION',
    discountPercent: 7.5,
    termName: 'First Term',
    sessionName: '2024/2025',
  });
  if (annual.payload.billingFrequency !== 'PER_SESSION' || annual.payload.discountPercent !== 7.5) {
    throw new Error('Annual license payload incorrect!');
  }
  console.log('   ✅ Annual license generated with PER_SESSION frequency and 7.5% upfront discount.');

  // Apply annual license to DB and validate cryptographic signature
  await prisma.systemLicense.updateMany({
    data: {
      licenseKey: annual.licenseKey,
      schoolName: annual.payload.schoolName,
      tier: annual.payload.tier,
      maxStudents: annual.payload.maxStudents,
      billingFrequency: annual.payload.billingFrequency,
      discountPercent: annual.payload.discountPercent,
      expiresAt: new Date(annual.payload.expiresAt),
      status: 'ACTIVE',
    },
  });

  const validation = await validateSystemLicense();
  console.log(`   - License signature validation: Status=${validation.status}, Valid=${validation.status === 'ACTIVE'}`);
  if (validation.status !== 'ACTIVE' || !validation.payload) {
    throw new Error('Cryptographic signature validation failed on annual license token!');
  }
  console.log('   ✅ Cryptographic signature and expiration verified 100%.\n');

  // --- Step 5: Test Term Baseline Snapshot ---
  console.log('Step 5: Testing Term-Start Student Baseline Snapshot:');
  const testTerm = await prisma.term.findFirst();
  if (testTerm) {
    const snap = await snapshotTermBaseline(testTerm.id);
    console.log(`   - Snapshotted active student count: ${snap.startingStudentCount} for Term: ${snap.termId}`);
    const verifiedLicense = await prisma.systemLicense.findFirst({ orderBy: { createdAt: 'desc' } });
    if (verifiedLicense?.startingStudentCount !== snap.startingStudentCount || verifiedLicense?.currentTermId !== testTerm.id) {
      throw new Error('Term baseline snapshot did not persist in SystemLicense!');
    }
    console.log('   ✅ Term-start baseline snapshot successfully recorded.');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL CAPACITY, GRACE BUFFER & PAYMENT FREQUENCY TESTS PASSED!');
  console.log('================================================================\n');
}

runLicenseCapacitySuite()
  .catch((err) => {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
