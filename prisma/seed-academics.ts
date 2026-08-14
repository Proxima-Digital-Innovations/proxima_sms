import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAcademics() {
  console.log('🎓 Seeding academic data...');

  // 1. Grading Scale (Nigerian WAEC Standard)
  const scale = await prisma.gradingScale.upsert({
    where: { name: 'Nigerian Standard (WAEC)' },
    update: {},
    create: {
      name: 'Nigerian Standard (WAEC)',
      isDefault: true,
      entries: {
        create: [
          { grade: 'A1', label: 'Excellent', minPercentage: 75, maxPercentage: 100, gpaPoints: 4.0 },
          { grade: 'B2', label: 'Very Good', minPercentage: 70, maxPercentage: 74.99, gpaPoints: 3.5 },
          { grade: 'B3', label: 'Good', minPercentage: 65, maxPercentage: 69.99, gpaPoints: 3.25 },
          { grade: 'C4', label: 'Credit', minPercentage: 60, maxPercentage: 64.99, gpaPoints: 3.0 },
          { grade: 'C5', label: 'Credit', minPercentage: 55, maxPercentage: 59.99, gpaPoints: 2.75 },
          { grade: 'C6', label: 'Credit', minPercentage: 50, maxPercentage: 54.99, gpaPoints: 2.5 },
          { grade: 'D7', label: 'Pass', minPercentage: 45, maxPercentage: 49.99, gpaPoints: 2.0 },
          { grade: 'E8', label: 'Pass', minPercentage: 40, maxPercentage: 44.99, gpaPoints: 1.5 },
          { grade: 'F9', label: 'Fail', minPercentage: 0, maxPercentage: 39.99, gpaPoints: 0 },
        ],
      },
    },
  });
  console.log(`  ✅ Grading scale: ${scale.name}`);

  // 2. Assignment Categories (Default weighted breakdown)
  const categories = [
    { name: 'CA Test', weight: 0.2, maxScore: 20, sortOrder: 1 },
    { name: 'CA Assignment', weight: 0.2, maxScore: 20, sortOrder: 2 },
    { name: 'Examination', weight: 0.6, maxScore: 60, sortOrder: 3 },
  ];

  for (const cat of categories) {
    await prisma.assignmentCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`  ✅ Assignment categories: ${categories.map(c => c.name).join(', ')}`);

  // 3. Behavioural Traits
  const affectiveTraits = [
    'Punctuality',
    'Neatness',
    'Attentiveness',
    'Honesty',
    'Politeness',
    'Perseverance',
    'Cooperation',
    'Obedience',
    'Self-Control',
    'Leadership',
  ];

  const psychomotorTraits = [
    'Handwriting',
    'Sports & Games',
    'Drawing & Painting',
    'Music',
    'Crafts',
    'Public Speaking',
    'Lab Work',
  ];

  let sortOrder = 1;
  for (const name of affectiveTraits) {
    await prisma.behaviouralTrait.upsert({
      where: { name },
      update: {},
      create: { name, category: 'AFFECTIVE', sortOrder: sortOrder++ },
    });
  }

  for (const name of psychomotorTraits) {
    await prisma.behaviouralTrait.upsert({
      where: { name },
      update: {},
      create: { name, category: 'PSYCHOMOTOR', sortOrder: sortOrder++ },
    });
  }
  console.log(`  ✅ Behavioural traits: ${affectiveTraits.length} affective, ${psychomotorTraits.length} psychomotor`);

  console.log('🎓 Academic seed complete!');
}

seedAcademics()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
