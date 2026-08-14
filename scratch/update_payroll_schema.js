const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('baseSalary')) {
    schema = schema.replace(
        /model User \{([\s\S]*?)id String @id @default\(cuid\(\)\)([\s\S]*?)failedLoginAttempts/m,
        `model User {$1id String @id @default(cuid())$2  baseSalary Float @default(0)\n  failedLoginAttempts`
    );
}

if (!schema.includes('baseAmount')) {
    schema = schema.replace(
        /model Payroll \{([\s\S]*?)amount Float/m,
        `model Payroll {$1baseAmount Float @default(0)\n    deductions Float @default(0)\n    bonuses Float @default(0)\n    netAmount Float @default(0)\n    basReport String?`
    );
    // Remove the old 'amount Float' line
    schema = schema.replace(/amount Float\r?\n/, '');
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema updated successfully.');
