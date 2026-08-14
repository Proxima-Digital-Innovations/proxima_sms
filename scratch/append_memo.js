const fs = require('fs');
const path = require('path');

const schemaPath = path.join('c:', 'projects', 'School-hub', 'schoolsystem', 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `

// --- ALBABELLO ARCHITECTURE: MEMOS & COMMUNICATIONS ---

model Memo {
  id          String       @id @default(uuid())
  reference   String       @unique
  title       String
  body        String       @db.Text
  raisedById  String
  raisedForId String
  dateRaised  DateTime     @default(now())
  status      MemoStatus   @default(OPEN)
  readStatus  ReadStatus   @default(NOT_SEEN)
  type        MemoType     @default(MEMO)
  
  raisedBy    User         @relation("MemoRaisedBy", fields: [raisedById], references: [id], onDelete: Cascade)
  raisedFor   User         @relation("MemoRaisedFor", fields: [raisedForId], references: [id], onDelete: Cascade)
  
  minutes         MemoMinute[]
  paymentProcesses PaymentProcess[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model MemoMinute {
  id              String          @id @default(uuid())
  memoId          String
  body            String          @db.Text
  flag            MinuteFlag
  fromUserId      String
  toUserId        String
  confidentiality Confidentiality @default(NOT_CONFIDENTIAL)
  status          ReadStatus      @default(NOT_SEEN)
  
  memo            Memo            @relation(fields: [memoId], references: [id], onDelete: Cascade)
  fromUser        User            @relation("MinuteFromUser", fields: [fromUserId], references: [id], onDelete: Cascade)
  toUser          User            @relation("MinuteToUser", fields: [toUserId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model PaymentProcess {
  id              String    @id @default(uuid())
  memoId          String
  accountDebited  String?
  accountCredited String?
  amount          Float?
  beneficiaryType String?
  beneficiary     String?   @db.Text
  narration       String?   @db.Text
  
  memo            Memo      @relation(fields: [memoId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum MemoStatus {
  OPEN
  ARCHIVED
  CLOSED
  COMPLETED
}

enum ReadStatus {
  NOT_SEEN
  SEEN
  READ
}

enum MemoType {
  MEMO
  FORM
  VEHICLE
}

enum MinuteFlag {
  POSITIVE
  NEGATIVE
}

enum Confidentiality {
  CONFIDENTIAL
  NOT_CONFIDENTIAL
}
`;

// Append models to schema if they don't exist
if (!schema.includes('model Memo {')) {
  // We also need to add the relation fields to User. 
  // Let's add them using string replacement on the User model.
  schema += newModels;
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('Appended Memo models to schema.prisma');
} else {
  console.log('Memo models already exist in schema.prisma');
}
