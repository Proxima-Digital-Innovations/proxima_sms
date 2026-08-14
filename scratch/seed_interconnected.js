const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting interconnected seed (Albabello Memo Architecture)...');

  // 1. Setup Academics
  let session = await prisma.academicSession.findFirst({ where: { name: '2026/2027' } });
  if (!session) {
    session = await prisma.academicSession.create({
      data: {
        name: '2026/2027',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-07-31'),
        isActive: true,
      }
    });
  }

  let term = await prisma.term.findFirst({ where: { name: 'First Term', sessionId: session.id } });
  if (!term) {
    term = await prisma.term.create({
      data: {
        name: 'First Term',
        sessionId: session.id,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-12-15'),
        isActive: true,
      }
    });
  }

  let jss1 = await prisma.class.findFirst({ where: { name: 'JSS 1' } });
  if (!jss1) {
    jss1 = await prisma.class.create({ data: { name: 'JSS 1', capacity: 30 } });
  }

  // 2. Setup Departments
  let financeDept = await prisma.department.findFirst({ where: { name: 'Finance' } });
  if (!financeDept) {
    financeDept = await prisma.department.create({ data: { name: 'Finance' } });
  }

  let sltDept = await prisma.department.findFirst({ where: { name: 'Senior Leadership Team' } });
  if (!sltDept) {
    sltDept = await prisma.department.create({ data: { name: 'Senior Leadership Team' } });
  }

  // 3. Setup Staff
  let accountant = await prisma.user.findFirst({ where: { email: 'accountant@school.edu' } });
  if (!accountant) {
    accountant = await prisma.user.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Accountant',
        email: 'accountant@school.edu',
        role: 'ACCOUNTANT',
        passwordHash: 'password',
        department: { connect: { id: financeDept.id } },
        baseSalary: 150000,
      }
    });
  }

  let principal = await prisma.user.findFirst({ where: { email: 'principal@school.edu' } });
  if (!principal) {
    principal = await prisma.user.create({
      data: {
        firstName: 'Seymour',
        lastName: 'Skinner',
        email: 'principal@school.edu',
        role: 'PRINCIPAL',
        passwordHash: 'password',
        department: { connect: { id: sltDept.id } },
        baseSalary: 300000,
      }
    });
  }

  // 4. Setup Students
  let studentUser = await prisma.user.findFirst({ where: { email: 'student1@school.edu' } });
  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'student1@school.edu',
        role: 'STUDENT',
        passwordHash: 'password',
      }
    });
  }

  let student = await prisma.student.findFirst({ where: { firstName: 'John', lastName: 'Doe' } });
  if (!student) {
    student = await prisma.student.create({
      data: {
        studentId: 'STD-001',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('2010-05-15'),
        gender: 'MALE',
        class: { connect: { id: jss1.id } },
      }
    });
  }

  // 5. Finance
  await prisma.payroll.create({
    data: {
      user: { connect: { id: accountant.id } },
      month: 8,
      year: 2026,
      baseAmount: 150000,
      netAmount: 145000,
      status: 'pending',
    }
  });

  const expense = await prisma.expense.create({
    data: {
      amount: 25000,
      category: 'SUPPLIES',
      description: 'Office Stationery',
      date: new Date(),
      recordedByU: { connect: { id: accountant.id } },
    }
  });

  // 6. Communications (Memo)
  const memo = await prisma.memo.create({
    data: {
      reference: 'MEMO/FIN/2026/00' + Math.floor(Math.random() * 1000),
      title: 'Approval for Office Stationery Expense',
      body: 'Please approve the attached payment process for N25,000 for purchasing A4 paper and printer toner for the Finance Department.',
      raisedBy: { connect: { id: accountant.id } },
      raisedFor: { connect: { id: principal.id } },
      status: 'OPEN',
      readStatus: 'NOT_SEEN',
      type: 'MEMO',
    }
  });

  await prisma.paymentProcess.create({
    data: {
      memo: { connect: { id: memo.id } },
      accountDebited: 'Operations Account',
      accountCredited: 'Vendor Bank',
      amount: 25000,
      beneficiaryType: 'VENDOR',
      beneficiary: 'OfficeMax Supplies',
      narration: 'Office Stationery Expense',
    }
  });

  await prisma.memoMinute.create({
    data: {
      memo: { connect: { id: memo.id } },
      fromUser: { connect: { id: principal.id } },
      toUser: { connect: { id: accountant.id } },
      body: 'Approved. Please proceed with the payment.',
      flag: 'POSITIVE',
      status: 'SEEN',
    }
  });

  await prisma.memo.update({
    where: { id: memo.id },
    data: { status: 'COMPLETED' }
  });

  // Expense status is tracked via the memo now in Albabello style.
  console.log('Interconnected seed completed with Albabello Memo logic!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
