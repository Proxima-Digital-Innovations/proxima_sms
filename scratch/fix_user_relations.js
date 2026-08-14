const fs = require('fs');
const path = require('path');

const schemaPath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Remove the bad auto-added fields
schema = schema.replace(/Memo\s+Memo\[\]/g, '');
schema = schema.replace(/MemoMinute\s+MemoMinute\[\]/g, '');

// Find the end of the User model and add the named relations
const userModelEnd = schema.indexOf('}', schema.indexOf('model User {'));
const userRelations = `
  raisedMemos     Memo[]       @relation("MemoRaisedBy")
  receivedMemos   Memo[]       @relation("MemoRaisedFor")
  sentMinutes     MemoMinute[] @relation("MinuteFromUser")
  receivedMinutes MemoMinute[] @relation("MinuteToUser")
`;

schema = schema.slice(0, userModelEnd) + userRelations + schema.slice(userModelEnd);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Fixed User model relations');
