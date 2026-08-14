const fs = require('fs');

let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add fields to SystemProfile
content = content.replace(
  /loginBgUrl     String\?\n  createdAt      DateTime @default\(now\(\)\)/,
  `loginBgUrl     String?\n  licenseStatus  String   @default("ACTIVE")\n  expiresAt      DateTime?\n  gradingScale   String?\n  aiConfig       String?\n  maintenanceMode Boolean @default(false)\n  createdAt      DateTime @default(now())`
);

// 2. Add departmentId to Subject
content = content.replace(
  /model Subject \{\n\s*id String @id @default\(cuid\(\)\)\n\n\s*name      String\n\s*createdAt DateTime @default\(now\(\)\)/,
  `model Subject {\n  id String @id @default(cuid())\n\n  name      String\n  departmentId String?\n  department   Department? @relation(fields: [departmentId], references: [id])\n  createdAt DateTime @default(now())`
);

// 3. Add subjects to Department
content = content.replace(
  /model Department \{[\s\S]*?users     User\[\]\n\n\s*@@unique/m,
  (match) => match.replace('users     User[]', 'users     User[]\n  subjects  Subject[]')
);

// 4. Change provider to sqlite
content = content.replace(
  /datasource db \{\n  provider = "postgresql"\n  url      = env\("DATABASE_URL"\)\n\}/,
  `datasource db {\n  provider = "sqlite"\n  url      = "file:./dev.db"\n}`
);


fs.writeFileSync('prisma/schema.prisma', content);
console.log('Final Schema Tweaks Applied.');
