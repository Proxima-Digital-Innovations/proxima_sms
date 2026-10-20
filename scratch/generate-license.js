const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function parseArgs(args) {
  const options = {
    schoolName: '',
    maxStudents: 500,
    tier: 'PREMIUM',
    frequency: 'PER_TERM',
    discountPercent: 0,
    termName: 'First Term',
    sessionName: '2024/2025',
    expiresAt: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--school' && args[i + 1]) options.schoolName = args[++i];
    else if (arg === '--students' && args[i + 1]) options.maxStudents = parseInt(args[++i], 10);
    else if (arg === '--tier' && args[i + 1]) options.tier = args[++i].toUpperCase();
    else if (arg === '--frequency' && args[i + 1]) {
      const f = args[++i].toLowerCase();
      options.frequency = (f === 'annual' || f === 'session' || f === 'per_session') ? 'PER_SESSION' : 'PER_TERM';
    }
    else if (arg === '--discount' && args[i + 1]) options.discountPercent = parseFloat(args[++i]);
    else if (arg === '--term' && args[i + 1]) options.termName = args[++i];
    else if (arg === '--session' && args[i + 1]) options.sessionName = args[++i];
    else if (arg === '--expires' && args[i + 1]) options.expiresAt = args[++i];
    else if (!arg.startsWith('--') && !options.schoolName) {
      // Positional backwards compatibility: <SchoolName> <MaxStudents> <ExpiresAt> <Tier>
      options.schoolName = arg;
      if (args[i + 1] && !args[i + 1].startsWith('--')) options.maxStudents = parseInt(args[++i], 10);
      if (args[i + 1] && !args[i + 1].startsWith('--')) options.expiresAt = args[++i];
      if (args[i + 1] && !args[i + 1].startsWith('--')) options.tier = args[++i].toUpperCase();
    }
  }

  return options;
}

function generateLicense(opts) {
  const privateKeyPath = path.join(__dirname, 'private.key');

  if (!fs.existsSync(privateKeyPath)) {
    console.error("private.key not found! Run generate_keys.js first.");
    process.exit(1);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // Compute expiration if not explicitly passed
  let resolvedExpiry = opts.expiresAt;
  if (!resolvedExpiry) {
    const now = new Date();
    if (opts.frequency === 'PER_SESSION') {
      // 12 months + 4 weeks summer break leeway
      const expDate = new Date(now.getTime() + 395 * 24 * 60 * 60 * 1000);
      resolvedExpiry = expDate.toISOString().split('T')[0];
    } else {
      // Per term: 4 months + 3 weeks holiday grace buffer
      const expDate = new Date(now.getTime() + 130 * 24 * 60 * 60 * 1000);
      resolvedExpiry = expDate.toISOString().split('T')[0];
    }
  }

  // Grace buffer calculation
  const graceBufferLimit = Math.floor(opts.maxStudents * 1.15);

  const payload = {
    schoolName: opts.schoolName,
    maxStudents: opts.maxStudents,
    graceBufferLimit,
    graceBufferPercent: 15,
    tier: opts.tier,
    billingFrequency: opts.frequency,
    discountPercent: opts.discountPercent,
    termName: opts.termName,
    sessionName: opts.sessionName,
    expiresAt: new Date(resolvedExpiry).toISOString(),
    issuedAt: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(payload);

  const sign = crypto.createSign('SHA256');
  sign.update(payloadString);
  sign.end();

  const signature = sign.sign(privateKey, 'base64');

  // Format: Base64(payload).Signature
  const base64Payload = Buffer.from(payloadString).toString('base64');
  const licenseKey = `${base64Payload}.${signature}`;

  console.log("\n=============================================================");
  console.log("             PROXIMA SMS ENTERPRISE LICENSE GENERATOR       ");
  console.log("=============================================================\n");
  console.log(`School:              ${opts.schoolName}`);
  console.log(`Tier:                ${opts.tier}`);
  console.log(`Payment Frequency:   ${opts.frequency === 'PER_SESSION' ? 'Per Session (Annual)' : 'Per Term (Termly)'}`);
  if (opts.discountPercent > 0) {
    console.log(`Upfront Discount:    ${opts.discountPercent}% Applied`);
  }
  console.log(`Licensed Capacity:   ${opts.maxStudents} Students`);
  console.log(`Grace Buffer (+15%): Up to ${graceBufferLimit} Students (Soft Cap)`);
  console.log(`Term / Session:      ${opts.termName} (${opts.sessionName})`);
  console.log(`Validity Ends:       ${resolvedExpiry} (Includes Holiday Leeway)\n`);
  console.log("LICENSE KEY:");
  console.log(licenseKey);
  console.log("\n=============================================================\n");

  return { licenseKey, payload };
}

// Execution
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
Usage:
  node generate-license.js --school "School Name" [options]

Options:
  --school <name>        Name of school (required)
  --students <count>     Active student capacity (default: 500)
  --tier <tier>          BASIC | PREMIUM | ENTERPRISE (default: PREMIUM)
  --frequency <freq>     termly | annual (default: termly)
  --discount <percent>   Upfront discount % for annual payment (e.g. 7)
  --term <termName>      Target term (default: "First Term")
  --session <session>    Target session (default: "2024/2025")
  --expires <YYYY-MM-DD> Explicit expiry date (overrides auto-calculation)

Examples:
  node generate-license.js --school "Apex Academy" --students 200 --frequency termly --term "Term 1"
  node generate-license.js --school "Apex Academy" --students 500 --frequency annual --discount 7.5
`);
    process.exit(1);
  }

  const opts = parseArgs(args);
  if (!opts.schoolName) {
    console.error("Error: School name is required. Use --school 'School Name'");
    process.exit(1);
  }

  generateLicense(opts);
}

module.exports = { generateLicense };
