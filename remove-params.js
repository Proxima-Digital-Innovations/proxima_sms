const fs = require('fs');

const files = [
'src/app/dashboard/accountant/invoices/[invoiceId]/page.tsx',
'src/app/dashboard/accountant/receipts/[paymentId]/page.tsx',
'src/app/dashboard/announcements/[id]/page.tsx',
'src/app/dashboard/exam-questions/[...slug]/page.tsx',
'src/app/dashboard/invoices/[invoiceId]/page.tsx',
'src/app/dashboard/lesson-notes/page.tsx',
'src/app/dashboard/lesson-notes/[id]/page.tsx',
'src/app/dashboard/receipts/[paymentId]/page.tsx',
'src/app/dashboard/results/report/[reportId]/page.tsx',
'src/app/dashboard/results/view/[classId]/page.tsx',
'src/app/dashboard/users/page.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log("Not found:", file);
        continue;
    }
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove const params = useParams(); if it's no longer needed, or just remove params.school
    // Usually they do: const schoolSlug = params.school;
    content = content.replace(/const schoolSlug = params\.school( as string)?;/g, '');
    
    // Some might do: <Link href={`/${params.school}/dashboard`}>
    // We should replace `/${params.school}` with ``
    content = content.replace(/\/\$\{params\.school\}/g, '');
    content = content.replace(/\/\$\{schoolSlug\}/g, '');

    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed", file);
}
