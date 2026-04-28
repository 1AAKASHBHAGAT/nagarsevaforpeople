import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging, onMessage } from "firebase/messaging";

// ⚠️ IMPORTANT: Replace with your actual Firebase config from console.firebase.google.com
// Get these values by creating a new Firebase project and registering a web app
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyDemoKeyReplaceWithYourKey123456",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "nagarseva-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nagarseva-demo",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "nagarseva-demo.appspot.com",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:123456789012:web:abcdef1234567890",
};

const firebaseConfigured =
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes("DemoKeyReplaceWithYourKey") &&
  !firebaseConfig.projectId.includes("YOUR_") &&
  !firebaseConfig.projectId.includes("-demo");

// Initialize Firebase only if properly configured
let app = null;
let auth = null;
let db = null;
let storage = null;
let messaging = null;

if (firebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Initialize messaging (for push notifications)
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.log("Messaging not available in this environment");
  }
}

// Export services (null if not configured)
export { auth, db, storage, messaging };
export const isFirebaseConfigured = firebaseConfigured;

// Use emulators in development (optional - comment out for production)
// const USE_EMULATORS = true;
// if (USE_EMULATORS && !auth.currentUser) {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectStorageEmulator(storage, 'localhost', 9199);
// }

export default app;
