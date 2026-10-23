import { chromium, Browser, Page } from 'playwright';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'e2e-output', 'heavy-audit');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface AuditRecord {
  category: string;
  name: string;
  pathOrEndpoint: string;
  type: 'PAGE' | 'API' | 'TRANSACTION';
  status: 'PASS' | 'WARN' | 'FAIL';
  statusCode?: number;
  durationMs: number;
  details?: string;
  error?: string;
  consoleErrors: string[];
  screenshot?: string;
}

const auditResults: AuditRecord[] = [];

async function logRecord(record: AuditRecord) {
  auditResults.push(record);
  const icon = record.status === 'PASS' ? '✅' : record.status === 'WARN' ? '⚠️' : '❌';
  console.log(`[${icon} ${record.status}] [${record.category}] ${record.name} (${record.durationMs}ms)`);
  if (record.details) console.log(`       ℹ️  ${record.details}`);
  if (record.error) console.log(`       🔴 ERROR: ${record.error}`);
  if (record.consoleErrors && record.consoleErrors.length > 0) {
    console.log(`       ⚠️  Console: ${record.consoleErrors.slice(0, 2).join(' | ')}`);
  }
}

async function loginUser(page: Page, email: string = 'admin@proximahub.com', pass: string = 'password123'): Promise<boolean> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', pass);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL('**/dashboard**', { timeout: 8000 });
    return true;
  } catch {
    return page.url().includes('/dashboard') || page.url().includes('/student') || page.url().includes('/parent');
  }
}

async function runHeavyDutyAudit() {
  console.log('================================================================');
  console.log('   PROXIMA SMS - HEAVY-DUTY ENTERPRISE ARCHITECTURAL AUDIT      ');
  console.log('================================================================\n');

  // Fetch real database records to test dynamic routes with production keys
  const [sampleStudent, sampleUser, sampleInvoice, sampleKiosk, sampleReceipt] = await Promise.all([
    prisma.student.findFirst({ select: { id: true, studentId: true, firstName: true } }),
    prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } }),
    prisma.invoice.findFirst({ select: { id: true } }),
    prisma.kiosk.findFirst({ select: { id: true, terminalId: true } }),
    prisma.paymentReceipt.findFirst({ select: { id: true } }),
  ]);

  const studentId = sampleStudent?.id || 'cmshiliby001qekzi4zrbuy31';
  const userId = sampleUser?.id || 'cmshfz9wq0000kxb0mwbjxg6l';
  const invoiceId = sampleInvoice?.id || 'cmshilieq001yekzi19oheiws';
  const kioskId = sampleKiosk?.id || 'cmsz834680000vwbextnoif3t';
  const kioskTerminal = sampleKiosk?.terminalId || 'KB-1873E5D8';
  const receiptId = sampleReceipt?.id || 'cmshilife0020ekzi91ox0q46';

  const browser = await chromium.launch({ headless: true });

  try {
    // Phase 1: Heavy Browser Route Audit
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('🔐 Authenticating admin user session...');
    const loggedIn = await loginUser(page);
    if (!loggedIn) throw new Error('Failed to authenticate admin session');
    console.log('✅ Admin session active. Commencing deep audit of all 65+ routes...\n');

    const routesToAudit: { category: string; name: string; url: string; authRequired?: boolean }[] = [
      // 1. Academic Operations
      { category: 'Academics - Evaluation', name: 'Midterm Evaluation Hub', url: '/dashboard/midterm' },
      { category: 'Academics - Evaluation', name: 'Midterm Score Entry', url: '/dashboard/midterm/enter' },
      { category: 'Academics - Evaluation', name: 'Midterm Report Cards', url: '/dashboard/midterm/view' },
      { category: 'Academics - Tahfeez', name: 'Tahfeez Quran Tracking', url: '/dashboard/tahfeez' },
      { category: 'Academics - Tahfeez', name: 'Tahfeez Score Entry', url: '/dashboard/tahfeez/enter' },
      { category: 'Academics - Behavioural', name: 'Behavioural Assessment Overview', url: '/dashboard/behavioural' },
      { category: 'Academics - Behavioural', name: 'Behavioural Entry Grid', url: '/dashboard/behavioural/enter' },
      { category: 'Academics - Examination', name: 'Exam Seating Hall Planner', url: '/dashboard/seating-plan' },
      { category: 'Academics - Examination', name: 'Exam Registration & Hall Tickets', url: '/dashboard/exam-registration' },
      { category: 'Academics - Bulk Ingestion', name: 'CSV Score Upload Engine', url: '/dashboard/upload/scores' },
      { category: 'Academics - Bulk Ingestion', name: 'CSV Midterm Upload Engine', url: '/dashboard/upload/midterm' },
      { category: 'Academics - Timetable', name: 'Master School Timetable', url: '/dashboard/timetable' },

      // 2. Results, Broadsheets & Printing
      { category: 'Results & Broadsheet', name: 'Consolidated Term Broadsheet', url: '/dashboard/results/broadsheet' },
      { category: 'Results & Broadsheet', name: 'Class Result Breakdown', url: '/dashboard/results/class' },
      { category: 'Results & Broadsheet', name: 'Scratch Card Result Tokens', url: '/dashboard/results/tokens' },
      { category: 'Results & Broadsheet', name: 'Tahfeez Broadsheet & Summary', url: '/dashboard/results/tahfeez' },
      { category: 'Results & Broadsheet', name: 'Bulk Report Card Print Studio', url: '/dashboard/results/print' },

      // 3. Student Lifecycle & 360 Records
      { category: 'Student Lifecycle', name: 'Student Directory', url: '/dashboard/students' },
      { category: 'Student Lifecycle', name: 'Admissions & Enrollment Pipeline', url: '/dashboard/students/admissions' },
      { category: 'Student Lifecycle', name: 'End-of-Year Class Promotions', url: '/dashboard/students/promote' },
      { category: 'Student Lifecycle', name: '360° Student Dossier & Profile', url: `/dashboard/students/${studentId}` },
      { category: 'Student Lifecycle', name: 'Academic Departments Directory', url: '/dashboard/departments' },

      // 4. Finance & Institutional Accounting
      { category: 'Finance & Billing', name: 'Fee Structures & Class Templates', url: '/dashboard/finance/fee-structures' },
      { category: 'Finance & Billing', name: 'Operational Expenditure & Expenses', url: '/dashboard/finance/expenses' },
      { category: 'Finance & Billing', name: 'Staff Loans & Salary Advances', url: '/dashboard/finance/loans' },
      { category: 'Finance & Billing', name: 'Student Invoices Ledger', url: '/dashboard/finance/invoices' },
      { category: 'Finance & Billing', name: 'Detailed Single Invoice View', url: `/dashboard/finance/invoices/${invoiceId}` },
      { category: 'Finance & Billing', name: 'Payment Receipts Ledger', url: '/dashboard/finance/payments' },
      { category: 'Finance & Billing', name: 'Monthly Payroll Register', url: '/dashboard/finance/payroll' },
      { category: 'Finance & Billing', name: 'Double-Entry General Ledger', url: '/dashboard/finance/ledger' },
      { category: 'Finance & Billing', name: 'Chart of Accounts Architecture', url: '/dashboard/finance/chart-of-accounts' },
      { category: 'Finance & Billing', name: 'Institutional Financial Statements', url: '/dashboard/finance/reports' },

      // 5. Biometrics & Attendance Hardware (BAS)
      { category: 'BAS Biometrics', name: 'Biometrics Command Dashboard', url: '/dashboard/bas/dashboard' },
      { category: 'BAS Biometrics', name: 'Daily Staff Attendance Register', url: '/dashboard/bas/attendance' },
      { category: 'BAS Biometrics', name: 'Kiosk Terminal Fleet Manager', url: '/dashboard/bas/kiosks' },
      { category: 'BAS Biometrics', name: 'Kiosk Terminal Event Logs', url: `/dashboard/bas/kiosks/${kioskId}/logs` },
      { category: 'BAS Biometrics', name: 'Staff Shift Schedules & Policy', url: '/dashboard/bas/shifts' },
      { category: 'BAS Biometrics', name: 'Academic & Public Holiday Calendar', url: '/dashboard/bas/holidays' },
      { category: 'BAS Biometrics', name: 'Monthly Attendance Payroll Export', url: '/dashboard/bas/reports' },
      { category: 'BAS Biometrics', name: 'Staff Biometric Enrollment Status', url: '/dashboard/bas/staff' },

      // 6. Inventory, Procurement & Fixed Assets
      { category: 'Inventory & Assets', name: 'Inventory Overview Dashboard', url: '/dashboard/inventory' },
      { category: 'Inventory & Assets', name: 'Consumable Stock Catalog', url: '/dashboard/inventory/items' },
      { category: 'Inventory & Assets', name: 'Procurement Purchase Orders', url: '/dashboard/inventory/orders' },
      { category: 'Inventory & Assets', name: 'Supplier & Vendor Directory', url: '/dashboard/inventory/suppliers' },
      { category: 'Inventory & Assets', name: 'Stock Movement Audit Trail', url: '/dashboard/inventory/transactions' },
      { category: 'Inventory & Assets', name: 'Fixed Asset Registry & Depreciation', url: '/dashboard/inventory/assets' },

      // 7. Operations & Human Resources
      { category: 'Operations & HR', name: 'Fleet Logistics & Vehicle Tracking', url: '/dashboard/fleet' },
      { category: 'Operations & HR', name: 'Recruitment & Applicant Tracking (ATS)', url: '/dashboard/recruitment' },
      { category: 'Operations & HR', name: 'Staff & Faculty Management', url: '/dashboard/users' },
      { category: 'Operations & HR', name: 'Staff User Profile Dossier', url: `/dashboard/users/${userId}` },

      // 8. Communications & Notice Board
      { category: 'Communications', name: 'Broadcast Communication Center', url: '/dashboard/communication' },
      { category: 'Communications', name: 'Bulk SMS & Email Dispatch Composer', url: '/dashboard/communication/compose' },
      { category: 'Communications', name: 'Campus Announcements Board', url: '/dashboard/announcements' },
      { category: 'Communications', name: 'Staff Notifications Center', url: '/dashboard/notifications' },
      { category: 'Communications', name: 'Internal Messaging Console', url: '/dashboard/messaging' },

      // 9. System Administration & Security Governance
      { category: 'System Governance', name: 'Granular RBAC Access Roles', url: '/dashboard/system/roles' },
      { category: 'System Governance', name: 'Academic Year & Terms Manager', url: '/dashboard/system/academic-year' },
      { category: 'System Governance', name: 'Classes & Curriculum Matrix', url: '/dashboard/system/classes-subjects' },
      { category: 'System Governance', name: 'Grading Scales Configuration', url: '/dashboard/system/grading' },
      { category: 'System Governance', name: 'Institutional School Identity', url: '/dashboard/system/school-info' },
      { category: 'System Governance', name: 'Global Fees Policy', url: '/dashboard/system/fees' },
      { category: 'System Governance', name: 'License Validator & Health', url: '/dashboard/system/license' },
      { category: 'System Governance', name: 'AI Assistant Configuration', url: '/dashboard/system/ai-settings' },
      { category: 'System Governance', name: 'Database Maintenance & Backups', url: '/dashboard/system/maintenance' },
      { category: 'System Governance', name: 'Security Audit & Event Logs', url: '/dashboard/logs' },

      // 10. Role Dashboards, Portals & Public Services
      { category: 'Portals & Specialized', name: 'HOD Departmental Dashboard', url: '/dashboard/hod' },
      { category: 'Portals & Specialized', name: 'HOD Academic Analytics', url: '/dashboard/hod/analytics' },
      { category: 'Portals & Specialized', name: 'SLT Senior Leadership Dashboard', url: '/dashboard/slt' },
      { category: 'Portals & Specialized', name: 'SLT Academic Performance Center', url: '/dashboard/slt/academics' },
      { category: 'Portals & Specialized', name: 'Parent Portal Interface', url: '/parent/dashboard' },
      { category: 'Portals & Specialized', name: 'Student Learning Management (LMS)', url: '/student/dashboard' },
      { category: 'Portals & Specialized', name: 'Public Result Checker Portal', url: '/result-checker', authRequired: false },
      { category: 'Portals & Specialized', name: 'Digital Receipt QR Verification', url: `/verify/receipt/${receiptId}`, authRequired: false },
    ];

    for (const route of routesToAudit) {
      const start = Date.now();
      const consoleErrors: string[] = [];

      const onConsole = (msg: any) => {
        if (msg.type() === 'error') {
          const t = msg.text();
          if (!t.includes('favicon') && !t.includes('manifest.json') && !t.includes('_vercel')) {
            consoleErrors.push(t);
          }
        }
      };
      const onPageError = (err: any) => consoleErrors.push(err.message);

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      try {
        const fullUrl = `${BASE_URL}${route.url}`;
        const response = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const statusCode = response?.status() || 200;

        await page.waitForTimeout(1000);

        // Sanity check: Ensure page didn't throw an unhandled React error boundary
        const hasReactError = await page.evaluate(() => {
          return document.body.innerText.includes('Application error: a client-side exception has occurred') ||
                 document.body.innerText.includes('Unhandled Runtime Error');
        });

        if (hasReactError) {
          throw new Error('Detected unhandled React Client-Side Exception on page');
        }

        const safeFilename = route.url.replace(/[\/\\?%*:|"<>]/g, '_') + '.png';
        const screenshotPath = path.join(SCREENSHOTS_DIR, safeFilename);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const durationMs = Date.now() - start;
        const status = (statusCode >= 400 || consoleErrors.length > 0) ? 'WARN' : 'PASS';

        await logRecord({
          category: route.category,
          name: route.name,
          pathOrEndpoint: route.url,
          type: 'PAGE',
          status,
          statusCode,
          durationMs,
          details: `Rendered successfully (HTTP ${statusCode}). Screenshot: ${safeFilename}`,
          consoleErrors,
          screenshot: safeFilename,
        });
      } catch (err: any) {
        await logRecord({
          category: route.category,
          name: route.name,
          pathOrEndpoint: route.url,
          type: 'PAGE',
          status: 'FAIL',
          durationMs: Date.now() - start,
          error: err.message,
          consoleErrors,
        });
      } finally {
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
      }
    }

    await context.close();

    // Phase 2: Biometric Hardware & Kiosk API Endpoints Audit
    console.log('\n======================================================');
    console.log('  PHASE 2: BIOMETRIC HARDWARE & KIOSK API AUDIT       ');
    console.log('======================================================\n');

    // API 1: Kiosk Heartbeat
    {
      const start = Date.now();
      try {
        const res = await fetch(`${BASE_URL}/api/v1/kiosk/heartbeat`, {
          method: 'GET',
          headers: {
            'x-terminal-id': kioskTerminal,
          },
        });
        const data = await res.json();
        const durationMs = Date.now() - start;
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk Heartbeat Telemetry (/api/v1/kiosk/heartbeat)',
          pathOrEndpoint: '/api/v1/kiosk/heartbeat',
          type: 'API',
          status: res.ok ? 'PASS' : 'WARN',
          statusCode: res.status,
          durationMs,
          details: `Status: ${data.status || 'OK'}, Command: ${data.command || 'SCAN'}`,
          consoleErrors: [],
        });
      } catch (err: any) {
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk Heartbeat Telemetry',
          pathOrEndpoint: '/api/v1/kiosk/heartbeat',
          type: 'API',
          status: 'FAIL',
          durationMs: Date.now() - start,
          error: err.message,
          consoleErrors: [],
        });
      }
    }

    // API 2: Kiosk Staff Sync
    {
      const start = Date.now();
      try {
        // Ensure kiosk is active for staff sync
        await prisma.kiosk.updateMany({
          where: { terminalId: kioskTerminal },
          data: { isActive: true },
        });

        const res = await fetch(`${BASE_URL}/api/v1/kiosk/staff`, {
          method: 'GET',
          headers: {
            'x-terminal-id': kioskTerminal,
          },
        });
        const data = await res.json();
        const durationMs = Date.now() - start;
        const staffCount = data.staff ? data.staff.length : (Array.isArray(data) ? data.length : 0);
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk Staff Sync (/api/v1/kiosk/staff)',
          pathOrEndpoint: '/api/v1/kiosk/staff',
          type: 'API',
          status: res.ok ? 'PASS' : 'WARN',
          statusCode: res.status,
          durationMs,
          details: `Synchronized ${staffCount} staff records to terminal`,
          consoleErrors: [],
        });
      } catch (err: any) {
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk Staff Sync',
          pathOrEndpoint: '/api/v1/kiosk/staff',
          type: 'API',
          status: 'FAIL',
          durationMs: Date.now() - start,
          error: err.message,
          consoleErrors: [],
        });
      }
    }

    // API 3: Kiosk PIN Verification
    {
      const start = Date.now();
      try {
        const testStaff = await prisma.user.findFirst({ where: { kioskPin: { not: null } } });
        const pinToTest = testStaff?.kioskPin || '1234';

        const res = await fetch(`${BASE_URL}/api/v1/kiosk/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-terminal-id': kioskTerminal,
          },
          body: JSON.stringify({ personnel_number: testStaff?.staffId || 'STF-001', pin: pinToTest }),
        });
        const durationMs = Date.now() - start;
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk PIN Verification (/api/v1/kiosk/verify-pin)',
          pathOrEndpoint: '/api/v1/kiosk/verify-pin',
          type: 'API',
          status: (res.ok || res.status === 401 || res.status === 404) ? 'PASS' : 'FAIL',
          statusCode: res.status,
          durationMs,
          details: `Responded with HTTP ${res.status}`,
          consoleErrors: [],
        });
      } catch (err: any) {
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Kiosk PIN Verification',
          pathOrEndpoint: '/api/v1/kiosk/verify-pin',
          type: 'API',
          status: 'FAIL',
          durationMs: Date.now() - start,
          error: err.message,
          consoleErrors: [],
        });
      }
    }

    // API 4: Attendance Sync
    {
      const start = Date.now();
      try {
        const staff = await prisma.user.findFirst();
        const logsPayload = [{
          staffId: staff?.id,
          timestamp: new Date().toISOString(),
          verificationMode: 'PIN',
          status: 'PRESENT',
        }];

        const res = await fetch(`${BASE_URL}/api/v1/kiosk/sync-attendance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-terminal-id': kioskTerminal,
          },
          body: JSON.stringify({ logs: logsPayload }),
        });
        const durationMs = Date.now() - start;
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Biometric Attendance Sync (/api/v1/kiosk/sync-attendance)',
          pathOrEndpoint: '/api/v1/kiosk/sync-attendance',
          type: 'API',
          status: (res.ok || res.status === 200 || res.status === 201) ? 'PASS' : 'WARN',
          statusCode: res.status,
          durationMs,
          details: `Processed offline sync batch (HTTP ${res.status})`,
          consoleErrors: [],
        });
      } catch (err: any) {
        await logRecord({
          category: 'BAS Hardware API',
          name: 'Biometric Attendance Sync',
          pathOrEndpoint: '/api/v1/kiosk/sync-attendance',
          type: 'API',
          status: 'FAIL',
          durationMs: Date.now() - start,
          error: err.message,
          consoleErrors: [],
        });
      }
    }

  } finally {
    await browser.close();
  }

  // Generate Heavy-Duty Audit Markdown Report
  const total = auditResults.length;
  const passed = auditResults.filter(r => r.status === 'PASS').length;
  const warned = auditResults.filter(r => r.status === 'WARN').length;
  const failed = auditResults.filter(r => r.status === 'FAIL').length;
  const passRate = Math.round((passed / total) * 100);

  const reportMd = `# Proxima SMS - Heavy-Duty Comprehensive Audit Report

**Date**: ${new Date().toISOString()}  
**Total Target Audits**: ${total}  
**Passed**: ${passed} | **Warnings**: ${warned} | **Failed**: ${failed} (**${passRate}% Pass Rate**)  

---

## Audit Execution Results

| Category | Component / Route | Type | Status | Duration | Details |
| :--- | :--- | :---: | :---: | :---: | :--- |
${auditResults.map(r => `| **${r.category}** | ${r.name} (\`${r.pathOrEndpoint}\`) | ${r.type} | ${r.status === 'PASS' ? '✅ PASS' : r.status === 'WARN' ? '⚠️ WARN' : '❌ FAIL'} | ${r.durationMs}ms | ${r.details || r.error || 'N/A'} |`).join('\n')}

---

## Detailed Failure & Warning Analysis

${auditResults.filter(r => r.status !== 'PASS').map(r => `
### ⚠️ [${r.category}] ${r.name} (${r.pathOrEndpoint})
- **Status**: ${r.status}
- **Error**: ${r.error || 'None'}
- **Console Errors**: ${r.consoleErrors.join('\n  - ') || 'None'}
- **Details**: ${r.details || 'N/A'}
`).join('\n')}
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'heavy-audit-report.md'), reportMd, 'utf-8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'heavy-audit-report.json'), JSON.stringify(auditResults, null, 2), 'utf-8');

  console.log(`\n================================================================`);
  console.log(`  HEAVY AUDIT COMPLETE: ${passed} PASS, ${warned} WARN, ${failed} FAIL (${passRate}%)`);
  console.log(`  Report generated at: ${path.join(OUTPUT_DIR, 'heavy-audit-report.md')}`);
  console.log(`================================================================\n`);
}

runHeavyDutyAudit().catch(console.error);
