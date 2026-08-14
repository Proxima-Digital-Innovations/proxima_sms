const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

if (!schemaContent.includes('model SystemLicense')) {
  schemaContent += `

model SystemLicense {
  id              String   @id @default(cuid())
  licenseKey      String   // The base64 payload + signature
  schoolName      String
  tier            String   @default("BASIC") // BASIC, PREMIUM, ENTERPRISE
  expiresAt       DateTime
  maxStudents     Int      @default(500)
  status          String   @default("ACTIVE") // ACTIVE, EXPIRED, SUSPENDED
  lastValidatedAt DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
`;
  fs.writeFileSync(schemaPath, schemaContent);
  console.log("SystemLicense model added to schema.prisma");
} else {
  console.log("SystemLicense already exists");
}
