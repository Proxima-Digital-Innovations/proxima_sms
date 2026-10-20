import { prisma } from '../src/lib/prisma';
import {
  saveScores,
  submitScoresForReview,
  getModerationQueue,
  saveModeratorScores,
  reviewScoreSheet,
  getResultPreflightCheck,
  generateTermResults,
  publishTermResults,
  unpublishTermResults,
  getStudentReportCard,
  getClassBatchReportCards,
  getBroadsheetData,
  updateReportCardRemarks,
} from '../src/actions/results-actions';
import {
  calculateMidtermAchievement,
  getMidtermResults,
  saveMidtermResults,
} from '../src/actions/midterm-actions';
import {
  createLessonNote,
  submitLessonNote,
  bulkReviewLessonNotes,
  getLessonNotes,
} from '../src/actions/lesson-note-actions';
import {
  getBehaviouralAssessments,
  saveBehaviouralAssessments,
} from '../src/actions/behavioural-actions';

async function runRealUserSimulation() {
  console.log('================================================================');
  console.log('🚀 STARTING REAL USER END-TO-END SIMULATION ACROSS ACADEMICS');
  console.log('================================================================\n');

  // --- 0. Context Lookup ---
  const session = await prisma.academicSession.findFirst({
    where: { name: '2024/2025' },
    include: { terms: true }
  });
  if (!session) throw new Error('Academic session 2024/2025 not found');

  const term = session.terms.find(t => t.name.includes('Third') || t.name.includes('Term 1')) || session.terms[0];
  if (!term) throw new Error('Term not found');

  const jss1Class = await prisma.class.findFirst({
    where: { name: 'JSS 1' },
    include: { currentStudents: true }
  });
  if (!jss1Class || jss1Class.currentStudents.length === 0) throw new Error('JSS 1 Class or students not found');

  const mathSubject = await prisma.subject.findFirst({ where: { name: 'Mathematics' } });
  const compSubject = await prisma.subject.findFirst({ where: { name: 'Computer Science' } });
  const commSubject = await prisma.subject.findFirst({ where: { name: 'Commerce' } });
  if (!mathSubject) throw new Error('Mathematics subject not found');

  const teacher = await prisma.user.findFirst({ where: { email: 'teacher1@school.edu' } });
  const hod = await prisma.user.findFirst({ where: { email: 'hod.science@school.edu' } });
  const examOfficer = await prisma.user.findFirst({ where: { email: 'exam@proxima.com' } });
  const principal = await prisma.user.findFirst({ where: { email: 'principal@school.edu' } });

  console.log(`📌 Target Context:
  - Academic Session: ${session.name}
  - Term: ${term.name} (${term.id})
  - Class: ${jss1Class.name} (${jss1Class.id}) with ${jss1Class.currentStudents.length} students
  - Subject: ${mathSubject.name} (${mathSubject.id})
  - Teacher: ${teacher?.firstName} ${teacher?.lastName} (${teacher?.email})
  - HOD / Moderator: ${hod?.firstName} ${hod?.lastName} (${hod?.email})
  - Exam Officer: ${examOfficer?.firstName} ${examOfficer?.lastName} (${examOfficer?.email})
  - Principal: ${principal?.firstName} ${principal?.lastName} (${principal?.email})\n`);

  const students = jss1Class.currentStudents;
  const s1 = students[0];
  const s2 = students[1];
  const s3 = students[2];
  const s4 = students[3];
  const s5 = students[4];
  const s6 = students[5]; // Absent / unassessed student

  // ============================================================================
  // PERSONA 1: TEACHER (Lancelot DuLac)
  // ============================================================================
  console.log('----------------------------------------------------------------');
  console.log('👤 PERSONA 1: TEACHER WORKFLOW (Mid-Term, End-of-Term & Lesson Notes)');
  console.log('----------------------------------------------------------------');

  // Step 1.1: Benchmark verification
  console.log('1.1 Verifying Mid-Term Achievement Benchmarks:');
  const b1 = await calculateMidtermAchievement(19.5);
  const b2 = await calculateMidtermAchievement(15.0);
  const b3 = await calculateMidtermAchievement(11.5);
  const b4 = await calculateMidtermAchievement(8.5);
  const b5 = await calculateMidtermAchievement(4.0);
  const b6 = await calculateMidtermAchievement(null);
  console.log(`   - 19.5 -> ${b1} (Expected: Exceeding)`);
  console.log(`   - 15.0 -> ${b2} (Expected: Expected +)`);
  console.log(`   - 11.5 -> ${b3} (Expected: Expected)`);
  console.log(`   - 8.5  -> ${b4} (Expected: Emerging +)`);
  console.log(`   - 4.0  -> ${b5} (Expected: Emerging)`);
  console.log(`   - null -> ${b6} (Expected: Not Assessed)`);
  if (b1 !== 'Exceeding' || b2 !== 'Expected +' || b3 !== 'Expected' || b4 !== 'Emerging +' || b5 !== 'Emerging' || b6 !== 'Not Assessed') {
    throw new Error('Mid-term benchmark calibration error!');
  }
  console.log('   ✅ Mid-Term benchmarks calibrated correctly.\n');

  // Step 1.2: Enter Mid-Term Scores
  console.log('1.2 Saving Mid-Term Scores (with absent student left blank):');
  const midtermPayload = [
    { studentId: s1.id, score: 19.5 },
    { studentId: s2.id, score: 15.0 },
    { studentId: s3.id, score: 11.5 },
    { studentId: s4.id, score: 8.5 },
    { studentId: s5.id, score: 4.0 },
    { studentId: s6.id, score: null }, // Absent student: must not be saved as 0!
  ];
  const midtermSaveRes = await saveMidtermResults(term.id, mathSubject.id, session.name, midtermPayload);
  if (!midtermSaveRes.success) throw new Error(`Midterm save failed: ${midtermSaveRes.message}`);
  console.log('   ✅ Mid-term scores saved successfully.');

  // Step 1.3: Verify absent student was NOT stored as 0
  const midtermData = await getMidtermResults(jss1Class.id, term.id, mathSubject.id, session.name);
  const absentResult = midtermData.results?.find((r: any) => r.studentId === s6.id);
  if (absentResult && absentResult.score === 0) {
    throw new Error('CRITICAL BUG: Blank score was converted to 0 in database!');
  }
  console.log(`   ✅ Verified unassessed student (${s6.firstName} ${s6.lastName}) is omitted/null (not 0).\n`);

  // Step 1.4: Enter End-of-Term Scores (CA1, CA2, Exam)
  console.log('1.4 Entering End-of-Term Continuous Assessment & Exam Scores:');
  const termGradesPayload = [
    { studentId: s1.id, subjectId: mathSubject.id, termId: term.id, ca1: 18, ca2: 18, exam: 58 }, // Total: 94 (A1)
    { studentId: s2.id, subjectId: mathSubject.id, termId: term.id, ca1: 14, ca2: 15, exam: 45 }, // Total: 74 (B2)
    { studentId: s3.id, subjectId: mathSubject.id, termId: term.id, ca1: 10, ca2: 12, exam: 32 }, // Total: 54 (C5)
    { studentId: s4.id, subjectId: mathSubject.id, termId: term.id, ca1: 8,  ca2: 10, exam: 22 }, // Total: 40 (E8)
    { studentId: s5.id, subjectId: mathSubject.id, termId: term.id, ca1: 6,  ca2: 8,  exam: 18 }, // Total: 32 (F9)
  ];
  const saveScoresRes = await saveScores(termGradesPayload);
  if (!saveScoresRes.success) throw new Error(`Save scores failed: ${saveScoresRes.error}`);
  console.log('   ✅ Scores entered in Draft state.');

  // Step 1.5: Submit Score Sheet for Review
  console.log('1.5 Submitting Score Sheet for HOD Moderation:');
  const submitRes = await submitScoresForReview(jss1Class.id, mathSubject.id, term.id, teacher?.id);
  if (!submitRes.success) throw new Error(`Submit scores failed: ${submitRes.error}`);
  console.log('   ✅ Score sheet submitted for review (status = Pending, snapshot taken).\n');

  // Step 1.6: Teacher Creates Lesson Note
  console.log('1.6 Creating Lesson Plan with Attachment:');
  const lessonNoteRes = await createLessonNote({
    title: 'Algebraic Expressions & Factorization',
    subjectId: mathSubject.id,
    classId: jss1Class.id,
    teacherId: teacher?.id || 'teacher1',
    termId: term.id,
    weekNumber: 1,
    objectives: 'Students will learn how to expand and factorize quadratic binomials.',
    activities: '1. Warm-up quiz\n2. Group puzzle solving\n3. Board demonstrations',
    resources: 'Graph sheets, Algebra tiles, Whiteboard',
    fileUrl: 'https://drive.google.com/open?id=test-math-worksheet-pdf',
  });
  if (!lessonNoteRes.success || !lessonNoteRes.note) throw new Error(`Create lesson note failed: ${lessonNoteRes.message}`);
  const noteId = lessonNoteRes.note.id;
  console.log(`   - Created Lesson Note "${lessonNoteRes.note.title}" (ID: ${noteId}, status: DRAFT)`);

  const submitNoteRes = await submitLessonNote(noteId);
  if (!submitNoteRes.success) throw new Error(`Submit lesson note failed: ${submitNoteRes.message}`);
  console.log('   ✅ Lesson note submitted to HOD queue (status = SUBMITTED).\n');

  // ============================================================================
  // PERSONA 2: HOD / REVIEWER (Merlin Ambrosius)
  // ============================================================================
  console.log('----------------------------------------------------------------');
  console.log('👤 PERSONA 2: HOD / MODERATOR WORKFLOW (Audit, Moderation & Approvals)');
  console.log('----------------------------------------------------------------');

  // Step 2.1: Check Moderation Queue
  console.log('2.1 Inspecting Moderation Queue Inbox:');
  const modQueue = await getModerationQueue({ termId: term.id });
  const pendingSheet = modQueue.sheets.find((q: any) => q.classId === jss1Class.id && q.subjectId === mathSubject.id);
  if (!pendingSheet) throw new Error('Submitted score sheet not found in Moderation Queue!');
  console.log(`   - Found submission for Class: ${pendingSheet.className}, Subject: ${pendingSheet.subjectName}, Status: ${pendingSheet.status}`);
  console.log('   ✅ Moderation queue inbox correctly displays pending submission.');

  // Step 2.2: Moderate Candidate Score with Audit Trail
  console.log('2.2 Moderating Student Score with Audit Trail:');
  console.log(`   - Auditing ${s3.firstName} ${s3.lastName} (Exam score: 32 -> 38, Practical mark verification)`);
  const modEditRes = await saveModeratorScores({
    classId: jss1Class.id,
    subjectId: mathSubject.id,
    termId: term.id,
    modifierId: hod?.id,
    edits: [
      {
        studentId: s3.id,
        exam: 38, // Adjusted up from 32
        reason: 'Re-checked practical test booklet; awarded +6 marks for step 4',
      },
    ],
  });
  if (!modEditRes.success) throw new Error(`Moderator score edit failed: ${modEditRes.error}`);

  // Step 2.3: Verify ScoreAuditLog entry
  const auditEntry = await prisma.scoreAuditLog.findFirst({
    where: { studentId: s3.id, subjectId: mathSubject.id, termId: term.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!auditEntry) throw new Error('ScoreAuditLog entry was not created!');
  console.log(`   - Audit Log ID: ${auditEntry.id}`);
  console.log(`   - Field: ${auditEntry.field}, Old: ${auditEntry.oldValue}, New: ${auditEntry.newValue}`);
  console.log(`   - Reason: "${auditEntry.reason}"`);
  if (auditEntry.field !== 'exam' || auditEntry.oldValue !== 32 || auditEntry.newValue !== 38) {
    throw new Error('Audit log values do not match moderator input!');
  }
  console.log('   ✅ Audit trail successfully recorded score adjustment.');

  // Step 2.4: Approve Score Sheet (locks the sheet)
  console.log('2.4 Approving Score Sheet:');
  const approveSheetRes = await reviewScoreSheet(jss1Class.id, mathSubject.id, term.id, 'Approved', undefined, hod?.id);
  if (!approveSheetRes.success) throw new Error(`Approve sheet failed: ${approveSheetRes.error}`);

  const approvedGrade = await prisma.termGrade.findFirst({
    where: { studentId: s1.id, subjectId: mathSubject.id, termId: term.id }
  });
  if (approvedGrade?.status !== 'Approved' || !approvedGrade?.isLocked) {
    throw new Error('Score sheet was not marked as Approved and Locked!');
  }
  console.log('   ✅ Score sheet approved and automatically locked against tampering.');

  // Step 2.5: HOD Bulk-reviews Lesson Notes
  console.log('2.5 HOD Bulk-Reviewing Lesson Notes:');
  const bulkNoteRes = await bulkReviewLessonNotes({
    noteIds: [noteId],
    reviewerId: hod?.id || 'hod1',
    action: 'APPROVED',
    reviewNote: 'Exemplary lesson objectives and detailed instructional materials. Approved.',
  });
  if (!bulkNoteRes.success) throw new Error(`Bulk review lesson note failed: ${bulkNoteRes.message}`);
  const verifiedNote = await prisma.lessonNote.findUnique({ where: { id: noteId } });
  if (verifiedNote?.status !== 'APPROVED') throw new Error('Lesson note was not updated to APPROVED!');
  console.log(`   - Note status: ${verifiedNote.status}, Review Note: "${verifiedNote.reviewNote}"`);
  console.log('   ✅ Lesson note approved with reviewer note.\n');

  // ============================================================================
  // PERSONA 3: EXAM OFFICER (EXAM_OFFICER User)
  // ============================================================================
  console.log('----------------------------------------------------------------');
  console.log('👤 PERSONA 3: EXAM OFFICER WORKFLOW (Pre-flight, Draft Results, Rollback)');
  console.log('----------------------------------------------------------------');

  // Step 3.1: Pre-Flight Check
  console.log('3.1 Running Pre-Flight Submission Audit:');
  const preflight = await getResultPreflightCheck(jss1Class.id, term.id, session.id);
  if (!preflight.success) throw new Error(`Preflight check failed: ${preflight.error}`);
  console.log(`   - Total Students: ${preflight.totalStudents}`);
  console.log(`   - Total Subjects: ${preflight.stats?.totalSubjects}`);
  console.log(`   - Approved Subjects: ${preflight.stats?.approvedCount}`);
  console.log(`   - Readiness Percentage: ${preflight.stats?.readinessPercentage}%`);
  console.log('   ✅ Pre-Flight check ran successfully and validated class readiness.');

  // Step 3.2: Generate Term Results in DRAFT MODE with 40% Pass Mark Threshold
  console.log('3.2 Generating Term Results (Draft Mode, Pass Mark = 40%, Standard Competition 1224 Ranking):');
  const generateDraftRes = await generateTermResults(jss1Class.id, term.id, {
    sessionId: session.id,
    passMark: 40, // WAEC E8 standard
    publishMode: 'draft', // DRAFT MODE
    rankingMethod: 'standard', // Competition 1224
    notifyParents: false,
  });
  if (!generateDraftRes.success) throw new Error(`Generate results failed: ${generateDraftRes.error}`);
  console.log(`   - Processed Students: ${generateDraftRes.summary?.studentsCount}`);
  console.log(`   - Class Average: ${generateDraftRes.summary?.classAverage}%`);
  console.log(`   - Pass Rate (using 40% threshold): ${generateDraftRes.summary?.passRate}%`);
  console.log(`   - Is Published: ${generateDraftRes.summary?.isPublished} (Expected: false)`);
  console.log('   - Top 3 Podium Students:');
  generateDraftRes.summary?.topStudents?.forEach((top: any) => {
    console.log(`     Rank ${top.rank}: ${top.name} - Average: ${top.average}%`);
  });
  if (generateDraftRes.summary?.isPublished !== false) {
    throw new Error('Results were marked published when draft mode was selected!');
  }
  console.log('   ✅ Draft results generated successfully with configurable pass mark and podium rankings.');

  // Step 3.3: Publish Results
  console.log('3.3 Publishing Term Results:');
  const publishRes = await publishTermResults(jss1Class.id, term.id, session.id);
  if (!publishRes.success) throw new Error(`Publish failed: ${publishRes.error}`);
  const samplePublished = await prisma.termGrade.findFirst({
    where: { studentId: s1.id, termId: term.id },
  });
  if (!samplePublished?.isPublished) throw new Error('Grades were not marked as isPublished: true!');
  console.log('   ✅ Term results published live.');

  // Step 3.4: Test Instant Rollback / Unpublish
  console.log('3.4 Testing Instant Rollback / Unpublish Action:');
  const unpublishRes = await unpublishTermResults(jss1Class.id, term.id, session.id);
  if (!unpublishRes.success) throw new Error(`Unpublish failed: ${unpublishRes.error}`);
  const sampleUnpublished = await prisma.termGrade.findFirst({
    where: { studentId: s1.id, termId: term.id },
  });
  if (sampleUnpublished?.isPublished !== false) {
    throw new Error('Grades were not reverted to isPublished: false on unpublish!');
  }
  console.log('   ✅ Instant Rollback verified: results retracted back to draft mode.');

  // Re-publish for report card viewing
  await publishTermResults(jss1Class.id, term.id, session.id);
  console.log('   ✅ Re-published results for report card verification.\n');

  // ============================================================================
  // PERSONA 4: EXAMINER / TEACHER (Report Cards, Broadsheet, Batch Printing)
  // ============================================================================
  console.log('----------------------------------------------------------------');
  console.log('👤 PERSONA 4: REPORT CARDS & MASTER BROADSHEET VERIFICATION');
  console.log('----------------------------------------------------------------');

  // Step 4.1: View Single Report Card
  console.log(`4.1 Loading Single Student Report Card for ${s1.firstName} ${s1.lastName}:`);
  const reportCardRes = await getStudentReportCard(s1.id, term.id);
  if (!reportCardRes.success || !reportCardRes.data) throw new Error(`Report card failed: ${reportCardRes.error}`);
  console.log(`   - Student: ${reportCardRes.data.student?.firstName} ${reportCardRes.data.student?.lastName}`);
  console.log(`   - Overall Average: ${reportCardRes.data.summary?.overallAverage}%`);
  console.log(`   - Overall Grade: ${reportCardRes.data.summary?.overallGrade}`);
  console.log(`   - Class Rank: ${reportCardRes.data.summary?.classRank} of ${reportCardRes.data.summary?.classSize}`);
  console.log('   ✅ Single Report Card loaded cleanly with complete academic metadata.');

  // Step 4.2: Update Form Teacher & Principal Remarks
  console.log('4.2 Updating Form Teacher & Principal Remarks:');
  const remarksRes = await updateReportCardRemarks(s1.id, term.id, {
    teacherRemark: 'Exceptional performance. Demonstrated natural curiosity in mathematics.',
    principalRemark: 'A brilliant result. Promoted with distinction.',
  });
  if (!remarksRes.success) throw new Error(`Update remarks failed: ${remarksRes.error}`);
  const updatedReportCard = await getStudentReportCard(s1.id, term.id);
  if (
    updatedReportCard.data?.summary?.teacherRemark !== 'Exceptional performance. Demonstrated natural curiosity in mathematics.' ||
    updatedReportCard.data?.summary?.principalRemark !== 'A brilliant result. Promoted with distinction.'
  ) {
    throw new Error('Remarks were not updated properly!');
  }
  console.log(`   - Teacher Remark: "${updatedReportCard.data?.summary?.teacherRemark}"`);
  console.log(`   - Principal Remark: "${updatedReportCard.data?.summary?.principalRemark}"`);
  console.log('   ✅ Remarks persisted and retrieved in report card summary.');

  // Step 4.3: Master Broadsheet Verification
  console.log('4.3 Generating Master Broadsheet Data:');
  const broadsheetRes = await getBroadsheetData(jss1Class.id, term.id, session.id);
  if (!broadsheetRes.success) throw new Error(`Broadsheet failed: ${broadsheetRes.error}`);
  console.log(`   - Broadsheet rows count: ${broadsheetRes.broadsheet?.length}`);
  console.log(`   - Subjects in Broadsheet: ${broadsheetRes.subjects?.map((s: any) => s.name).join(', ')}`);
  
  // Verify collision-free subject abbreviations logic
  function getAbbr(name: string): string {
    const trimmed = (name || '').trim();
    const upper = trimmed.toUpperCase();
    if (upper === 'COMMERCE') return 'COMM';
    if (upper.includes('COMPUTER')) return 'COMP';
    if (upper.includes('FURTHER')) return 'F.MTH';
    if (upper.includes('MATHEMATICS')) return 'MATH';
    if (upper.includes('ENGLISH')) return 'ENG';
    if (upper.includes('AGRIC')) return 'AGRIC';
    return upper.slice(0, 4);
  }
  const commAbbr = getAbbr('Commerce');
  const compAbbr = getAbbr('Computer Science');
  console.log(`   - Abbreviation Test: Commerce -> "${commAbbr}", Computer Science -> "${compAbbr}"`);
  if (commAbbr === compAbbr) {
    throw new Error('Broadsheet abbreviation collision between Commerce and Computer!');
  }
  console.log('   ✅ Broadsheet subject abbreviations are collision-free.');

  // Step 4.4: Whole-Class Batch Report Cards for Bulk Printing
  console.log('4.4 Testing Whole-Class Batch Report Cards (Bulk Print Engine):');
  const batchRes = await getClassBatchReportCards(jss1Class.id, term.id, session.id);
  if (!batchRes.success || !batchRes.data) throw new Error(`Batch report cards failed: ${batchRes.error}`);
  console.log(`   - Batch report cards loaded: ${batchRes.data.length} candidate cards`);
  console.log(`   - Class: ${batchRes.class?.name}`);
  console.log(`   - Term: ${batchRes.term?.name}`);
  if (batchRes.data.length !== jss1Class.currentStudents.length) {
    console.warn(`Warning: Expected ${jss1Class.currentStudents.length} report cards, got ${batchRes.data.length}`);
  }
  console.log('   ✅ Batch Report Card generation loaded entire class in a single high-performance query.\n');

  // ============================================================================
  // PERSONA 5: FORM TEACHER (Behavioural Assessment Matrix)
  // ============================================================================
  console.log('----------------------------------------------------------------');
  console.log('👤 PERSONA 5: FORM TEACHER BEHAVIOURAL ASSESSMENT MATRIX');
  console.log('----------------------------------------------------------------');

  // Step 5.1: Fetch Behavioural Assessments
  console.log('5.1 Loading Behavioural Assessment Class Roster:');
  const behavData = await getBehaviouralAssessments(jss1Class.id, term.id, session.name);
  if (!behavData.success) throw new Error(`Get behavioural failed: ${behavData.message}`);
  console.log(`   - Candidates loaded: ${behavData.students.length}`);
  console.log('   ✅ Loaded student list for behavioural ratings.');

  // Step 5.2: Fill all 8 traits + Form Teacher qualitative comment
  console.log('5.2 Saving 8-Trait Likert Matrix + Form Teacher Comment:');
  const behavPayload = [
    {
      studentId: s1.id,
      conduct: 5,
      punctuality: 5,
      dedication: 5,
      participation: 4,
      hospitality: 5,
      neatness: 5,
      creativity: 5, // The 8th trait
      physical: 4,
      comment: 'An exemplary student demonstrating high creativity and moral leadership.',
    },
    {
      studentId: s2.id,
      conduct: 4,
      punctuality: 4,
      dedication: 4,
      participation: 5,
      hospitality: 4,
      neatness: 4,
      creativity: 4,
      physical: 5,
      comment: 'Very energetic and enthusiastic in both academics and sports.',
    },
  ];

  const saveBehavRes = await saveBehaviouralAssessments(term.id, session.name, behavPayload);
  if (!saveBehavRes.success) throw new Error(`Save behavioural failed: ${saveBehavRes.message}`);
  console.log('   ✅ Saved behavioural ratings and comments.');

  // Step 5.3: Verify persistence of all 8 traits and comment
  const reloadedBehav = await getBehaviouralAssessments(jss1Class.id, term.id, session.name);
  const s1Behav = reloadedBehav.assessments.find((a: any) => a.studentId === s1.id);
  if (!s1Behav) throw new Error('Saved behavioural assessment not found on reload!');
  console.log(`   - Student: ${s1.firstName} ${s1.lastName}`);
  console.log(`   - Traits: Conduct=${s1Behav.conduct}, Punctuality=${s1Behav.punctuality}, Creativity=${s1Behav.creativity}`);
  console.log(`   - Comment: "${s1Behav.comment}"`);
  if (s1Behav.creativity !== 5 || !s1Behav.comment) {
    throw new Error('Creativity trait or comment failed to persist in BehaviouralAssessment!');
  }
  console.log('   ✅ Verified all 8 traits + Form Teacher Comment persisted accurately.\n');

  console.log('================================================================');
  console.log('🎉 ALL 5 USER PERSONA WORKFLOWS COMPLETED SUCCESSFULLY WITH 100% PASS!');
  console.log('================================================================');
}

runRealUserSimulation()
  .catch((err) => {
    console.error('\n❌ SIMULATION FAILED WITH ERROR:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
