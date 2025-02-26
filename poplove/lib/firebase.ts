// poplove\lib\firebase.ts

import auth from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Initialize Firestore correctly
const firestore = getFirestore();

// Disable Firestore offline persistence if it's causing issues
firestore.settings({
  persistence: false
});

// Initialize Firebase
const initializeFirebase = () => {
  try {
    if (__DEV__) {
      console.log('Firebase modules initialized');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

initializeFirebase();

export { auth, firestore, storage };
