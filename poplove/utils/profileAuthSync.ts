// utils/profileAuthSync.ts
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Updates the user's profile in Firebase Authentication
 * This ensures the auth profile is in sync with Firestore data
 * @param displayName The display name to update (optional)
 * @param photoURL The photo URL to update (optional)
 * @returns Promise that resolves when the profile is updated
 */
export const updateAuthProfile = async (
  displayName?: string | null,
  photoURL?: string | null
): Promise<void> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('No authenticated user found');
    return;
  }
  
  const updates: {
    displayName?: string;
    photoURL?: string;
  } = {};
  
  // Only include properties that are provided
  if (displayName !== undefined && displayName !== null) {
    updates.displayName = displayName;
  }
  
  if (photoURL !== undefined && photoURL !== null) {
    updates.photoURL = photoURL;
  }
  
  // Skip update if no changes
  if (Object.keys(updates).length === 0) {
    return;
  }
  
  try {
    await updateProfile(currentUser, updates);
    console.log('Auth profile updated successfully');
  } catch (error) {
    console.error('Error updating auth profile:', error);
    throw error;
  }
};

/**
 * Refreshes current user data from Firebase Auth
 * This is useful after making changes through other means
 * @returns Promise with the latest user data
 */
export const refreshAuthUser = async () => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('No authenticated user found');
    return null;
  }
  
  try {
    await currentUser.reload();
    return auth.currentUser;
  } catch (error) {
    console.error('Error refreshing user data:', error);
    return null;
  }
};