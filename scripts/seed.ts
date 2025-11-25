import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
// Note: This requires GOOGLE_APPLICATION_CREDENTIALS or a service account key file.
// For local emulator, it might work without if configured correctly.
// Assuming we are running this locally with credentials available.

const serviceAccountPath = '/home/hxncodes/Desktop/giia_school_system/haschat-31cbd-firebase-adminsdk-p5i42-45dd78320d.json';

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
const auth = admin.auth();

const DATA_FILE = path.join(__dirname, '../data/firestore_data.json');

async function seed() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: Data file not found. Run transform.js first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log('Starting seeding process...');

    // 1. Users
    console.log(`Seeding ${data.users.length} users...`);
    for (const user of data.users) {
        try {
            // Create Auth User
            try {
                await auth.createUser({
                    uid: user.uid,
                    email: user.email,
                    password: 'ChangeMe123!', // Default password
                    displayName: `${user.firstName} ${user.lastName}`
                });
            } catch (e: any) {
                if (e.code === 'auth/uid-already-exists') {
                    console.log(`User ${user.email} already exists. Updating...`);
                    await auth.updateUser(user.uid, {
                        email: user.email,
                        displayName: `${user.firstName} ${user.lastName}`
                    });
                } else {
                    console.error(`Failed to create user ${user.email}:`, e.message);
                }
            }

            // Create Firestore Document
            await db.collection('users').doc(user.uid).set({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                createdAt: admin.firestore.Timestamp.fromDate(new Date(user.createdAt)),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

        } catch (error) {
            console.error(`Error processing user ${user.email}:`, error);
        }
    }

    // 2. Students
    console.log(`Seeding ${data.students.length} students...`);
    for (const student of data.students) {
        await db.collection('students').doc(student.id).set({
            ...student,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(student.createdAt)),
            // Convert nested dates if any?
        }, { merge: true });
    }

    // 3. Classes
    console.log(`Seeding ${data.classes.length} classes...`);
    for (const cls of data.classes) {
        await db.collection('classes').doc(cls.id).set(cls, { merge: true });
    }

    // 4. Subjects
    console.log(`Seeding ${data.subjects.length} subjects...`);
    for (const sub of data.subjects) {
        await db.collection('subjects').doc(sub.id).set(sub, { merge: true });
    }

    // 5. Scores
    console.log(`Seeding ${data.scores.length} scores...`);
    for (const score of data.scores) {
        await db.collection('scores').doc(score.id).set(score, { merge: true });
    }

    // 6. Payments
    console.log(`Seeding ${data.payments.length} payments...`);
    for (const pay of data.payments) {
        await db.collection('payments').doc(pay.id).set({
            ...pay,
            paymentDate: admin.firestore.Timestamp.fromDate(new Date(pay.paymentDate))
        }, { merge: true });
    }

    // 7. Inventory
    console.log(`Seeding ${data.inventory.length} inventory items...`);
    for (const item of data.inventory) {
        await db.collection('inventory').doc(item.id).set({
            ...item,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(item.createdAt))
        }, { merge: true });
    }

    // 8. Tahfeez
    console.log(`Seeding ${data.tahfeez.length} tahfeez results...`);
    for (const res of data.tahfeez) {
        await db.collection('tahfeez').doc(res.id).set({
            ...res,
            createdAt: admin.firestore.Timestamp.fromDate(new Date(res.createdAt))
        }, { merge: true });
    }

    console.log('Seeding complete!');
}

seed().catch(console.error);
