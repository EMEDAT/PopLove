// lib/firebase.ts
import app from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Export Firebase services (must be called as functions)
export { auth, firestore, storage };

// Export Firestore timestamp
export const serverTimestamp = firestore.FieldValue.serverTimestamp;