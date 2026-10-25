import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Comprehensive TIMS and Demo Personas...');

  const passwordHash = await hash('password123');

  // 1. SYSTEM PROFILE & MODULES
  await prisma.systemProfile.upsert({
    where: { id: 'default-system-profile' },
    update: {
      name: 'Proxima Institute & SMS Academy',
      primaryColor: '#0f172a',
      secondaryColor: '#10b981',
      licenseStatus: 'ACTIVE',
      currency: 'NGN',
      currencySymbol: '₦',
    },
    create: {
      id: 'default-system-profile',
      name: 'Proxima Institute & SMS Academy',
      primaryColor: '#0f172a',
      secondaryColor: '#10b981',
      licenseStatus: 'ACTIVE',
      currency: 'NGN',
      currencySymbol: '₦',
    },
  });

  // 2. CAMPUSES & FACULTIES
  const mainCampus = await prisma.campus.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Main Institutional Campus',
      address: 'University Boulevard, Capital District',
      isMain: true,
    },
  });

  const facultyComputing = await prisma.faculty.upsert({
    where: { code: 'FCI' },
    update: {},
    create: {
      code: 'FCI',
      name: 'Faculty of Computing & Information Technology',
      campusId: mainCampus.id,
    },
  });

  // 3. DEPARTMENTS
  const deptCSC = await prisma.department.upsert({
    where: { name: 'Computer Science' },
    update: { facultyId: facultyComputing.id },
    create: {
      name: 'Computer Science',
      facultyId: facultyComputing.id,
    },
  });

  const deptScience = await prisma.department.upsert({
    where: { name: 'Natural Sciences' },
    update: {},
    create: { name: 'Natural Sciences' },
  });

  // 4. ACADEMIC PROGRAM & COURSES
  const programCSC = await prisma.academicProgram.upsert({
    where: { code: 'B.Sc. CSC' },
    update: {},
    create: {
      code: 'B.Sc. CSC',
      name: 'Bachelor of Science in Computer Science',
      totalCreditsRequired: 120,
      departmentId: deptCSC.id,
      gradingStandard: 'NIGERIA_NUC_5_0',
    },
  });

  const courseCSC201 = await prisma.course.upsert({
    where: { code: 'CSC201' },
    update: {},
    create: {
      code: 'CSC201',
      title: 'Object-Oriented Programming (Java & C++)',
      creditUnits: 3,
      level: 200,
      semester: 1,
      programId: programCSC.id,
    },
  });

  const courseCSC203 = await prisma.course.upsert({
    where: { code: 'CSC203' },
    update: {},
    create: {
      code: 'CSC203',
      title: 'Data Structures and Algorithms',
      creditUnits: 3,
      level: 200,
      semester: 1,
      programId: programCSC.id,
    },
  });

  const courseMTH201 = await prisma.course.upsert({
    where: { code: 'MTH201' },
    update: {},
    create: {
      code: 'MTH201',
      title: 'Linear Algebra & Differential Equations',
      creditUnits: 3,
      level: 200,
      semester: 1,
      programId: programCSC.id,
    },
  });

  // 5. COURSE OFFERINGS (Active Session)
  const currentSession = '2025/2026';
  const offeringCSC201 = await prisma.courseOffering.upsert({
    where: {
      courseId_academicSession_semester: {
        courseId: courseCSC201.id,
        academicSession: currentSession,
        semester: 1,
      },
    },
    update: {},
    create: {
      courseId: courseCSC201.id,
      academicSession: currentSession,
      semester: 1,
      isRegistrationOpen: true,
      maxCapacity: 150,
      enrolledCount: 1,
    },
  });

  const offeringCSC203 = await prisma.courseOffering.upsert({
    where: {
      courseId_academicSession_semester: {
        courseId: courseCSC203.id,
        academicSession: currentSession,
        semester: 1,
      },
    },
    update: {},
    create: {
      courseId: courseCSC203.id,
      academicSession: currentSession,
      semester: 1,
      isRegistrationOpen: true,
      maxCapacity: 150,
      enrolledCount: 1,
    },
  });

  // 6. ACADEMIC SESSIONS & TERMS (Secondary & Tertiary)
  const academicSession = await prisma.academicSession.upsert({
    where: { name: currentSession },
    update: { isActive: true },
    create: {
      name: currentSession,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-07-31'),
      isActive: true,
    },
  });

  await prisma.term.upsert({
    where: { name_sessionId: { name: 'First Term', sessionId: academicSession.id } },
    update: { isActive: true },
    create: {
      name: 'First Term',
      sessionId: academicSession.id,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-12-20'),
      isActive: true,
    },
  });

  // 7. DEMO PERSONAS
  // 7a. SUPER ADMIN
  await prisma.user.upsert({
    where: { email: 'admin@proximahub.com' },
    update: { passwordHash, isSuperAdmin: true, role: 'ADMIN', status: 'active' },
    create: {
      firstName: 'Institutional',
      lastName: 'SuperAdmin',
      email: 'admin@proximahub.com',
      passwordHash,
      role: 'ADMIN',
      isSuperAdmin: true,
      status: 'active',
    },
  });

  // 7b. LECTURER
  const lecturerUser = await prisma.user.upsert({
    where: { email: 'aliyu.sani@proxima.edu.ng' },
    update: { passwordHash, role: 'LECTURER', status: 'active', departmentId: deptCSC.id },
    create: {
      firstName: 'Aliyu',
      lastName: 'Sani',
      email: 'aliyu.sani@proxima.edu.ng',
      passwordHash,
      role: 'LECTURER',
      status: 'active',
      departmentId: deptCSC.id,
    },
  });

  const staffProfile = await prisma.staffProfile.upsert({
    where: { userId: lecturerUser.id },
    update: { departmentId: deptCSC.id },
    create: {
      userId: lecturerUser.id,
      staffCode: 'STF/CSC/042',
      departmentId: deptCSC.id,
    },
  });

  // Link Lecturer to Course Offering
  await prisma.courseLecturer.upsert({
    where: {
      courseOfferingId_staffId: {
        courseOfferingId: offeringCSC201.id,
        staffId: staffProfile.id,
      },
    },
    update: {},
    create: {
      courseOfferingId: offeringCSC201.id,
      staffId: staffProfile.id,
      role: 'PRIMARY_LECTURER',
    },
  });

  // 7c. HOD / SENATE
  await prisma.user.upsert({
    where: { email: 'hod@proxima.com' },
    update: { passwordHash, role: 'HOD', status: 'active', departmentId: deptCSC.id },
    create: {
      firstName: 'Dr. Kabir',
      lastName: 'Danbatta',
      email: 'hod@proxima.com',
      passwordHash,
      role: 'HOD',
      status: 'active',
      departmentId: deptCSC.id,
    },
  });

  // 7d. ACCOUNTANT / BURSAR
  await prisma.user.upsert({
    where: { email: 'finance@proximahub.com' },
    update: { passwordHash, role: 'ACCOUNTANT', status: 'active' },
    create: {
      firstName: 'Bursar',
      lastName: 'Bello',
      email: 'finance@proximahub.com',
      passwordHash,
      role: 'ACCOUNTANT',
      status: 'active',
    },
  });

  // 7e. EXAM OFFICER
  await prisma.user.upsert({
    where: { email: 'exam@proxima.com' },
    update: { passwordHash, role: 'EXAM_OFFICER', status: 'active' },
    create: {
      firstName: 'Chief',
      lastName: 'Exam Officer',
      email: 'exam@proxima.com',
      passwordHash,
      role: 'EXAM_OFFICER',
      status: 'active',
    },
  });

  // 7f. SECONDARY TEACHER
  await prisma.user.upsert({
    where: { email: 'teacher@proximahub.com' },
    update: { passwordHash, role: 'TEACHER', status: 'active', departmentId: deptScience.id },
    create: {
      firstName: 'Fatima',
      lastName: 'Garba',
      email: 'teacher@proximahub.com',
      passwordHash,
      role: 'TEACHER',
      status: 'active',
      departmentId: deptScience.id,
    },
  });

  // 7g. PARENT USER
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@proximahub.com' },
    update: { passwordHash, role: 'PARENT', status: 'active' },
    create: {
      firstName: 'Alhaji Sani',
      lastName: 'Ibrahim',
      email: 'parent@proximahub.com',
      phone: '+2348031234567',
      passwordHash,
      role: 'PARENT',
      status: 'active',
    },
  });

  // Provision Parent Tuition Wallet
  await prisma.parentWallet.upsert({
    where: { userId: parentUser.id },
    update: { balance: 185000 },
    create: {
      userId: parentUser.id,
      balance: 185000,
      accountNumber: '9920148812',
      bankName: 'Guaranty Trust Bank (Dedicated Collection DVA)',
    },
  });

  // 7h. TERTIARY STUDENT (Undergrad - Matric U2025/CSC/001)
  const tertiaryStudentUser = await prisma.user.upsert({
    where: { email: 'student@proximahub.com' },
    update: {
      username: 'U2025/CSC/001',
      passwordHash,
      role: 'STUDENT',
      status: 'active',
    },
    create: {
      firstName: 'Ibrahim',
      lastName: 'Sani',
      email: 'student@proximahub.com',
      username: 'U2025/CSC/001',
      phone: '+2348123456789',
      passwordHash,
      role: 'STUDENT',
      status: 'active',
    },
  });

  const tertiaryProfile = await prisma.studentProfile.upsert({
    where: { userId: tertiaryStudentUser.id },
    update: {
      matricNumber: 'U2025/CSC/001',
      currentLevel: 200,
      programId: programCSC.id,
      guardianUserId: parentUser.id,
      guardianEmail: parentUser.email,
      guardianName: `${parentUser.firstName} ${parentUser.lastName}`,
      guardianPhone: parentUser.phone,
      guardianRelationship: 'Father',
    },
    create: {
      userId: tertiaryStudentUser.id,
      matricNumber: 'U2025/CSC/001',
      currentLevel: 200,
      programId: programCSC.id,
      guardianUserId: parentUser.id,
      guardianEmail: parentUser.email,
      guardianName: `${parentUser.firstName} ${parentUser.lastName}`,
      guardianPhone: parentUser.phone,
      guardianRelationship: 'Father',
    },
  });

  // Student Semester Course Registration
  const semReg = await prisma.semesterRegistration.upsert({
    where: {
      studentId_academicSession_semester: {
        studentId: tertiaryProfile.id,
        academicSession: currentSession,
        semester: 1,
      },
    },
    update: { status: 'ADVISOR_APPROVED', isBursaryCleared: true, totalCredits: 6 },
    create: {
      studentId: tertiaryProfile.id,
      academicSession: currentSession,
      semester: 1,
      status: 'ADVISOR_APPROVED',
      isBursaryCleared: true,
      totalCredits: 6,
    },
  });

  await prisma.studentRegisteredCourse.upsert({
    where: {
      registrationId_offeringId: {
        registrationId: semReg.id,
        offeringId: offeringCSC201.id,
      },
    },
    update: { isClearedForExam: true, creditUnits: 3 },
    create: {
      registrationId: semReg.id,
      offeringId: offeringCSC201.id,
      creditUnits: 3,
      isClearedForExam: true,
      examDocketBarcode: 'DKT-U2025-CSC201',
    },
  });

  await prisma.studentRegisteredCourse.upsert({
    where: {
      registrationId_offeringId: {
        registrationId: semReg.id,
        offeringId: offeringCSC203.id,
      },
    },
    update: { isClearedForExam: true, creditUnits: 3 },
    create: {
      registrationId: semReg.id,
      offeringId: offeringCSC203.id,
      creditUnits: 3,
      isClearedForExam: true,
      examDocketBarcode: 'DKT-U2025-CSC203',
    },
  });

  // 7i. SECONDARY STUDENT & CLASS
  const secondaryClass = await prisma.class.upsert({
    where: { id: 'class-jss1-gold' },
    update: {},
    create: {
      id: 'class-jss1-gold',
      name: 'JSS 1 Gold',
    },
  });

  const secondaryStudent = await prisma.student.upsert({
    where: { id: 'student-amina-sani' },
    update: { classId: secondaryClass.id },
    create: {
      id: 'student-amina-sani',
      studentId: 'STU-20001',
      firstName: 'Amina',
      lastName: 'Sani',
      gender: 'Female',
      classId: secondaryClass.id,
      status: 'Active',
      dateOfBirth: new Date('2013-05-12'),
    },
  });

  // Link Secondary Student to Parent via Guardian record
  await prisma.guardian.upsert({
    where: { id: 'guardian-sani-ibrahim' },
    update: { studentId: secondaryStudent.id, userId: parentUser.id },
    create: {
      id: 'guardian-sani-ibrahim',
      userId: parentUser.id,
      fullName: 'Alhaji Sani Ibrahim',
      relationship: 'Father',
      email: 'parent@proximahub.com',
      phone: '+2348031234567',
      address: 'No 14 Crescent Drive, GRA',
      isPrimary: true,
      studentId: secondaryStudent.id,
    },
  });

  // 8. HOSTEL & BED SPACE ALLOCATION
  const hostel = await prisma.hostel.upsert({
    where: { code: 'HL-MALE-EXEC' },
    update: {},
    create: {
      code: 'HL-MALE-EXEC',
      name: 'Executive Male Hall of Residence',
      gender: 'MALE',
      category: 'UNDERGRADUATE',
      status: 'ACTIVE',
      campus: { connect: { id: mainCampus.id } },
    },
  });

  const block = await prisma.hostelBlock.upsert({
    where: { id: 'block-a-male' },
    update: {},
    create: {
      id: 'block-a-male',
      hostelId: hostel.id,
      name: 'Block A (Alpha Wing)',
      floors: 3,
    },
  });

  const room = await prisma.hostelRoom.upsert({
    where: {
      hostelId_roomNumber: {
        hostelId: hostel.id,
        roomNumber: 'A101',
      },
    },
    update: {},
    create: {
      hostelId: hostel.id,
      blockId: block.id,
      roomNumber: 'A101',
      floor: 1,
      capacity: 2,
      feePerSession: 80000,
      type: 'EXECUTIVE',
      status: 'AVAILABLE',
    },
  });

  const bedSpace = await prisma.hostelBedSpace.upsert({
    where: {
      roomId_bedNumber: {
        roomId: room.id,
        bedNumber: 'Bed 1 (Lower Bunk)',
      },
    },
    update: { isOccupied: true, status: 'OCCUPIED' },
    create: {
      roomId: room.id,
      bedNumber: 'Bed 1 (Lower Bunk)',
      isOccupied: true,
      status: 'OCCUPIED',
    },
  });

  await prisma.hostelAllocation.upsert({
    where: { allocationRef: 'HA-2025-0042' },
    update: {},
    create: {
      allocationRef: 'HA-2025-0042',
      academicSessionId: academicSession.id,
      hostelId: hostel.id,
      roomId: room.id,
      bedSpaceId: bedSpace.id,
      studentProfileId: tertiaryProfile.id,
      status: 'ALLOCATED',
      qrToken: 'QR-HOSTEL-U2025-CSC-001',
    },
  });

  console.log('ALL DEMO PERSONAS AND STRUCTURES SEEDED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error('Error during demo seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
