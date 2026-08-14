const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'src', 'lib', 'auth-guard.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newLinks = `    fleet: { icon: 'Truck', label: 'Fleet Management', path: '/dashboard/fleet' },
    recruitment: { icon: 'Briefcase', label: 'Recruitment (ATS)', path: '/dashboard/recruitment' },
    ledger: { icon: 'BookOpen', label: 'General Ledger', path: '/dashboard/finance/ledger' },
    loans: { icon: 'CreditCard', label: 'Staff Loans', path: '/dashboard/finance/loans' },
    assets: { icon: 'Box', label: 'Asset Management', path: '/dashboard/inventory/assets' },
`;

// Insert after the start of allNavLinks
content = content.replace(
  'export const allNavLinks: Record<string, { icon: string; label: string; path: string; subLinks?: { label: string; path: string }[] }> = {',
  'export const allNavLinks: Record<string, { icon: string; label: string; path: string; subLinks?: { label: string; path: string }[] }> = {\n' + newLinks
);

// Insert into SUPER_ADMIN
content = content.replace(
  "{ group: 'Administration', links: ['manageStaff', 'manageStudents', 'roles', 'bas'] },",
  "{ group: 'Administration', links: ['manageStaff', 'manageStudents', 'roles', 'bas'] },\n      { group: 'Enterprise ERP', links: ['fleet', 'recruitment', 'ledger', 'loans', 'assets'] },"
);

// Insert into ADMIN
content = content.replace(
  "{ group: 'Management', links: ['reports', 'system', 'manageStaff', 'manageStudents', 'departments', 'bas'] },",
  "{ group: 'Management', links: ['reports', 'system', 'manageStaff', 'manageStudents', 'departments', 'bas'] },\n      { group: 'Enterprise ERP', links: ['fleet', 'recruitment', 'ledger', 'loans', 'assets'] },"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully added ERP links to sidebar config');
