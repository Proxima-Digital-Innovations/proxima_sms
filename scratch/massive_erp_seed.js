const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting Massive ERP Seed for Production Demo...');

  // Ensure basic dependencies exist (from previous seed)
  let accountant = await prisma.user.findFirst({ where: { role: 'ACCOUNTANT' } });
  let principal = await prisma.user.findFirst({ where: { role: 'PRINCIPAL' } });
  let hrDept = await prisma.department.findFirst({ where: { name: 'Human Resources' } });
  if (!hrDept) hrDept = await prisma.department.create({ data: { name: 'Human Resources' } });
  let transportDept = await prisma.department.findFirst({ where: { name: 'Transport' } });
  if (!transportDept) transportDept = await prisma.department.create({ data: { name: 'Transport' } });

  // 1. ASSET MANAGEMENT SEED
  console.log('Seeding Assets...');
  const assetCategories = [
    { name: 'Vehicles', depreciationRate: 20 },
    { name: 'IT Equipment', depreciationRate: 33 },
    { name: 'Furniture', depreciationRate: 10 },
    { name: 'Lab Equipment', depreciationRate: 15 }
  ];
  
  for (const cat of assetCategories) {
    await prisma.assetCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
  }

  const itCategory = await prisma.assetCategory.findUnique({ where: { name: 'IT Equipment' } });
  const furnitureCat = await prisma.assetCategory.findUnique({ where: { name: 'Furniture' } });
  const labCat = await prisma.assetCategory.findUnique({ where: { name: 'Lab Equipment' } });

  const assets = [
    { tagNumber: 'IT-2026-001', name: 'MacBook Pro M3 Max', categoryId: itCategory.id, purchaseDate: new Date('2026-01-15'), purchasePrice: 3500000, currentValue: 3000000, status: 'ASSIGNED' },
    { tagNumber: 'IT-2026-002', name: 'Dell XPS 15', categoryId: itCategory.id, purchaseDate: new Date('2026-02-10'), purchasePrice: 2800000, currentValue: 2500000, status: 'AVAILABLE' },
    { tagNumber: 'LAB-2026-001', name: 'Leica Digital Microscope', categoryId: labCat.id, purchaseDate: new Date('2025-11-20'), purchasePrice: 4500000, currentValue: 4000000, status: 'AVAILABLE' },
    { tagNumber: 'FUR-2026-001', name: 'Executive Desk', categoryId: furnitureCat.id, purchaseDate: new Date('2026-03-05'), purchasePrice: 500000, currentValue: 480000, status: 'ASSIGNED' }
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { tagNumber: asset.tagNumber },
      update: {},
      create: asset
    });
  }

  const macbook = await prisma.asset.findUnique({ where: { tagNumber: 'IT-2026-001' } });
  if (principal) {
    await prisma.assetAssignment.create({
      data: {
        assetId: macbook.id,
        userId: principal.id,
        condition: 'GOOD'
      }
    });
  }

  // 2. FLEET & TRANSPORT SEED
  console.log('Seeding Fleet...');
  const vehicles = [
    { registrationNo: 'LSR-452-XG', make: 'Toyota', model: 'Coaster', year: 2022, capacity: 30, status: 'ACTIVE' },
    { registrationNo: 'ABJ-991-QW', make: 'Ford', model: 'Transit', year: 2023, capacity: 15, status: 'ACTIVE' },
    { registrationNo: 'KNO-112-MM', make: 'Mercedes', model: 'Sprinter', year: 2021, capacity: 18, status: 'MAINTENANCE' },
  ];

  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { registrationNo: v.registrationNo },
      update: {},
      create: v
    });
  }

  const coaster = await prisma.vehicle.findUnique({ where: { registrationNo: 'LSR-452-XG' } });
  
  if (coaster && accountant) {
    await prisma.transportRoute.create({
      data: {
        name: 'Mainland Express Route A',
        description: 'Ikeja - Maryland - Yaba',
        vehicleId: coaster.id
      }
    });

    await prisma.vehicleDispatch.create({
      data: {
        vehicleId: coaster.id,
        driverId: accountant.id, // using accountant as dummy driver for now
        destination: 'Yaba Field Trip',
        purpose: 'Excursion',
        departureTime: new Date(),
        status: 'OUTBOUND'
      }
    });

    await prisma.fuelLog.create({
      data: {
        vehicleId: coaster.id,
        liters: 50,
        costPerLiter: 850,
        totalCost: 42500,
        loggedById: accountant.id
      }
    });
  }

  // 3. RECRUITMENT & ATS SEED
  console.log('Seeding Recruitment ATS...');
  const job = await prisma.jobPosting.create({
    data: {
      title: 'Senior Mathematics Teacher',
      departmentId: hrDept.id,
      description: 'Looking for an experienced Mathematics teacher for Senior Secondary classes.',
      requirements: 'B.Sc/B.Ed in Mathematics, 5+ years experience.',
      status: 'OPEN',
      deadline: new Date('2026-10-01')
    }
  });

  const applicants = [
    { firstName: 'Chinedu', lastName: 'Okafor', email: 'chinedu.o@example.com', phone: '08012345678', status: 'INTERVIEW', jobId: job.id },
    { firstName: 'Aisha', lastName: 'Bello', email: 'aisha.b@example.com', phone: '08087654321', status: 'SCREENING', jobId: job.id },
    { firstName: 'Tunde', lastName: 'Bakare', email: 'tunde.b@example.com', phone: '08099887766', status: 'APPLIED', jobId: job.id },
    { firstName: 'Ngozi', lastName: 'Eze', email: 'ngozi.e@example.com', phone: '08122334455', status: 'OFFERED', jobId: job.id }
  ];

  for (const app of applicants) {
    const application = await prisma.jobApplication.create({ data: app });
    if (app.status === 'INTERVIEW' && principal) {
      await prisma.interview.create({
        data: {
          applicationId: application.id,
          interviewerId: principal.id,
          scheduledAt: new Date(Date.now() + 86400000), // tomorrow
          location: 'Conference Room A',
          notes: 'Strong candidate, knows advanced calculus.'
        }
      });
    }
  }

  // 4. GENERAL LEDGER ACCOUNTING SEED
  console.log('Seeding General Ledger...');
  const acctCategories = [
    { name: 'Assets' }, { name: 'Liabilities' }, { name: 'Equity' }, { name: 'Revenue' }, { name: 'Expenses' }
  ];
  for (const cat of acctCategories) {
    await prisma.accountCategory.upsert({ where: { name: cat.name }, update: {}, create: cat });
  }
  const assetCat = await prisma.accountCategory.findUnique({ where: { name: 'Assets' } });
  const revCat = await prisma.accountCategory.findUnique({ where: { name: 'Revenue' } });
  const expCat = await prisma.accountCategory.findUnique({ where: { name: 'Expenses' } });

  const cashAccount = await prisma.accountCode.upsert({ where: { code: '1000' }, update: {}, create: { code: '1000', name: 'Cash at Bank (GTB)', categoryId: assetCat.id, balance: 15000000 } });
  const tuitionAccount = await prisma.accountCode.upsert({ where: { code: '4000' }, update: {}, create: { code: '4000', name: 'Tuition Fees Income', categoryId: revCat.id, balance: -12000000 } });
  const salaryAccount = await prisma.accountCode.upsert({ where: { code: '5000' }, update: {}, create: { code: '5000', name: 'Salary Expense', categoryId: expCat.id, balance: 3000000 } });

  if (accountant) {
    const journal = await prisma.journalEntry.create({
      data: {
        reference: 'JRN-2026-0001',
        date: new Date(),
        description: 'Record Term 1 Tuition Collection',
        recordedById: accountant.id
      }
    });

    await prisma.journalLine.createMany({
      data: [
        { entryId: journal.id, accountId: cashAccount.id, debit: 2500000, credit: 0, description: 'Bank Deposit' },
        { entryId: journal.id, accountId: tuitionAccount.id, debit: 0, credit: 2500000, description: 'Tuition Income' }
      ]
    });
  }

  // 5. PAYROLL PRO (LOANS & ADVANCES) SEED
  console.log('Seeding Payroll Pro...');
  if (accountant && principal) {
    await prisma.staffLoan.create({
      data: {
        userId: accountant.id,
        amount: 500000,
        reason: 'Personal Emergency',
        monthlyDeduction: 50000,
        remainingBalance: 400000,
        status: 'APPROVED',
        approvedById: principal.id
      }
    });

    await prisma.payrollAllowance.create({
      data: {
        userId: principal.id,
        type: 'HOUSING',
        amount: 150000,
        isRecurring: true
      }
    });
  }

  console.log('Massive ERP Seed Complete! The system is now prod-ready with live mock data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
