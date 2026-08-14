import { PrismaClient } from '@prisma/client';
const Role = { ADMIN: 'ADMIN', SLT: 'SLT', HOD: 'HOD', TEACHER: 'TEACHER', ACCOUNTANT: 'ACCOUNTANT', EXAM_OFFICER: 'EXAM_OFFICER', PARENT: 'PARENT' };
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Single-Tenant Data...');

  const password = 'password123';
  const hashed = await hash(password);

  // --- 1. THE SYSTEM PROFILE ---
  const profile = await prisma.systemProfile.upsert({
    where: { id: 'default-system-profile' },
    update: {},
    create: {
      id: 'default-system-profile',
      name: "Proxima Academy",
      primaryColor: '#1e40af',
      secondaryColor: '#10b981',
    },
  });

  // --- 2. THE SUPER ADMIN (PLATFORM OWNER) ---
  await prisma.user.upsert({
    where: { email: 'admin@proximahub.com' },
    update: {},
    create: {
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@proximahub.com',
      passwordHash: hashed,
      isSuperAdmin: true,
      role: Role.ADMIN,
    },
  });

  // --- 3. SCHOOL DEPARTMENTS ---
  const deptScience = await prisma.department.upsert({
    where: { name: 'Science' },
    update: {},
    create: { name: 'Science' }
  });
  const deptArts = await prisma.department.upsert({
    where: { name: 'Arts' },
    update: {},
    create: { name: 'Arts' }
  });

  // --- 4. SCHOOL STAFF (DIVERSE ROLES) ---
  const staffData = [
    { email: 'slt@school.edu', role: Role.SLT, f: 'Morgana', l: 'LeFey' },
    { email: 'hod.science@school.edu', role: Role.HOD, f: 'Merlin', l: 'Ambrosius', deptId: deptScience.id },
    { email: 'hod.arts@school.edu', role: Role.HOD, f: 'Guinevere', l: 'Wilde', deptId: deptArts.id },
    { email: 'teacher1@school.edu', role: Role.TEACHER, f: 'Lancelot', l: 'DuLac' },
    { email: 'accountant@school.edu', role: Role.ACCOUNTANT, f: 'Bors', l: 'TheElder' },
  ];

  for (const s of staffData) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: hashed,
        role: s.role,
        firstName: s.f,
        lastName: s.l,
        departmentId: s.deptId || null,
        status: 'active'
      }
    });
  }

  // --- 5. ACADEMIC STRUCTURE ---
  const session = await prisma.academicSession.upsert({
    where: { name: '2024/2025' },
    update: {},
    create: {
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isActive: true,
    }
  });

  const term1 = await prisma.term.upsert({
    where: { name_sessionId: { name: 'Term 1', sessionId: session.id } },
    update: {},
    create: {
      name: 'Term 1',
      sessionId: session.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-20'),
      isActive: true,
    }
  });

  // --- 6. CLASSES & SUBJECTS ---
  const grade10 = await prisma.class.upsert({
    where: { name: 'Grade 10' },
    update: {},
    create: { name: 'Grade 10', termId: term1.id }
  });

  // --- 7. CLEANUP OLD LOGS/ITEMS TO PREVENT DUPLICATES ON RE-SEED ---
  await prisma.staffAttendance.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.kiosk.deleteMany();

  const supplier1 = await prisma.supplier.create({
    data: { name: 'Acme Educational Supplies', email: 'sales@acme.edu', phone: '555-0101', address: '123 Education Way' }
  });

  await prisma.inventoryItem.createMany({
    data: [
        { name: 'Whiteboard Markers (Pack of 10)', quantity: 50, minQuantity: 10, unit: 'packs', price: 5.99, supplierId: supplier1.id },
        { name: 'Projector', quantity: 3, minQuantity: 1, unit: 'units', price: 299.99, supplierId: supplier1.id },
        { name: 'Student Laptops', quantity: 150, minQuantity: 20, unit: 'units', price: 450.00, supplierId: supplier1.id },
        { name: 'A4 Printing Paper (Reams)', quantity: 200, minQuantity: 50, unit: 'reams', price: 3.50, supplierId: supplier1.id }
    ]
  });

  // --- 9. BAS (Biometric Attendance System) ---
  const kiosk1 = await prisma.kiosk.create({
    data: { terminalId: 'K-FRONT-01', name: 'Front Entrance Terminal', branchId: 'MAIN-CAMPUS', ipAddress: '192.168.1.100', isActive: true }
  });

  await prisma.holiday.create({
    data: { name: 'National Day', startDate: new Date('2024-10-01'), endDate: new Date('2024-10-02'), isRecurring: true }
  });

  // Add attendance logs for SLT and Teachers
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  for (const s of staffData) {
    const user = await prisma.user.findUnique({ where: { email: s.email }});
    if (user) {
        // Enrol them in BAS
        await prisma.user.update({
            where: { id: user.id },
            data: { isBiometricEnrolled: true, clockInTime: '07:30', clockOutTime: '15:30' }
        });
        
        // Add attendance logs
        await prisma.staffAttendance.create({
            data: {
                staffId: user.id,
                date: new Date(yesterday),
                timeIn: '07:25',
                timeOut: '15:35',
                type: 1,
                source: 'KIOSK',
                kioskId: kiosk1.id
            }
        });
        await prisma.staffAttendance.create({
            data: {
                staffId: user.id,
                date: new Date(today),
                timeIn: '07:45',
                timeOut: null,
                type: 1,
                source: 'KIOSK',
                kioskId: kiosk1.id
            }
        });
    }
  }

  console.log("🌱 ALL SEEDING COMPLETE!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
