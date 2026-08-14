const fs = require('fs');
const path = require('path');

const schemaPath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `

// --- 1. FLEET & TRANSPORT MANAGEMENT ---
model Vehicle {
  id              String       @id @default(uuid())
  registrationNo  String       @unique
  make            String
  model           String
  year            Int
  capacity        Int
  status          String       @default("ACTIVE") // ACTIVE, MAINTENANCE, OUT_OF_SERVICE
  
  dispatches      VehicleDispatch[]
  fuelLogs        FuelLog[]
  routes          TransportRoute[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model TransportRoute {
  id              String       @id @default(uuid())
  name            String
  description     String?
  vehicleId       String?
  driverId        String?
  
  vehicle         Vehicle?     @relation(fields: [vehicleId], references: [id])
  driver          User?        @relation("DriverRoutes", fields: [driverId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model VehicleDispatch {
  id              String       @id @default(uuid())
  vehicleId       String
  driverId        String
  destination     String
  purpose         String
  departureTime   DateTime
  returnTime      DateTime?
  status          String       @default("OUTBOUND") // OUTBOUND, RETURNED
  
  vehicle         Vehicle      @relation(fields: [vehicleId], references: [id])
  driver          User         @relation("DriverDispatches", fields: [driverId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model FuelLog {
  id              String       @id @default(uuid())
  vehicleId       String
  date            DateTime     @default(now())
  liters          Float
  costPerLiter    Float
  totalCost       Float
  loggedById      String
  
  vehicle         Vehicle      @relation(fields: [vehicleId], references: [id])
  loggedBy        User         @relation("FuelLogsRecorded", fields: [loggedById], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// --- 2. RECRUITMENT & ATS ---
model JobPosting {
  id              String       @id @default(uuid())
  title           String
  departmentId    String
  description     String       @db.Text
  requirements    String       @db.Text
  status          String       @default("OPEN") // OPEN, CLOSED, DRAFT
  deadline        DateTime
  
  department      Department   @relation(fields: [departmentId], references: [id])
  applications    JobApplication[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model JobApplication {
  id              String       @id @default(uuid())
  jobId           String
  firstName       String
  lastName        String
  email           String
  phone           String
  resumeUrl       String?
  coverLetter     String?      @db.Text
  status          String       @default("PENDING") // PENDING, REVIEWING, INTERVIEW, HIRED, REJECTED
  
  job             JobPosting   @relation(fields: [jobId], references: [id])
  interviews      Interview[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Interview {
  id              String       @id @default(uuid())
  applicationId   String
  interviewerId   String
  scheduledAt     DateTime
  location        String
  notes           String?      @db.Text
  result          String?      // PASSED, FAILED
  
  application     JobApplication @relation(fields: [applicationId], references: [id])
  interviewer     User           @relation("InterviewsConducted", fields: [interviewerId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// --- 3. ADVANCED PAYROLL (LOANS & ADVANCES) ---
model StaffLoan {
  id              String       @id @default(uuid())
  userId          String
  amount          Float
  reason          String?
  monthlyDeduction Float
  remainingBalance Float
  status          String       @default("PENDING") // PENDING, APPROVED, REJECTED, COMPLETED
  approvedById    String?
  
  user            User         @relation("StaffLoans", fields: [userId], references: [id])
  approvedBy      User?        @relation("LoansApproved", fields: [approvedById], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model PayrollAllowance {
  id              String       @id @default(uuid())
  userId          String
  type            String       // HOUSING, TRANSPORT, BONUS
  amount          Float
  isRecurring     Boolean      @default(true)
  
  user            User         @relation("StaffAllowances", fields: [userId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// --- 4. GENERAL LEDGER ACCOUNTING ---
model AccountCategory {
  id              String       @id @default(uuid())
  name            String       @unique // Asset, Liability, Equity, Revenue, Expense
  description     String?
  
  accounts        AccountCode[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model AccountCode {
  id              String       @id @default(uuid())
  code            String       @unique // e.g. 1000, 2000
  name            String
  categoryId      String
  balance         Float        @default(0.0)
  
  category        AccountCategory @relation(fields: [categoryId], references: [id])
  journalLines    JournalLine[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model JournalEntry {
  id              String       @id @default(uuid())
  reference       String       @unique
  date            DateTime
  description     String
  recordedById    String
  
  recordedBy      User         @relation("JournalEntriesRecorded", fields: [recordedById], references: [id])
  lines           JournalLine[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model JournalLine {
  id              String       @id @default(uuid())
  entryId         String
  accountId       String
  debit           Float        @default(0.0)
  credit          Float        @default(0.0)
  description     String?
  
  entry           JournalEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  account         AccountCode  @relation(fields: [accountId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model BusinessPartner {
  id              String       @id @default(uuid())
  name            String
  type            String       // VENDOR, CUSTOMER
  contactEmail    String?
  contactPhone    String?
  balance         Float        @default(0.0)
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

// --- 5. ASSET MANAGEMENT ---
model AssetCategory {
  id              String       @id @default(uuid())
  name            String       @unique
  depreciationRate Float       @default(0.0) // percentage per year
  
  assets          Asset[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model Asset {
  id              String       @id @default(uuid())
  tagNumber       String       @unique
  name            String
  categoryId      String
  purchaseDate    DateTime
  purchasePrice   Float
  currentValue    Float
  status          String       @default("AVAILABLE") // AVAILABLE, ASSIGNED, MAINTENANCE, RETIRED
  
  category        AssetCategory @relation(fields: [categoryId], references: [id])
  assignments     AssetAssignment[]
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

model AssetAssignment {
  id              String       @id @default(uuid())
  assetId         String
  userId          String
  assignedDate    DateTime     @default(now())
  returnedDate    DateTime?
  condition       String?      // GOOD, FAIR, POOR
  
  asset           Asset        @relation(fields: [assetId], references: [id])
  user            User         @relation("AssetsAssigned", fields: [userId], references: [id])
  
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

`;

// Fix SQLite incompatibilities immediately
let safeModels = newModels.replace(/@db\.Text/g, '');

if (!schema.includes('model Vehicle {')) {
  schema += safeModels;
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('Appended 5 Killer Modules to schema.prisma');
} else {
  console.log('Modules already exist in schema.prisma');
}
