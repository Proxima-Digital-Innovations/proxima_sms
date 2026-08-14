const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Replace School model with SystemProfile
const schoolRegex = /\/\/ --- SAAS CORE: Multi-Tenancy & Licensing ---\s*model School \{[\s\S]*?(?=\n\/\/ --- CORE: Users & Identity ---)/;
const systemProfile = `// --- SYSTEM SETTINGS ---
model SystemProfile {
  id             String   @id @default(cuid())
  name           String
  address        String?
  phone          String?
  email          String?
  logoUrl        String?
  faviconUrl     String?
  primaryColor   String   @default("#0f172a")
  secondaryColor String   @default("#10b981")
  loginBgUrl     String?
  licenseStatus  String   @default("ACTIVE")
  expiresAt      DateTime?
  gradingScale   String?
  aiConfig       String?
  maintenanceMode Boolean @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
`;
content = content.replace(schoolRegex, systemProfile);

// 2. Remove all schoolId fields and relations
content = content.replace(/^\s*schoolId\s+String.*\n/gm, '');
content = content.replace(/^\s*school\s+School\s+@relation.*\n/gm, '');

// 3. Fix @@unique containing schoolId
content = content.replace(/@@unique\(\[\s*schoolId\s*,\s*/g, '@@unique([');
content = content.replace(/,\s*schoolId\s*\]\)/g, '])');
content = content.replace(/^\s*@@unique\(\[\s*schoolId\s*\]\)\s*\n/gm, '');

// 4. Add departmentId to Subject
content = content.replace(
  /model Subject \{\n\s*id String @id @default\(cuid\(\)\)\n\n\s*name      String\n\s*createdAt DateTime @default\(now\(\)\)\n/m,
  `model Subject {\n  id String @id @default(cuid())\n\n  name      String\n  departmentId String?\n  department   Department? @relation(fields: [departmentId], references: [id])\n  createdAt DateTime @default(now())\n`
);

// 5. Add subjects to Department
content = content.replace(
  /model Department \{[\s\S]*?createdAt DateTime @default\(now\(\)\)\n\s*users\s+User\[\]\n/m,
  `$&  subjects  Subject[]\n`
);

// 6. SQLite fixes
content = content.replace(/role\s+Role\s+@default\(TEACHER\)/g, 'role         String   @default("TEACHER")');
content = content.replace(/type\s+TransactionType/g, 'type         String');
content = content.replace(/category\s+ExpenseCategory/g, 'category     String');
content = content.replace(/status\s+IncidentStatus\s+@default\(REPORTED\)/g, 'status       String   @default("REPORTED")');
content = content.replace(/status\s+LeaveStatus\s+@default\(PENDING\)/g, 'status       String   @default("PENDING")');

content = content.replace(/Role/g, 'String');
content = content.replace(/TransactionType/g, 'String');
content = content.replace(/ExpenseCategory/g, 'String');
content = content.replace(/IncidentStatus/g, 'String');
content = content.replace(/LeaveStatus/g, 'String');
content = content.replace(/LicenseStatus/g, 'String');
content = content.replace(/LicenseType/g, 'String');

content = content.replace(/enum \w+ \{[\s\S]*?\}/g, '');
content = content.replace(/Json\?/g, 'String?');
content = content.replace(/Json/g, 'String');

content = content.replace(
  /datasource db \{\n  provider = "postgresql"\n  url      = env\("DATABASE_URL"\)\n\}/,
  `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}`
);

// 7. Missing fields
content = content.replace(
  /staffId      String\?     @unique\n/,
  `staffId      String?     @unique\n  username     String?     @unique\n`
);

content = content.replace(
  /model TermGrade \{[\s\S]*?score\s+Float\n/,
  `$&  status       String   @default("PENDING")\n`
);

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Done!');
