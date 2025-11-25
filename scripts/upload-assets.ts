import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin (reusing same logic as seed script)
const serviceAccountPath = '/home/hxncodes/Desktop/giia_school_system/haschat-31cbd-firebase-adminsdk-p5i42-45dd78320d.json';

if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('Running against Firebase Storage Emulator...');
    admin.initializeApp({
        projectId: 'demo-school-system',
    });
} else if (fs.existsSync(serviceAccountPath)) {
    console.log('Running against Production Firebase...');
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'haschat-31cbd.appspot.com'
    });
} else {
    console.error('Error: service-account.json not found and FIRESTORE_EMULATOR_HOST not set.');
    process.exit(1);
}

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

const DJANGO_MEDIA_PATH = path.join(__dirname, '../../giia.com.ng/media/pics');
const DATA_FILE = path.join(__dirname, '../data/firestore_data.json');

async function uploadAssets() {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('Error: firestore_data.json not found. Run transform.js first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Processing ${data.students.length} students...`);

    let uploadedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const student of data.students) {
        // Check if student has a photo path from Django
        const studentPhotoPath = student.photoPath; // We'll add this in transform.js
        if (!studentPhotoPath) {
            console.log(`No photo path for ${student.firstName} ${student.lastName}`);
            notFoundCount++;
            continue;
        }

        const localPhotoPath = path.join(DJANGO_MEDIA_PATH, studentPhotoPath);
        
        if (!fs.existsSync(localPhotoPath)) {
            console.log(`Photo not found: ${localPhotoPath}`);
            notFoundCount++;
            continue;
        }

        try {
            // Upload to Firebase Storage
            const destination = `students/photos/${student.studentId}.jpg`;
            await bucket.upload(localPhotoPath, {
                destination,
                metadata: {
                    contentType: 'image/jpeg',
                },
            });

            // Make the file publicly accessible
            await bucket.file(destination).makePublic();

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;

            // Update student in Firestore
            await db.collection('students').doc(student.id).update({
                profilePicture: publicUrl
            });

            console.log(`✓ Uploaded photo for ${student.firstName} ${student.lastName}`);
            uploadedCount++;

        } catch (error) {
            console.error(`✗ Error uploading photo for ${student.firstName} ${student.lastName}:`, error);
            errorCount++;
        }
    }

    console.log('\n=== Upload Summary ===');
    console.log(`Total students: ${data.students.length}`);
    console.log(`Photos uploaded: ${uploadedCount}`);
    console.log(`Photos not found: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);
}

uploadAssets()
    .then(() => {
        console.log('\n✅ Asset migration complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Asset migration failed:', error);
        process.exit(1);
    });
