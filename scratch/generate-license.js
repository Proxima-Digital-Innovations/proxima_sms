const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateLicense(schoolName, maxStudents, expiresAt, tier) {
  const privateKeyPath = path.join(__dirname, 'private.key');
  
  if (!fs.existsSync(privateKeyPath)) {
    console.error("private.key not found! Run generate_keys.js first.");
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  const payload = {
    schoolName,
    maxStudents,
    expiresAt: new Date(expiresAt).toISOString(),
    tier,
    issuedAt: new Date().toISOString()
  };

  const payloadString = JSON.stringify(payload);
  
  const sign = crypto.createSign('SHA256');
  sign.update(payloadString);
  sign.end();
  
  const signature = sign.sign(privateKey, 'base64');
  
  // Format: Base64(payload).Signature
  const base64Payload = Buffer.from(payloadString).toString('base64');
  const licenseKey = `${base64Payload}.${signature}`;

  console.log("\n=============================================");
  console.log("             LICENSE GENERATED");
  console.log("=============================================\n");
  console.log(`School: ${schoolName}`);
  console.log(`Tier: ${tier}`);
  console.log(`Max Students: ${maxStudents}`);
  console.log(`Expires: ${expiresAt}\n`);
  console.log("LICENSE KEY:");
  console.log(licenseKey);
  console.log("\n=============================================\n");
}

// Simple CLI parsing
const args = process.argv.slice(2);
if (args.length < 4) {
  console.log("Usage: node generate-license.js <SchoolName> <MaxStudents> <ExpiresAt YYYY-MM-DD> <Tier>");
  console.log("Example: node generate-license.js 'Demo School' 500 '2027-01-01' PREMIUM");
  process.exit(1);
}

generateLicense(args[0], parseInt(args[1]), args[2], args[3]);
