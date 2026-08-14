const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding academic shifts...');

  const morning = await prisma.shift.upsert({
    where: { name: 'Morning Session' },
    update: {},
    create: {
      name: 'Morning Session',
      startTime: '07:30',
      endTime: '13:30',
      gracePeriod: 15,
    },
  });

  const afternoon = await prisma.shift.upsert({
    where: { name: 'Afternoon Session' },
    update: {},
    create: {
      name: 'Afternoon Session',
      startTime: '13:30',
      endTime: '18:00',
      gracePeriod: 10,
    },
  });

  console.log('Shifts created:', morning.name, afternoon.name);

  // Assign to users without a shift
  const users = await prisma.user.findMany({
    where: { shiftId: null }
  });

  let morningCount = 0;
  let afternoonCount = 0;

  for (let i = 0; i < users.length; i++) {
    const shift = i % 3 === 0 ? afternoon : morning; // 1/3 afternoon, 2/3 morning
    await prisma.user.update({
      where: { id: users[i].id },
      data: { shiftId: shift.id }
    });
    if (shift.id === morning.id) morningCount++;
    else afternoonCount++;
  }

  console.log(`Assigned ${morningCount} users to Morning Session and ${afternoonCount} to Afternoon Session.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
