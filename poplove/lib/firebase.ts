// lib/firebase.ts

import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
import '@react-native-firebase/storage';

// Get Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase app with config
let app;
try {
  app = firebase.app();
} catch (error) {
  // Make sure we have the required fields
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error("Firebase config missing required fields. Check your environment variables.");
    // Use default values for development
    firebaseConfig.apiKey = "AIzaSyDLEfJcQWNxgbZYsHSBiGisped006zpL-w";
    firebaseConfig.projectId = "poplove-32987";
    firebaseConfig.appId = "1:781404328808:web:7c503d7bf427e58dc37cdd";
  }
  
  app = firebase.initializeApp(firebaseConfig);
}

// Get service instances directly from firebase
const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();

// Optional: Disable Firestore offline persistence if it's causing issues
firestore.settings({
  persistence: false
});

// Log initialization in dev mode
if (__DEV__) {
  console.log('Firebase modules initialized');
}

export { auth, firestore, storage };
export const GoogleAuthProvider = firebase.auth.GoogleAuthProvider;
export const AppleAuthProvider = firebase.auth.AppleAuthProvider;
export const serverTimestamp = firebase.firestore.FieldValue.serverTimestamp;