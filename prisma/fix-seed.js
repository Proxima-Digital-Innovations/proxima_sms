const fs = require('fs');
const file = 'C:/projects/School-hub/schoolsystem/prisma/seed.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  /const deptScience = await prisma\.department\.create\(\{\n\s*data: \{ schoolId: kings\.id, name: 'Science' \}\n\s*\}\);/,
  `const deptScience = await prisma.department.upsert({\n    where: { schoolId_name: { schoolId: kings.id, name: 'Science' } },\n    update: {},\n    create: { schoolId: kings.id, name: 'Science' }\n  });`
);
code = code.replace(
  /const deptArts = await prisma\.department\.create\(\{\n\s*data: \{ schoolId: kings\.id, name: 'Arts' \}\n\s*\}\);/,
  `const deptArts = await prisma.department.upsert({\n    where: { schoolId_name: { schoolId: kings.id, name: 'Arts' } },\n    update: {},\n    create: { schoolId: kings.id, name: 'Arts' }\n  });`
);

code = code.replace(
  /await prisma\.user\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*email: s\.email,\n\s*passwordHash: hashed,\n\s*role: s\.role,\n\s*firstName: s\.f,\n\s*lastName: s\.l,\n\s*departmentId: s\.deptId \|\| null,\n\s*status: 'active'\n\s*\}\n\s*\}\);/,
  `await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        schoolId: kings.id,
        email: s.email,
        passwordHash: hashed,
        role: s.role,
        firstName: s.f,
        lastName: s.l,
        departmentId: s.deptId || null,
        status: 'active'
      }
    });`
);

code = code.replace(
  /const session = await prisma\.academicSession\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*name: '2024\/2025',\n\s*startDate: new Date\('2024-09-01'\),\n\s*endDate: new Date\('2025-07-31'\),\n\s*isActive: true,\n\s*\}\n\s*\}\);/,
  `const session = await prisma.academicSession.upsert({
    where: { schoolId_name: { schoolId: kings.id, name: '2024/2025' } },
    update: {},
    create: {
      schoolId: kings.id,
      name: '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-07-31'),
      isActive: true,
    }
  });`
);

code = code.replace(
  /const term1 = await prisma\.term\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*name: 'Term 1',\n\s*sessionId: session\.id,\n\s*startDate: new Date\('2024-09-01'\),\n\s*endDate: new Date\('2024-12-20'\),\n\s*isActive: true,\n\s*\}\n\s*\}\);/,
  `const term1 = await prisma.term.upsert({
    where: { schoolId_name_sessionId: { schoolId: kings.id, name: 'Term 1', sessionId: session.id } },
    update: {},
    create: {
      schoolId: kings.id,
      name: 'Term 1',
      sessionId: session.id,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-20'),
      isActive: true,
    }
  });`
);

code = code.replace(
  /const grade10 = await prisma\.class\.create\(\{ data: \{ schoolId: kings\.id, name: 'Grade 10', termId: term1\.id \} \}\);/,
  `const grade10 = await prisma.class.upsert({
    where: { schoolId_name: { schoolId: kings.id, name: 'Grade 10' } },
    update: {},
    create: { schoolId: kings.id, name: 'Grade 10', termId: term1.id }
  });`
);

code = code.replace(
  /const grade11 = await prisma\.class\.create\(\{ data: \{ schoolId: kings\.id, name: 'Grade 11', termId: term1\.id \} \}\);/,
  `const grade11 = await prisma.class.upsert({
    where: { schoolId_name: { schoolId: kings.id, name: 'Grade 11' } },
    update: {},
    create: { schoolId: kings.id, name: 'Grade 11', termId: term1.id }
  });`
);

code = code.replace(
  /const math = await prisma\.subject\.create\(\{ data: \{ schoolId: kings\.id, name: 'Mathematics' \} \}\);/,
  `const math = await prisma.subject.upsert({
    where: { schoolId_name: { schoolId: kings.id, name: 'Mathematics' } },
    update: {},
    create: { schoolId: kings.id, name: 'Mathematics' }
  });`
);

code = code.replace(
  /const english = await prisma\.subject\.create\(\{ data: \{ schoolId: kings\.id, name: 'English Language' \} \}\);/,
  `const english = await prisma.subject.upsert({
    where: { schoolId_name: { schoolId: kings.id, name: 'English Language' } },
    update: {},
    create: { schoolId: kings.id, name: 'English Language' }
  });`
);

code = code.replace(
  /const student = await prisma\.student\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: \`KINGS-\$\{1000 \+ i\}\`,\n\s*firstName: s\.f,\n\s*lastName: s\.l,\n\s*gender: i % 2 === 0 \? 'MALE' : 'FEMALE',\n\s*dateOfBirth: new Date\('2010-05-15'\),\n\s*classId: s\.class,\n\s*status: 'Active',\n\s*\}\n\s*\}\);/,
  `const student = await prisma.student.upsert({
      where: { schoolId_studentId: { schoolId: kings.id, studentId: \`KINGS-\${1000 + i}\` } },
      update: {},
      create: {
        schoolId: kings.id,
        studentId: \`KINGS-\${1000 + i}\`,
        firstName: s.f,
        lastName: s.l,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        dateOfBirth: new Date('2010-05-15'),
        classId: s.class,
        status: 'Active',
      }
    });`
);

code = code.replace(
  /await prisma\.enrollment\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*classId: s\.class,\n\s*termId: term1\.id,\n\s*status: 'Active'\n\s*\}\n\s*\}\);/,
  `await prisma.enrollment.upsert({
        where: { studentId_termId: { studentId: student.id, termId: term1.id } },
        update: {},
        create: {
            schoolId: kings.id,
            studentId: student.id,
            classId: s.class,
            termId: term1.id,
            status: 'Active'
        }
    });`
);

code = code.replace(
  /const parentUser = await prisma\.user\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*email: s\.pe,\n\s*passwordHash: hashed,\n\s*role: Role\.PARENT,\n\s*firstName: s\.p\.split\(' '\)\[0\],\n\s*lastName: s\.p\.split\(' '\)\[1\],\n\s*status: 'active'\n\s*\}\n\s*\}\);/,
  `const parentUser = await prisma.user.upsert({
        where: { email: s.pe },
        update: {},
        create: {
            schoolId: kings.id,
            email: s.pe,
            passwordHash: hashed,
            role: Role.PARENT,
            firstName: s.p.split(' ')[0],
            lastName: s.p.split(' ')[1],
            status: 'active'
        }
    });`
);

code = code.replace(
  /await prisma\.guardian\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*userId: parentUser\.id,\n\s*fullName: s\.p,\n\s*relationship: 'PARENT',\n\s*phone: '08012345678',\n\s*email: s\.pe,\n\s*address: '123 School Lane',\n\s*studentId: student\.id,\n\s*isPrimary: true\n\s*\}\n\s*\}\);/,
  `await prisma.guardian.upsert({
        where: { userId: parentUser.id },
        update: {},
        create: {
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
    });`
);

code = code.replace(
  /await prisma\.behaviouralAssessment\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*termId: term1\.id,\n\s*session: '2024\/2025',\n\s*conduct: 8,\n\s*punctuality: 7,\n\s*dedication: 9,\n\s*participation: 8,\n\s*hospitality: 9,\n\s*neatness: 8,\n\s*creativity: 7,\n\s*physical: 8\n\s*\}\n\s*\}\);/,
  `await prisma.behaviouralAssessment.upsert({
      where: { studentId_termId: { studentId: student.id, termId: term1.id } },
      update: {},
      create: {
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
    });`
);

code = code.replace(
  /await prisma\.tahfeezScore\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*termId: term1\.id,\n\s*session: '2024\/2025',\n\s*surah: 'Al-Baqarah',\n\s*juz: 1,\n\s*page: 15,\n\s*marks: 85\.5\n\s*\}\n\s*\}\);/,
  `await prisma.tahfeezScore.upsert({
      where: { studentId_termId: { studentId: student.id, termId: term1.id } },
      update: {},
      create: {
        schoolId: kings.id,
        studentId: student.id,
        termId: term1.id,
        session: '2024/2025',
        surah: 'Al-Baqarah',
        juz: 1,
        page: 15,
        marks: 85.5
      }
    });`
);

code = code.replace(
  /await prisma\.midtermResult\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*subjectId: math\.id,\n\s*termId: term1\.id,\n\s*session: '2024\/2025',\n\s*score: 15\.0,\n\s*achievement: 'Expected \+'\n\s*\}\n\s*\}\);/,
  `await prisma.midtermResult.upsert({
      where: { studentId_subjectId_termId: { studentId: student.id, subjectId: math.id, termId: term1.id } },
      update: {},
      create: {
        schoolId: kings.id,
        studentId: student.id,
        subjectId: math.id,
        termId: term1.id,
        session: '2024/2025',
        score: 15.0,
        achievement: 'Expected +'
      }
    });`
);

code = code.replace(
  /await prisma\.midtermResult\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*subjectId: english\.id,\n\s*termId: term1\.id,\n\s*session: '2024\/2025',\n\s*score: 18\.0,\n\s*achievement: 'Exceeding'\n\s*\}\n\s*\}\);/,
  `await prisma.midtermResult.upsert({
      where: { studentId_subjectId_termId: { studentId: student.id, subjectId: english.id, termId: term1.id } },
      update: {},
      create: {
        schoolId: kings.id,
        studentId: student.id,
        subjectId: english.id,
        termId: term1.id,
        session: '2024/2025',
        score: 18.0,
        achievement: 'Exceeding'
      }
    });`
);

code = code.replace(
  /await prisma\.resultToken\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*studentId: student\.id,\n\s*termId: term1\.id,\n\s*session: '2024\/2025',\n\s*token: \`TOKEN-\$\{student\.studentId\}\`,\n\s*usageCount: 0,\n\s*maxUsage: 5\n\s*\}\n\s*\}\);/,
  `await prisma.resultToken.upsert({
      where: { token: \`TOKEN-\${student.studentId}\` },
      update: {},
      create: {
        schoolId: kings.id,
        studentId: student.id,
        termId: term1.id,
        session: '2024/2025',
        token: \`TOKEN-\${student.studentId}\`,
        usageCount: 0,
        maxUsage: 5
      }
    });`
);

code = code.replace(
  /await prisma\.feeStructure\.create\(\{\n\s*data: \{\n\s*schoolId: kings\.id,\n\s*className: 'Grade 10',\n\s*session: '2024\/2025',\n\s*term: 'Term 1',\n\s*totalAmount: 150000,\n\s*items: \{\n\s*create: \[\n\s*\{ name: 'Tuition Fee', amount: 100000 \},\n\s*\{ name: 'Development Levy', amount: 30000 \},\n\s*\{ name: 'ICT Fee', amount: 20000 \},\n\s*\]\n\s*\}\n\s*\}\n\s*\}\);/,
  `await prisma.feeStructure.upsert({
    where: { schoolId_className_session_term: { schoolId: kings.id, className: 'Grade 10', session: '2024/2025', term: 'Term 1' } },
    update: {},
    create: {
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
  });`
);

fs.writeFileSync(file, code);
console.log('Done replacement');
