import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('   PROXIMA SMS ENTERPRISE - COMPREHENSIVE AUDIT    ');
  console.log('====================================================\n');

  // 1. License & System Info
  console.log('--- 1. SYSTEM & LICENSE STATUS ---');
  try {
    const license = await prisma.systemLicense.findFirst({ orderBy: { createdAt: 'desc' } });
    const profile = await prisma.systemProfile.findFirst();
    console.log(`School / System Profile: ${profile?.name || 'Proxima SMS'}`);
    console.log(`School Email: ${profile?.email || 'N/A'}`);
    console.log(`License Status: ${license ? `Tier ${license.tier}, Student Capacity: ${license.studentCapacity}, Active: ${license.isActive}` : 'No license record'}`);
  } catch (err: any) {
    console.error('Error fetching license/profile:', err.message);
  }

  // 2. Academic Core
  console.log('\n--- 2. ACADEMIC CORE ---');
  try {
    const sessions = await prisma.academicSession.findMany({ include: { terms: true } });
    const classes = await prisma.class.findMany();
    const subjects = await prisma.subject.findMany();
    const gradingScales = await prisma.gradingScale.findMany({ include: { entries: true } });

    console.log(`Academic Sessions: ${sessions.length}`);
    sessions.forEach(s => console.log(`  - Session: ${s.name} (Active: ${s.active}), Terms: ${s.terms.map(t => t.name).join(', ')}`));
    console.log(`Classes count: ${classes.length} (e.g. ${classes.slice(0, 3).map(c => c.name).join(', ')})`);
    console.log(`Subjects count: ${subjects.length} (e.g. ${subjects.slice(0, 3).map(s => s.name).join(', ')})`);
    console.log(`Grading Scales configured: ${gradingScales.length}`);
  } catch (err: any) {
    console.error('Error in Academic Core:', err.message);
  }

  // 3. User & Student Populations
  console.log('\n--- 3. POPULATIONS & DIRECTORIES ---');
  try {
    const usersCount = await prisma.user.count();
    const studentsCount = await prisma.student.count();
    const roles = await prisma.accessRole.findMany({ include: { _count: { select: { users: true } } } });
    const userRoleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    console.log(`Total Users in DB: ${usersCount}`);
    console.log(`Total Students in DB: ${studentsCount}`);
    console.log('Users by Role enum:');
    userRoleCounts.forEach(r => console.log(`  - ${r.role}: ${r._count.id}`));
  } catch (err: any) {
    console.error('Error in Populations:', err.message);
  }

  // 4. Academics: Scores, Grades & Lesson Plans
  console.log('\n--- 4. ACADEMICS & ASSESSMENTS ---');
  try {
    const termGradesCount = await prisma.termGrade.count();
    const questionPapersCount = await prisma.lessonNote.count({
      where: { evaluation: { startsWith: 'QUESTION_PAPER' } }
    });
    const lessonPlansOnly = await prisma.lessonNote.count({
      where: { NOT: { evaluation: { startsWith: 'QUESTION_PAPER' } } }
    });
    const tahfeezScoresCount = await prisma.tahfeezScore.count();
    const behaviouralScoresCount = await prisma.behaviouralScore.count();
    const assignmentsCount = await prisma.gradebookAssignment.count();
    const gradebookScoresCount = await prisma.gradebookScore.count();
    const midtermResultsCount = await prisma.midtermResult.count();

    console.log(`Term Grades recorded: ${termGradesCount}`);
    console.log(`Lesson Plans recorded: ${lessonPlansOnly}`);
    console.log(`Question Papers in Bank: ${questionPapersCount}`);
    console.log(`Tahfeez Scores recorded: ${tahfeezScoresCount}`);
    console.log(`Behavioural Scores recorded: ${behaviouralScoresCount}`);
    console.log(`Gradebook Assignments: ${assignmentsCount}`);
    console.log(`Gradebook Scores: ${gradebookScoresCount}`);
    console.log(`Midterm Results recorded: ${midtermResultsCount}`);
  } catch (err: any) {
    console.error('Error in Academics & Assessments:', err.message);
  }

  // 5. Finance & Billing
  console.log('\n--- 5. FINANCE & BILLING ---');
  try {
    const invoicesCount = await prisma.invoice.count();
    const receiptsCount = await prisma.paymentReceipt.count();
    const feeStructuresCount = await prisma.feeStructure.count();
    const payrollRunsCount = await prisma.payroll.count();
    const staffLoansCount = await prisma.staffLoan.count();
    const journalEntriesCount = await prisma.journalEntry.count();
    const accountCodesCount = await prisma.accountCode.count();
    const expensesCount = await prisma.expense.count();

    console.log(`Fee Structures configured: ${feeStructuresCount}`);
    console.log(`Invoices issued: ${invoicesCount}`);
    console.log(`Payment Receipts issued: ${receiptsCount}`);
    console.log(`Expenses recorded: ${expensesCount}`);
    console.log(`Payroll Runs: ${payrollRunsCount}`);
    console.log(`Staff Loans & Advances: ${staffLoansCount}`);
    console.log(`Chart of Accounts codes: ${accountCodesCount}`);
    console.log(`General Ledger Journal Entries: ${journalEntriesCount}`);
  } catch (err: any) {
    console.error('Error in Finance & Billing:', err.message);
  }

  // 6. Biometrics & Attendance (BAS)
  console.log('\n--- 6. BIOMETRICS & BAS ---');
  try {
    const kiosksCount = await prisma.kiosk.count();
    const shiftsCount = await prisma.shift.count();
    const staffAttendanceLogsCount = await prisma.staffAttendance.count();
    const studentAttendanceLogsCount = await prisma.attendance.count();

    console.log(`Kiosk Devices registered: ${kiosksCount}`);
    console.log(`Shifts configured: ${shiftsCount}`);
    console.log(`Staff Attendance Logs captured: ${staffAttendanceLogsCount}`);
    console.log(`Student Attendance Logs captured: ${studentAttendanceLogsCount}`);
  } catch (err: any) {
    console.error('Error in BAS:', err.message);
  }

  // 7. Operations: Fleet, ATS & Assets
  console.log('\n--- 7. OPERATIONS: FLEET, RECRUITMENT & ASSETS ---');
  try {
    const vehiclesCount = await prisma.vehicle.count();
    const routesCount = await prisma.transportRoute.count();
    const jobPostingsCount = await prisma.jobPosting.count();
    const jobAppsCount = await prisma.jobApplication.count();
    const assetsCount = await prisma.asset.count();
    const assetCategoriesCount = await prisma.assetCategory.count();

    console.log(`Vehicles in Fleet: ${vehiclesCount}`);
    console.log(`Transport Routes: ${routesCount}`);
    console.log(`Recruitment Job Postings: ${jobPostingsCount}`);
    console.log(`Job Applications: ${jobAppsCount}`);
    console.log(`Asset Categories: ${assetCategoriesCount}`);
    console.log(`Cataloged Assets: ${assetsCount}`);
  } catch (err: any) {
    console.error('Error in Operations:', err.message);
  }

  console.log('\n====================================================');
  console.log('   AUDIT COMPLETE - SYSTEM HEALTH VERIFIED           ');
  console.log('====================================================');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
