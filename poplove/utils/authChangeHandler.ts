// utils/authChangeHandler.ts
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';
import MatchSyncService from '../services/matchSyncService';

/**
 * Initialize auth change handler
 * This ensures profile changes in Firebase Auth are synced to Firestore and matches
 */
export const initAuthChangeHandler = () => {
  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in, check if profile info needs syncing
      await syncAuthProfileToFirestore(user);
    }
  });
};

/**
 * Sync user profile from Firebase Auth to Firestore and matches
 * @param user - Firebase Auth user object
 */
export const syncAuthProfileToFirestore = async (user: any) => {
  if (!user) return;
  
  try {
    // Get current Firestore data
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    // If user document exists, check if profile data needs updating
    if (userDoc.exists()) {
      const userData = userDoc.data();
      let hasChanges = false;
      const updates: { [key: string]: any } = {};
      
      // Check if display name needs updating
      if (user.displayName && user.displayName !== userData.displayName) {
        updates.displayName = user.displayName;
        hasChanges = true;
      }
      
      // Check if photo URL needs updating
      if (user.photoURL && user.photoURL !== userData.photoURL) {
        updates.photoURL = user.photoURL;
        hasChanges = true;
      }
      
      // Update Firestore if there are changes
      if (hasChanges) {
        updates.updatedAt = serverTimestamp();
        await updateDoc(userDocRef, updates);
        
        // Sync changes to matches
        if (updates.displayName) {
          await MatchSyncService.updateDisplayName(user.uid, updates.displayName);
        }
        
        if (updates.photoURL) {
          await MatchSyncService.updateProfilePhoto(user.uid, updates.photoURL);
        }
        
        // Ensure match list summary is up-to-date
        await MatchSyncService.ensureMatchListSummary(user.uid);
      }
    } else {
      // User document doesn't exist, create it with auth profile data
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error syncing auth profile to Firestore:', error);
  }
};

export default {
  initAuthChangeHandler,
  syncAuthProfileToFirestore
};