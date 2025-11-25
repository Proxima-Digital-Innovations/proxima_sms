import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

// Check for Emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('Running against Firestore Emulator...');
    admin.initializeApp({
        projectId: 'demo-school-system',
    });
} else if (fs.existsSync(serviceAccountPath)) {
    console.log('Running against Production Firebase...');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} else {
    console.error('Error: service-account.json not found and FIRESTORE_EMULATOR_HOST not set.');
    console.error('To run against emulator: export FIRESTORE_EMULATOR_HOST="localhost:8080"');
    console.error('To run against production: Place service-account.json in the root directory.');
    process.exit(1);
}

const db = admin.firestore();

const DATA_FILE = path.join(__dirname, '../data/firestore_data.json');

async function seed() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: Data file not found. Run transform.js first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Starting seeding process (Firestore only, skipping Auth)...');

    // Note: We skip Auth user creation to avoid emulator dependency
    // Users can be created manually or through the app's signup flow

    // 1. Students
    console.log(`Seeding ${data.students.length} students...`);
    const batch1 = db.batch();
    let count = 0;
    for (const student of data.students) {
        const ref = db.collection('students').doc(student.id);
        batch1.set(ref, {
            ...student,
            createdAt: student.createdAt ? admin.firestore.Timestamp.fromDate(new Date(student.createdAt)) : admin.firestore.FieldValue.serverTimestamp(),
            dateOfBirth: student.dateOfBirth ? admin.firestore.Timestamp.fromDate(new Date(student.dateOfBirth)) : null,
        }, { merge: true });
        count++;
        if (count % 500 === 0) {
            await batch1.commit();
            console.log(`  Committed ${count} students...`);
        }
    }
    if (count % 500 !== 0) await batch1.commit();
    console.log(`✓ Seeded ${data.students.length} students`);

    // 2. Classes
    console.log(`Seeding ${data.classes.length} classes...`);
    for (const cls of data.classes) {
        await db.collection('classes').doc(cls.id).set(cls, { merge: true });
    }
    console.log(`✓ Seeded ${data.classes.length} classes`);

    // 3. Subjects
    console.log(`Seeding ${data.subjects.length} subjects...`);
    for (const sub of data.subjects) {
        await db.collection('subjects').doc(sub.id).set(sub, { merge: true });
    }
    console.log(`✓ Seeded ${data.subjects.length} subjects`);

    // 4. Scores
    console.log(`Seeding ${data.scores.length} scores...`);
    const batch2 = db.batch();
    count = 0;
    for (const score of data.scores) {
        const ref = db.collection('scores').doc(score.id);
        batch2.set(ref, {
            ...score,
            totalScore: score.caScore + score.examScore
        }, { merge: true });
        count++;
        if (count % 500 === 0) {
            await batch2.commit();
            console.log(`  Committed ${count} scores...`);
        }
    }
    if (count % 500 !== 0) await batch2.commit();
    console.log(`✓ Seeded ${data.scores.length} scores`);

    // 5. Payments
    console.log(`Seeding ${data.payments.length} payments...`);
    for (const pay of data.payments) {
        await db.collection('payments').doc(pay.id).set({
            ...pay,
            paymentDate: pay.paymentDate ? admin.firestore.Timestamp.fromDate(new Date(pay.paymentDate)) : admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    console.log(`✓ Seeded ${data.payments.length} payments`);

    // 6. Inventory
    console.log(`Seeding ${data.inventory.length} inventory items...`);
    for (const item of data.inventory) {
        await db.collection('inventory').doc(item.id).set({
            ...item,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(item.createdAt)),
            expiryDate: item.expiryDate ? admin.firestore.Timestamp.fromDate(new Date(item.expiryDate)) : null
        }, { merge: true });
    }
    console.log(`✓ Seeded ${data.inventory.length} inventory items`);

    // 7. Tahfeez
    console.log(`Seeding ${data.tahfeez.length} tahfeez results...`);
    for (const res of data.tahfeez) {
        await db.collection('tahfeez').doc(res.id).set({
            ...res,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(res.createdAt))
        }, { merge: true });
    }
    console.log(`✓ Seeded ${data.tahfeez.length} tahfeez results`);

    console.log('\n✅ Seeding complete!');
    console.log('\nNote: Auth users were NOT created. You can:');
    console.log('  1. Create admin users manually in Firebase Console');
    console.log('  2. Use the app\'s signup flow to create new users');
    console.log('  3. Run the full seed.ts script with emulators running');
}

seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
