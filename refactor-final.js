const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

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
  /model Subject \{\n\s*id String @id @default\(cuid\(\)\)\n\n\s*name\s+String\n\s*createdAt DateTime @default\(now\(\)\)\n/m,
  `model Subject {\n  id String @id @default(cuid())\n\n  name      String\n  departmentId String?\n  department   Department? @relation(fields: [departmentId], references: [id])\n  createdAt DateTime @default(now())\n`
);

// 5. Add subjects to Department
content = content.replace(
  /model Department \{[\s\S]*?createdAt DateTime @default\(now\(\)\)\n\s*users\s+User\[\]\n/m,
  `$&  subjects  Subject[]\n`
);

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Schema refactored perfectly!');
