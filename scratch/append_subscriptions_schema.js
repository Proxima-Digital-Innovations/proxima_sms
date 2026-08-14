const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('PayrollSubscriptionType')) {
    schema += `
model PayrollSubscriptionType {
  id           String  @id @default(cuid())
  name         String  
  amount       Float   
  isPercentage Boolean @default(false) 
  description  String?
  isActive     Boolean @default(true)
  createdAt    DateTime @default(now())
  
  subscriptions StaffPayrollSubscription[]
}

model StaffPayrollSubscription {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id])
  subscriptionTypeId String
  subscriptionType   PayrollSubscriptionType @relation(fields: [subscriptionTypeId], references: [id])
  status             String   @default("ACTIVE") // ACTIVE, CANCEL_REQUESTED, CANCELLED
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
`;
}

if (!schema.includes('subscriptionsReport')) {
    schema = schema.replace(
        /basReport  String\?/m,
        `basReport  String?\n    subscriptionsReport String?`
    );
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Subscription Schema appended successfully.');
