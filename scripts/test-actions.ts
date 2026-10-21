import { getAcademicData } from '../src/actions/academic-data';
import { getStudents } from '../src/actions/student-actions';
import { getInvoices } from '../src/actions/billing-actions';
import { getFleetData } from '../src/actions/fleet-actions';
import { getAtsData } from '../src/actions/ats-actions';
import { getAssetData } from '../src/actions/asset-actions';
import { getLedgerData } from '../src/actions/ledger-actions';
import { getLoansData } from '../src/actions/payroll-pro-actions';
import { getQuestionPapers } from '../src/actions/question-paper-actions';
import { getScoresByClassSubjectAndTerm, getResultPreflightCheck, getBroadsheetData } from '../src/actions/results-actions';
import { getAttendanceLogs, getBasDashboardStats } from '../src/actions/bas-actions';

async function runTests() {
  console.log('====================================================');
  console.log('    PROXIMA SMS - LIVE SERVER ACTIONS VERIFICATION   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<any>) {
    try {
      const res = await fn();
      console.log(`[PASS] ${name}`);
      passed++;
      return res;
    } catch (e: any) {
      console.error(`[FAIL] ${name}: ${e.message}`);
      failed++;
      return null;
    }
  }

  // 1. Academic Data
  const academic = await test('Academic Core: getAcademicData()', async () => {
    const data = await getAcademicData();
    if (!data.classes || !data.subjects || !data.terms) throw new Error('Missing academic fields');
    console.log(`       Classes: ${data.classes.length}, Subjects: ${data.subjects.length}, Terms: ${data.terms.length}`);
    return data;
  });

  // 2. Students Directory
  await test('Student Directory: getStudents()', async () => {
    const res = await getStudents();
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || 'Expected student array');
    console.log(`       Live Students in Directory: ${res.data.length}`);
    return res.data;
  });

  // 3. Finance Invoices
  await test('Billing & Invoicing: getInvoices()', async () => {
    const invoices = await getInvoices();
    if (!Array.isArray(invoices)) throw new Error('Expected invoice array');
    console.log(`       Live Invoices fetched: ${invoices.length}`);
    return invoices;
  });

  // 4. Fleet Data
  await test('Fleet & Logistics: getFleetData()', async () => {
    const res = await getFleetData();
    if (!res.success || !res.data?.vehicles || !res.data?.routes) throw new Error(res.error || 'Invalid fleet structure');
    console.log(`       Vehicles in Fleet: ${res.data.vehicles.length}, Routes: ${res.data.routes.length}`);
    return res.data;
  });

  // 5. ATS / Recruitment Data
  await test('Recruitment ATS: getAtsData()', async () => {
    const res = await getAtsData();
    if (!res.success || !res.data?.jobPostings || !res.data?.jobApplications) throw new Error(res.error || 'Invalid ATS structure');
    console.log(`       Job Postings: ${res.data.jobPostings.length}, Applications: ${res.data.jobApplications.length}`);
    return res.data;
  });

  // 6. Asset Management Data
  await test('Asset Management: getAssetData()', async () => {
    const res = await getAssetData();
    if (!res.success || !res.data?.assets || !res.data?.metrics) throw new Error(res.error || 'Invalid Asset structure');
    console.log(`       Assets Cataloged: ${res.data.assets.length}, Metrics calculated: ${res.data.metrics.length}`);
    return res.data;
  });

  // 7. General Ledger Data
  await test('Accounting: getLedgerData()', async () => {
    const res = await getLedgerData();
    if (!res.success || !res.data?.accounts || !res.data?.entries) throw new Error(res.error || 'Invalid Ledger structure');
    console.log(`       Chart of Accounts: ${res.data.accounts.length}, Journal Entries: ${res.data.entries.length}`);
    return res.data;
  });

  // 8. Staff Loans & Payroll Pro Data
  await test('Payroll Pro: getLoansData()', async () => {
    const res = await getLoansData();
    if (!res.success || !res.data?.loans) throw new Error(res.error || 'Invalid Loans structure');
    console.log(`       Staff Loans: ${res.data.loans.length}`);
    return res.data;
  });

  // 9. Question Papers Bank
  await test('Academics: getQuestionPapers()', async () => {
    const res = await getQuestionPapers();
    if (!res.success) throw new Error(res.message || 'Failed to fetch question papers');
    console.log(`       Question Papers in bank: ${res.papers.length}`);
    return res.papers;
  });

  // 10. Scores By Class & Subject
  if (academic && academic.classes.length > 0 && academic.subjects.length > 0 && academic.terms.length > 0) {
    const classId = academic.classes[0].id;
    const subjectId = academic.subjects[0].id;
    const termName = academic.terms[0].name;
    const sessionName = academic.sessions?.[0]?.name || '2024/2025';

    await test(`Continuous Assessment: getScoresByClassSubjectAndTerm(${academic.classes[0].name}, ${academic.subjects[0].name})`, async () => {
      const res = await getScoresByClassSubjectAndTerm(classId, subjectId, termName, sessionName);
      if (!res.success) throw new Error(res.message || 'Failed to fetch scores');
      console.log(`       CA scores loaded: ${res.scores?.length || 0}`);
      return res;
    });
  }

  // 11. Staff Attendance BAS
  await test('Biometrics (BAS): getAttendanceLogs(today)', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await getAttendanceLogs(today);
    if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || 'Expected attendance logs array');
    console.log(`       BAS Attendance Logs loaded for ${today}: ${res.data.length}`);
    return res.data;
  });

  // 12. BAS Dashboard Stats
  await test('Biometrics (BAS): getBasDashboardStats()', async () => {
    const res = await getBasDashboardStats();
    if (!res.success || !res.data) throw new Error(res.error || 'Failed to fetch BAS stats');
    console.log(`       Total Staff: ${res.data.totalActiveStaff}, Presence Rate: ${res.data.presenceRate}%, Active Kiosks: ${res.data.activeKiosks}`);
    return res.data;
  });

  // 13. Result Preflight Check
  if (academic && academic.classes.length > 0 && academic.terms.length > 0) {
    const classId = academic.classes[0].id;
    const termId = academic.terms[0].id;
    await test(`Result Processing: getResultPreflightCheck(${academic.classes[0].name})`, async () => {
      const res = await getResultPreflightCheck(classId, termId);
      if (!res.success) throw new Error(res.error || 'Preflight check failed');
      console.log(`       Eligible Students: ${res.studentCount}, Subjects: ${res.subjectCount}`);
      return res;
    });

    // 14. Broadsheet Data Generation
    await test(`Result Broadsheet: getBroadsheetData(${academic.classes[0].name})`, async () => {
      const res = await getBroadsheetData(classId, termId);
      if (!res.success) throw new Error(res.message || 'Broadsheet fetch failed');
      console.log(`       Broadsheet Students: ${res.data?.students?.length || 0}`);
      return res;
    });
  }

  console.log(`\n====================================================`);
  console.log(`Final Result: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================\n`);
}

runTests().catch(console.error);
