const fs = require('fs');
const path = require('path');

const schemaPath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Find the end of the User model and add the named relations
const userModelEnd = schema.indexOf('}', schema.indexOf('model User {'));
const userRelations = `
  routesAsDriver  TransportRoute[] @relation("DriverRoutes")
  dispatches      VehicleDispatch[] @relation("DriverDispatches")
  fuelLogs        FuelLog[]        @relation("FuelLogsRecorded")
  interviews      Interview[]      @relation("InterviewsConducted")
  loans           StaffLoan[]      @relation("StaffLoans")
  approvedLoans   StaffLoan[]      @relation("LoansApproved")
  allowances      PayrollAllowance[] @relation("StaffAllowances")
  journalEntries  JournalEntry[]   @relation("JournalEntriesRecorded")
  assetAssignments AssetAssignment[] @relation("AssetsAssigned")
`;

schema = schema.slice(0, userModelEnd) + userRelations + schema.slice(userModelEnd);

// Find the end of the Department model
const deptModelEnd = schema.indexOf('}', schema.indexOf('model Department {'));
const deptRelations = `
  jobPostings     JobPosting[]
`;

schema = schema.slice(0, deptModelEnd) + deptRelations + schema.slice(deptModelEnd);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('Fixed User and Department model relations');
