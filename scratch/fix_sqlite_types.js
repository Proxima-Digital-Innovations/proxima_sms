const fs = require('fs');
const path = require('path');

const schemaPath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Remove the ENUM definitions added earlier
schema = schema.replace(/enum MemoStatus \{[\s\S]*?\}/, '');
schema = schema.replace(/enum ReadStatus \{[\s\S]*?\}/, '');
schema = schema.replace(/enum MemoType \{[\s\S]*?\}/, '');
schema = schema.replace(/enum MinuteFlag \{[\s\S]*?\}/, '');
schema = schema.replace(/enum Confidentiality \{[\s\S]*?\}/, '');

// Replace enum usages with String, and @db.Text with nothing
schema = schema.replace(/MemoStatus\s+@default\(OPEN\)/, 'String @default("OPEN")');
schema = schema.replace(/ReadStatus\s+@default\(NOT_SEEN\)/g, 'String @default("NOT_SEEN")');
schema = schema.replace(/MemoType\s+@default\(MEMO\)/, 'String @default("MEMO")');
schema = schema.replace(/MinuteFlag/, 'String');
schema = schema.replace(/Confidentiality\s+@default\(NOT_CONFIDENTIAL\)/, 'String @default("NOT_CONFIDENTIAL")');
schema = schema.replace(/@db\.Text/g, '');

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Fixed SQLite unsupported types in schema.prisma');
