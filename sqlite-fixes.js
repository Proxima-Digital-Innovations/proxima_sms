const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Replace all Enums with Strings
content = content.replace(/role\s+Role\s+@default\(TEACHER\)/g, 'role         String   @default("TEACHER")');
content = content.replace(/type\s+TransactionType/g, 'type         String');
content = content.replace(/category\s+ExpenseCategory/g, 'category     String');
content = content.replace(/status\s+IncidentStatus\s+@default\(REPORTED\)/g, 'status       String   @default("REPORTED")');
content = content.replace(/status\s+LeaveStatus\s+@default\(PENDING\)/g, 'status       String   @default("PENDING")');

// Replace any leftover Enums usages
content = content.replace(/Role/g, 'String');
content = content.replace(/TransactionType/g, 'String');
content = content.replace(/ExpenseCategory/g, 'String');
content = content.replace(/IncidentStatus/g, 'String');
content = content.replace(/LeaveStatus/g, 'String');
content = content.replace(/LicenseStatus/g, 'String');
content = content.replace(/LicenseType/g, 'String');

// Remove enum definitions
content = content.replace(/enum \w+ \{[\s\S]*?\}/g, '');

// Replace Json with String
content = content.replace(/Json\?/g, 'String?');
content = content.replace(/Json/g, 'String');

fs.writeFileSync('prisma/schema.prisma', content);
console.log('SQLite compatibility fixes applied.');
