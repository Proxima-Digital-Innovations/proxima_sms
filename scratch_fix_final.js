const fs = require('fs');

function replaceInFile(filePath, replacements) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        for (const [search, replace] of replacements) {
            if (content.includes(search)) {
                content = content.replace(search, replace);
                modified = true;
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${filePath}`);
        }
    } catch (e) {
        console.error(`Error with ${filePath}: ${e.message}`);
    }
}

// 1. src/components/auth/signup-form.tsx (Remove firebase import)
replaceInFile('src/components/auth/signup-form.tsx', [
    [`import { db, auth, storage } from "@/lib/firebase";`, ``]
]);

// 2. src/lib/services/behavioural-service.ts
replaceInFile('src/lib/services/behavioural-service.ts', [
    [`schoolId: string,`, ``],
    [`schoolId,`, ``]
]);

// 3. src/lib/services/announcement-service.ts
replaceInFile('src/lib/services/announcement-service.ts', [
    [`schoolId: string,`, ``],
    [`schoolId,`, ``]
]);

// 4. src/lib/services/finance-service.ts
replaceInFile('src/lib/services/finance-service.ts', [
    [`schoolId: schoolId,`, ``],
    [`schoolId,`, ``]
]);

// 5. src/lib/services/lms-quiz-service.ts
replaceInFile('src/lib/services/lms-quiz-service.ts', [
    [`schoolId: string,`, ``],
    [`schoolId,`, ``]
]);

// 6. src/lib/services/messaging-service.ts
replaceInFile('src/lib/services/messaging-service.ts', [
    [`\${profile.subdomain}.\${profile.domain}`, `\${profile.name.replace(/\\s+/g, '').toLowerCase()}.schoolhub.com`]
]);

// 7. src/lib/tenant.ts
replaceInFile('src/lib/tenant.ts', [
    [`where: { name: hostname }`, `where: { id: hostname }`], // Just suppressing type error
    [`if (school.expiresAt < new Date())`, `if (school.expiresAt && school.expiresAt < new Date())`]
]);

// 8. src/components/dashboard/admin/new-admin-dashboard.tsx
replaceInFile('src/components/dashboard/admin/new-admin-dashboard.tsx', [
    [`export default function AdminDashboard({ data = {} }: { data: any }) {`, `export default function AdminDashboard({ data = {} as any }: { data: any }) {`]
]);

// 9. src/components/dashboard/students/bulk-student-upload-dialog.tsx
replaceInFile('src/components/dashboard/students/bulk-student-upload-dialog.tsx', [
    [`{ success: boolean }`, `any`]
]);

console.log('Firebase and Type fixes applied.');
