// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth, User } from 'firebase/auth';
import { getFirestore, serverTimestamp as firestoreServerTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLEfJcQWNxgbZYsHSBiGisped006zpL-w",
  authDomain: "poplove-32987.firebaseapp.com",
  projectId: "poplove-32987",
  storageBucket: "poplove-32987.firebasestorage.app",
  messagingSenderId: "781404328808",
  appId: "1:781404328808:web:7c503d7bf427e58dc37cdd",
};

// Log Firebase config for debuggingnote
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

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);
const serverTimestamp = firestoreServerTimestamp;

// Set up manual auth persistence with AsyncStorage
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Store minimal user data in AsyncStorage
    try {
      await AsyncStorage.setItem('auth_user', JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }));
      console.log('User data saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  } else {
    // Remove user data on logout
    try {
      await AsyncStorage.removeItem('auth_user');
      console.log('User data removed from AsyncStorage');
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  }
});

// Export the services
export {
  auth,
  firestore,
  storage,
  serverTimestamp,
  User
};

export default app;