const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedMemos() {
  const staffList = await prisma.user.findMany({ where: { role: { not: 'STUDENT' } } });
  if (staffList.length < 2) return console.log("Not enough staff to seed memos");

  const sender = staffList[0];
  const handler = staffList[1];

  await prisma.staffMemo.create({
    data: {
      reference: 'MEMO-2026-9912',
      type: 'LEAVE_REQUEST',
      title: 'Request for Sick Leave',
      content: 'I have been feeling unwell and the doctor advised a 3-day rest.',
      senderId: sender.id,
      currentHandlerId: handler.id,
      status: 'PENDING',
      metadata: JSON.stringify({ startDate: '2026-08-10', endDate: '2026-08-12' }),
      history: {
        create: {
          actorId: sender.id,
          action: 'CREATED',
          notes: 'Memo originated'
        }
      }
    }
  });
  
  console.log("Seeded memo successfully.");
}

seedMemos().catch(console.error).finally(() => prisma.$disconnect());
