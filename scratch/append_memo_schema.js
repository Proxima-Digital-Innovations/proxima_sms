const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('model StaffMemo')) {
    schema += `
model StaffMemo {
  id               String   @id @default(cuid())
  reference        String   @unique
  type             String   // "MESSAGE", "LEAVE_REQUEST", "CASH_VOUCHER"
  title            String
  content          String   @db.Text
  
  senderId         String
  sender           User     @relation("MemoSender", fields: [senderId], references: [id])
  
  currentHandlerId String?
  currentHandler   User?    @relation("MemoHandler", fields: [currentHandlerId], references: [id])
  
  status           String   @default("PENDING") // PENDING, APPROVED, REJECTED, KIV, CLOSED
  readStatus       Boolean  @default(false)
  
  metadata         String?  // JSON for Leave dates, Voucher amounts, etc.
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  history          StaffMemoHistory[]
}

model StaffMemoHistory {
  id          String    @id @default(cuid())
  memoId      String
  memo        StaffMemo @relation(fields: [memoId], references: [id], onDelete: Cascade)
  actorId     String
  actor       User      @relation("MemoActor", fields: [actorId], references: [id])
  action      String    // CREATED, FORWARDED, KIV, REJECTED, APPROVED
  notes       String?   @db.Text
  createdAt   DateTime  @default(now())
}
`;

  // Inject into User model
  schema = schema.replace(
    /model User \{([\s\S]*?)createdAt/m,
    `model User {$1
  sentMemos       StaffMemo[] @relation("MemoSender")
  handledMemos    StaffMemo[] @relation("MemoHandler")
  memoActions     StaffMemoHistory[] @relation("MemoActor")
  
  createdAt`
  );

  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log('StaffMemo schema appended and User model updated successfully.');
} else {
  console.log('StaffMemo already exists.');
}
