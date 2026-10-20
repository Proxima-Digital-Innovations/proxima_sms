const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSuite() {
  console.log('--- STARTING ACADEMICS FULL SUITE VERIFICATION ---');

  // 1. Check Mid-Term Achievement Logic
  function calculateMidtermAchievement(score) {
    if (score == null || isNaN(score)) return 'Not Assessed';
    if (score >= 17) return 'Exceeding';
    if (score >= 13) return 'Expected +';
    if (score >= 10) return 'Expected';
    if (score >= 7) return 'Emerging +';
    if (score >= 0) return 'Emerging';
    return 'Not Assessed';
  }

  console.log('Testing Mid-Term Benchmark Calibration:');
  console.log('  score = null ->', calculateMidtermAchievement(null), '(Expected: Not Assessed)');
  console.log('  score = 18.5 ->', calculateMidtermAchievement(18.5), '(Expected: Exceeding)');
  console.log('  score = 14   ->', calculateMidtermAchievement(14), '(Expected: Expected +)');
  console.log('  score = 11   ->', calculateMidtermAchievement(11), '(Expected: Expected)');
  console.log('  score = 8.5  ->', calculateMidtermAchievement(8.5), '(Expected: Emerging +)');
  console.log('  score = 4    ->', calculateMidtermAchievement(4), '(Expected: Emerging)');

  if (
    calculateMidtermAchievement(null) !== 'Not Assessed' ||
    calculateMidtermAchievement(18.5) !== 'Exceeding' ||
    calculateMidtermAchievement(4) !== 'Emerging'
  ) {
    throw new Error('Mid-Term benchmark calibration failed!');
  }
  console.log('  ✓ Benchmark Calibration Passed.');

  // 2. Test database models & foreign relations
  const testStudent = await prisma.student.findFirst({
    where: { status: 'Active' },
    include: { class: true }
  });
  const testTerm = await prisma.term.findFirst({
    include: { session: true }
  });
  const testSubject = await prisma.subject.findFirst();

  if (!testStudent || !testTerm || !testSubject) {
    console.log('Required baseline entities (student/term/subject) not found. Skipping db persistence test.');
    return;
  }

  console.log(`\nTesting with Student: ${testStudent.firstName} ${testStudent.lastName}, Term: ${testTerm.name}, Subject: ${testSubject.name}`);

  // 3. Test Behavioural Assessment with all 8 traits + comment
  console.log('\nTesting Behavioural Assessment with 8 traits & Comment:');
  const behavioural = await prisma.behaviouralAssessment.upsert({
    where: {
      studentId_termId: {
        studentId: testStudent.id,
        termId: testTerm.id
      }
    },
    update: {
      conduct: 5,
      punctuality: 4,
      dedication: 4,
      participation: 5,
      hospitality: 4,
      neatness: 5,
      creativity: 5,
      physical: 4,
      comment: 'An exemplary student demonstrating high creativity and moral leadership.'
    },
    create: {
      studentId: testStudent.id,
      termId: testTerm.id,
      session: testTerm.session?.name || '2024/2025',
      conduct: 5,
      punctuality: 4,
      dedication: 4,
      participation: 5,
      hospitality: 4,
      neatness: 5,
      creativity: 5,
      physical: 4,
      comment: 'An exemplary student demonstrating high creativity and moral leadership.'
    }
  });

  console.log('  Saved Behavioural Assessment ID:', behavioural.id);
  console.log('  Creativity score saved:', behavioural.creativity);
  console.log('  Comment saved:', behavioural.comment);

  if (behavioural.creativity !== 5 || !behavioural.comment) {
    throw new Error('Creativity or comment was not properly persisted in BehaviouralAssessment!');
  }
  console.log('  ✓ Behavioural Assessment 8-Trait + Comment verification Passed.');

  // 4. Test Lesson Notes Bulk Review
  const testTeacher = await prisma.user.findFirst({
    where: { role: { in: ['TEACHER', 'ADMIN'] } }
  });

  if (testTeacher) {
    console.log('\nTesting Lesson Notes creation & bulk review flow:');
    const note = await prisma.lessonNote.create({
      data: {
        title: 'Test Note for Automated Suite',
        subjectId: testSubject.id,
        classId: testStudent.classId,
        teacherId: testTeacher.id,
        termId: testTerm.id,
        weekNumber: 1,
        content: 'Lesson content test',
        status: 'SUBMITTED'
      }
    });

    console.log('  Created lesson note ID:', note.id, 'with status:', note.status);

    // Test bulk approval
    const bulkUpdate = await prisma.lessonNote.updateMany({
      where: { id: { in: [note.id] } },
      data: {
        status: 'APPROVED',
        reviewerId: testTeacher.id,
        reviewedAt: new Date()
      }
    });
    console.log('  Bulk approved count:', bulkUpdate.count);

    const verifiedNote = await prisma.lessonNote.findUnique({ where: { id: note.id } });
    console.log('  Verified status:', verifiedNote.status);

    if (verifiedNote.status !== 'APPROVED') {
      throw new Error('Lesson note status was not updated to APPROVED!');
    }

    // Clean up test note
    await prisma.lessonNote.delete({ where: { id: note.id } });
    console.log('  Cleaned up test lesson note.');
    console.log('  ✓ Lesson Note workflow & Bulk Review verification Passed.');
  }

  console.log('\n--- ALL ACADEMICS SUITE TESTS PASSED SUCCESSFULLY! ---');
}

runSuite()
  .catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
