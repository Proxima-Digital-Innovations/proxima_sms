import { PrismaClient, LicenseStatus, LicenseType, Role } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Comprehensive Multi-Tenant Data...');

  const password = 'password123';
  const hashed = await hash(password);

  // --- 1. THE TENANT (KING'S COLLEGE) ---
  const kings = await prisma.school.upsert({
    where: { subdomain: 'kingscollege' },
    update: {},
    create: {
      name: "King's College",
      slug: 'kings-college',
      subdomain: 'kingscollege',
      primaryColor: '#1e40af',
      secondaryColor: '#10b981',
      licenseStatus: LicenseStatus.ACTIVE,
      licenseType: LicenseType.PREMIUM,
      expiresAt: new Date('2026-12-31'),
    },
  });

  // --- 2. THE SUPER ADMIN (PLATFORM OWNER) ---
  await prisma.user.upsert({
    where: { email: 'admin@proximahub.com' },
    update: {},
    create: {
      schoolId: kings.id,
      firstName: 'System',
      lastName: 'Admin',
      email: 'admin@proximahub.com',
      passwordHash: hashed,
      isSuperAdmin: true,
      role: Role.ADMIN,
    },
  });

  // --- 3. SCHOOL DEPARTMENTS ---
  const deptScience = await prisma.department.create({
    data: { schoolId: kings.id, name: 'Science' }
  });
  const deptArts = await prisma.department.create({
    data: { schoolId: kings.id, name: 'Arts' }
  });

  // --- 4. SCHOOL STAFF (DIVERSE ROLES) ---
  const staffData = [
    { email: 'admin@kings.edu', role: Role.ADMIN, f: 'Arthur', l: 'Pendragon' },
    { email: 'slt@kings.edu', role: Role.SLT, f: 'Morgana', l: 'LeFey' },
    { email: 'hod.science@kings.edu', role: Role.HOD, f: 'Merlin', l: 'Ambrosius', deptId: deptScience.id },
    { email: 'hod.arts@kings.edu', role: Role.HOD, f: 'Guinevere', l: 'Wilde', deptId: deptArts.id },
    { email: 'teacher1@kings.edu', role: Role.TEACHER, f: 'Lancelot', l: 'DuLac' },
    { email: 'teacher2@kings.edu', role: Role.TEACHER, f: 'Gawain', l: 'Orkney' },
    { email: 'accountant@kings.edu', role: Role.ACCOUNTANT, f: 'Bors', l: 'TheElder' },
    { email: 'exams@kings.edu', role: Role.EXAM_OFFICER, f: 'Percival', l: 'Knight' },
  ];

  for (const s of staffData) {
    await prisma.user.create({
      data: {
        schoolId: kings.id,
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
  const session = await prisma.academicSession.create({
    data: {
      schoolId: kings.id,
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isActive: true,
    }
  });

  const term1 = await prisma.term.create({
    data: {
      schoolId: kings.id,
      name: 'Term 1',
      sessionId: session.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-20'),
      isActive: true,
    }
  });

  // --- 6. CLASSES & SUBJECTS ---
  const grade10 = await prisma.class.create({ data: { schoolId: kings.id, name: 'Grade 10', termId: term1.id } });
  const grade11 = await prisma.class.create({ data: { schoolId: kings.id, name: 'Grade 11', termId: term1.id } });

  // Create mock subjects for midterm results (added for migration)
  const math = await prisma.subject.create({ data: { schoolId: kings.id, name: 'Mathematics' } });
  const english = await prisma.subject.create({ data: { schoolId: kings.id, name: 'English Language' } });

  // --- 7. STUDENTS & PARENTS ---
  const studentNames = [
    { f: 'John', l: 'Doe', class: grade10.id, p: 'Parent One', pe: 'parent1@gmail.com' },
    { f: 'Jane', l: 'Smith', class: grade10.id, p: 'Parent Two', pe: 'parent2@gmail.com' },
    { f: 'Bob', l: 'Johnson', class: grade11.id, p: 'Parent Three', pe: 'parent3@gmail.com' },
    { f: 'Alice', l: 'Williams', class: grade11.id, p: 'Parent Four', pe: 'parent4@gmail.com' },
  ];

  for (let i = 0; i < studentNames.length; i++) {
    const s = studentNames[i];
    const student = await prisma.student.create({
      data: {
        schoolId: kings.id,
        studentId: `KINGS-${1000 + i}`,
        firstName: s.f,
        lastName: s.l,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: new Date('2010-05-15'),
        classId: s.class,
        status: 'Active',
      }
    });

    await prisma.enrollment.create({
        data: {
            schoolId: kings.id,
            studentId: student.id,
            classId: s.class,
            termId: term1.id,
            status: 'Active'
        }
    });

    const parentUser = await prisma.user.create({
        data: {
            schoolId: kings.id,
            email: s.pe,
            passwordHash: hashed,
            role: Role.PARENT,
            firstName: s.p.split(' ')[0],
            lastName: s.p.split(' ')[1],
            status: 'active'
        }
    });

    await prisma.guardian.create({
        data: {
            schoolId: kings.id,
            userId: parentUser.id,
            fullName: s.p,
            relationship: 'PARENT',
            phone: '08012345678',
            email: s.pe,
            address: '123 School Lane',
            studentId: student.id,
            isPrimary: true
        }
    });

    // Seed behavioural assessment for each student (added for migration to Prisma)
    await prisma.behaviouralAssessment.create({
      data: {
        schoolId: kings.id,
        studentId: student.id,
        termId: term1.id,
        session: '2024/2025',
        conduct: 8,
        punctuality: 7,
        dedication: 9,
        participation: 8,
        hospitality: 9,
        neatness: 8,
        creativity: 7,
        physical: 8
      }
    });

    // Seed Tahfeez score for each student (added for migration to Prisma)
    await prisma.tahfeezScore.create({
      data: {
        schoolId: kings.id,
        studentId: student.id,
        termId: term1.id,
        session: '2024/2025',
        surah: 'Al-Baqarah',
        juz: 1,
        page: 15,
        marks: 85.5
      }
    });

    // Seed Midterm Results for math and english for each student (added for migration to Prisma)
    await prisma.midtermResult.create({
      data: {
        schoolId: kings.id,
        studentId: student.id,
        subjectId: math.id,
        termId: term1.id,
        session: '2024/2025',
        score: 15.0,
        achievement: 'Expected +'
      }
    });
    await prisma.midtermResult.create({
      data: {
        schoolId: kings.id,
        studentId: student.id,
        subjectId: english.id,
        termId: term1.id,
        session: '2024/2025',
        score: 18.0,
        achievement: 'Exceeding'
      }
    });

    // Seed Result Token for each student (added for migration to Prisma)
    await prisma.resultToken.create({
      data: {
        schoolId: kings.id,
        studentId: student.id,
        termId: term1.id,
        session: '2024/2025',
        token: `TOKEN-${student.studentId}`,
        usageCount: 0,
        maxUsage: 5
      }
    });
  }

  // --- 8. FINANCIAL SIMULATION ---
  await prisma.feeStructure.create({
    data: {
        schoolId: kings.id,
        className: 'Grade 10',
        session: '2024/2025',
        term: 'Term 1',
        totalAmount: 150000,
        items: {
            create: [
                { name: 'Tuition Fee', amount: 100000 },
                { name: 'Development Levy', amount: 30000 },
                { name: 'ICT Fee', amount: 20000 },
            ]
        }
    }
  });

  console.log('✅ Simulation data created for King\'s College.');
  console.log('🌱 ALL SEEDING COMPLETE!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
