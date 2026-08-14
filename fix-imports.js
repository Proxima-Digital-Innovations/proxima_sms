const fs = require('fs');

const files = [
    'src/actions/log-actions.ts',
    'src/actions/notification-actions.ts',
    'src/actions/school-actions.ts'
];

for (const file of files) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/import \{ requireSchoolId \} from '\.\/academic-data';/g, "import { requireSchoolId } from '@/lib/server-context';");
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
}
