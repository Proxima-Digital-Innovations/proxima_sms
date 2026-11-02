const crypto = require('crypto');
const argon2 = require('argon2');
const fs = require('fs');

async function gen() {
  const password = 'password123';
  const hashed = await argon2.hash(password);

  const fileContent = fs.readFileSync('scripts/issue-license.js', 'utf8');
  const privateKeyMatch = fileContent.match(/const PRIVATE_KEY = `([\s\S]*?)`;/);
  const PRIVATE_KEY = privateKeyMatch[1];

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const payload = {
    schoolName: 'Proxima International Academy',
    maxStudents: 3000,
    tier: 'ENTERPRISE',
    billingFrequency: 'PER_SESSION',
    discountPercent: 10,
    expiresAt: expiryDate.toISOString(),
    issuedAt: new Date().toISOString()
  };

  const payloadString = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadString, 'utf8').toString('base64');
  const signer = crypto.createSign('SHA256');
  signer.update(payloadString);
  signer.end();
  const signature = signer.sign(PRIVATE_KEY, 'base64');
  const key = `${base64Payload}.${signature}`;

  const expSql = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

  let sql = '-- Proxima SMS Initial Seed Data\n';
  sql += 'SET FOREIGN_KEY_CHECKS=0;\n\n';

  // SystemProfile
  sql += "INSERT INTO `SystemProfile` (`id`, `name`, `primaryColor`, `secondaryColor`, `licenseStatus`, `createdAt`, `updatedAt`) VALUES ('default-system-profile', 'Proxima Academy', '#1e40af', '#10b981', 'ACTIVE', NOW(), NOW()) ON DUPLICATE KEY UPDATE `name`='Proxima Academy';\n\n";

  // Super Admin Users
  sql += `INSERT INTO \`User\` (\`id\`, \`firstName\`, \`lastName\`, \`email\`, \`passwordHash\`, \`isSuperAdmin\`, \`role\`, \`status\`, \`createdAt\`, \`updatedAt\`) VALUES ('usr-admin-01', 'System', 'Admin', 'admin@proximahub.com', '${hashed}', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE \`isSuperAdmin\`=1;\n`;

  sql += `INSERT INTO \`User\` (\`id\`, \`firstName\`, \`lastName\`, \`email\`, \`passwordHash\`, \`isSuperAdmin\`, \`role\`, \`status\`, \`createdAt\`, \`updatedAt\`) VALUES ('usr-abdulhamid-01', 'Abdulhamid', 'Amin', 'abdulhamidamin@gmail.com', '${hashed}', 1, 'ADMIN', 'active', NOW(), NOW()) ON DUPLICATE KEY UPDATE \`isSuperAdmin\`=1;\n\n`;

  // Departments (id, name, createdAt)
  sql += "INSERT INTO `Department` (`id`, `name`, `createdAt`) VALUES ('dept-science', 'Science', NOW()) ON DUPLICATE KEY UPDATE `name`='Science';\n";
  sql += "INSERT INTO `Department` (`id`, `name`, `createdAt`) VALUES ('dept-arts', 'Arts', NOW()) ON DUPLICATE KEY UPDATE `name`='Arts';\n\n";

  // Academic Session (id, name, startDate, endDate, isActive, createdAt)
  sql += "INSERT INTO `AcademicSession` (`id`, `name`, `startDate`, `endDate`, `isActive`, `createdAt`) VALUES ('sess-2024-2025', '2024/2025', '2024-09-01 00:00:00', '2025-07-31 00:00:00', 1, NOW()) ON DUPLICATE KEY UPDATE `isActive`=1;\n\n";

  // Term (id, name, sessionId, startDate, endDate, isActive)
  sql += "INSERT INTO `Term` (`id`, `name`, `sessionId`, `startDate`, `endDate`, `isActive`) VALUES ('term-1', 'Term 1', 'sess-2024-2025', '2024-09-01 00:00:00', '2024-12-20 00:00:00', 1) ON DUPLICATE KEY UPDATE `isActive`=1;\n\n";

  // Class (id, name, termId, createdAt)
  sql += "INSERT INTO `Class` (`id`, `name`, `termId`, `createdAt`) VALUES ('cls-grade-10', 'Grade 10', 'term-1', NOW()) ON DUPLICATE KEY UPDATE `name`='Grade 10';\n\n";

  // System License
  sql += 'DELETE FROM `SystemLicense`;\n';
  sql += `INSERT INTO \`SystemLicense\` (\`id\`, \`licenseKey\`, \`schoolName\`, \`tier\`, \`billingFrequency\`, \`discountPercent\`, \`expiresAt\`, \`maxStudents\`, \`status\`, \`lastValidatedAt\`, \`createdAt\`, \`updatedAt\`) VALUES ('lic-proxima-ent', '${key}', 'Proxima International Academy', 'ENTERPRISE', 'PER_SESSION', 10, '${expSql}', 3000, 'ACTIVE', NOW(), NOW(), NOW());\n\n`;

  sql += 'SET FOREIGN_KEY_CHECKS=1;\n';

  fs.writeFileSync('seed.sql', sql, 'utf8');
  console.log('seed.sql generated successfully with exact schema columns.');
}

gen().catch(console.error);
