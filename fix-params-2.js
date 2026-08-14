const fs = require('fs');

const files = [
'src/app/dashboard/analytics/page.tsx',
'src/app/dashboard/behavioural/page.tsx',
'src/app/dashboard/inventory/page.tsx',
'src/app/dashboard/messaging/compose/page.tsx',
'src/app/dashboard/messaging/page.tsx',
'src/app/dashboard/students/page.tsx',
'src/app/dashboard/students/[id]/page.tsx',
'src/app/dashboard/users/[id]/page.tsx',
'src/app/dashboard/website/page.tsx',
'src/app/layout.tsx',
'src/app/login/page.tsx',
'src/app/page.tsx'
];

for (const file of files) {
    if (!fs.existsSync(file)) {
        console.log("Not found:", file);
        continue;
    }
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace const { school: schoolSlug } = await params; with nothing
    content = content.replace(/const\s+\{\s*school\s*:\s*schoolSlug\s*\}\s*=\s*await\s+params\s*;/g, '');
    content = content.replace(/const\s+\{\s*school\s*:\s*schoolSlug\s*\}\s*=\s*params\s*;/g, '');
    
    // Replace where: { subdomain: schoolSlug } or similar in findUnique
    content = content.replace(/findUnique\(\{\s*where:\s*\{\s*subdomain:\s*schoolSlug\s*\}\s*\}\)/g, 'findFirst()');
    content = content.replace(/findUnique\(\{\s*where:\s*\{\s*slug:\s*schoolSlug\s*\}\s*\}\)/g, 'findFirst()');
    
    // Layout file OR query replacement
    content = content.replace(/where:\s*\{\s*OR:\s*\[\s*\{\s*subdomain:\s*schoolSlug\s*\},\s*\{\s*slug:\s*schoolSlug\s*\}\s*\]\s*\}/g, '');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed", file);
}
