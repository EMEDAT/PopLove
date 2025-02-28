import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

// Explicitly export the FieldValue for serverTimestamp
const serverTimestamp = firestore.FieldValue.serverTimestamp;

export { 
  auth, 
  firestore, 
  storage,
  serverTimestamp
};