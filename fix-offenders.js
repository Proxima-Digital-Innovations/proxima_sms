const fs = require('fs');

const files = [
'src/app/[school]/dashboard/accountant/expenses/page.tsx',
'src/app/[school]/dashboard/accountant/fees/page.tsx',
'src/app/[school]/dashboard/accountant/invoices/page.tsx',
'src/app/[school]/dashboard/accountant/invoices/[invoiceId]/page.tsx',
'src/app/[school]/dashboard/accountant/payments/page.tsx',
'src/app/[school]/dashboard/accountant/payroll/page.tsx',
'src/app/[school]/dashboard/accountant/receipts/[paymentId]/page.tsx',
'src/app/[school]/dashboard/announcements/page.tsx',
'src/app/[school]/dashboard/announcements/[id]/page.tsx',
'src/app/[school]/dashboard/db/page.tsx',
'src/app/[school]/dashboard/departments/page.tsx',
'src/app/[school]/dashboard/exam-questions/page.tsx',
'src/app/[school]/dashboard/exam-questions/[...slug]/page.tsx',
'src/app/[school]/dashboard/hod/analytics/page.tsx',
'src/app/[school]/dashboard/invoices/[invoiceId]/page.tsx',
'src/app/[school]/dashboard/receipts/[paymentId]/page.tsx',
'src/app/[school]/dashboard/results/print/page.tsx',
'src/app/[school]/dashboard/results/report/[reportId]/page.tsx',
'src/app/[school]/dashboard/slt/assignments.tsx',
'src/app/[school]/dashboard/system/ai-settings/page.tsx',
'src/app/[school]/dashboard/teacher/attendance/page.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log("File not found:", file);
        continue;
    }
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace import
    content = content.replace(/import\s*\{\s*dbService\s*\}\s*from\s*['"]@\/lib\/dbService['"];?/g, "import { getDocAction, getDocsAction, setDocAction, addDocAction, updateDocAction, deleteDocAction, getCountFromServerAction } from '@/actions/db-actions';");
    
    // Replace method calls
    content = content.replace(/dbService\.getDocs/g, 'getDocsAction');
    content = content.replace(/dbService\.getDoc/g, 'getDocAction');
    content = content.replace(/dbService\.setDoc/g, 'setDocAction');
    content = content.replace(/dbService\.addDoc/g, 'addDocAction');
    content = content.replace(/dbService\.updateDoc/g, 'updateDocAction');
    content = content.replace(/dbService\.deleteDoc/g, 'deleteDocAction');
    content = content.replace(/dbService\.getCountFromServer/g, 'getCountFromServerAction');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed", file);
}
