import admin from "firebase-admin";

let firebaseApp;

function getFirebaseCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  });
}

function getFirebaseAdminApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  firebaseApp = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: getFirebaseCredential(),
      });

  return firebaseApp;
}

export async function verifyFirebaseIdToken(idToken) {
  const app = getFirebaseAdminApp();
  return app.auth().verifyIdToken(idToken);
}
