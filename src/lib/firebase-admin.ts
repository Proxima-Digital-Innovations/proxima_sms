
import * as admin from 'firebase-admin';
import { headers } from 'next/headers';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Initialize without credentials in environments where they are automatically provided
    // (like some Google Cloud environments)
    admin.initializeApp();
  }
}

async function getAuthenticatedUser() {
    const headersList = await headers();
    const sessionCookie = headersList.get('x-session-cookie');
    if (!sessionCookie) return null;

    try {
        const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
        return decodedToken;
    } catch (error) {
        console.error("Error verifying session cookie:", error);
        return null;
    }
}


export { admin, getAuthenticatedUser };
