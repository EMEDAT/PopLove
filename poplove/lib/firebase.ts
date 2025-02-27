// lib/firebase.ts

import { initializeApp, getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';

// Initialize Firebase app
let app;
try {
  app = getApp();
} catch (error) {
  app = initializeApp();
}

// Initialize services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Optional: Disable Firestore offline persistence if it's causing issues
firestore.settings({
  persistence: false
});

// Log initialization in dev mode
if (__DEV__) {
  console.log('Firebase modules initialized');
}

export { auth, firestore, storage };