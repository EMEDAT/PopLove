// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import { getFirestore, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Log Firebase config for debugging (remove in production)
console.log('Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? 'Configured' : 'Missing',
  authDomain: firebaseConfig.authDomain ? 'Configured' : 'Missing',
  projectId: firebaseConfig.projectId ? 'Configured' : 'Missing',
  storageBucket: firebaseConfig.storageBucket ? 'Configured' : 'Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? 'Configured' : 'Missing',
  appId: firebaseConfig.appId ? 'Configured' : 'Missing',
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const serverTimestamp = firestoreServerTimestamp;

// Export the services
export { 
  auth, 
  firestore, 
  storage,
  serverTimestamp,
  User
};

export default app;