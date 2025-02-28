// lib/firebase.ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// No need to import app or check initialization - Firebase auto-initializes
console.log('Firebase modules loaded');

// Export Firebase services
export { auth, firestore, storage };

// Export Firestore timestamp
export const serverTimestamp = firestore.FieldValue.serverTimestamp;