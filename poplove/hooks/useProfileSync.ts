// hooks/useProfileSync.ts
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthContext } from '../components/auth/AuthProvider';
import { firestore } from '../lib/firebase';
import { useStorage } from './useStorage';

/**
 * Custom hook to handle profile updates and sync them across the app
 * This manages profile photo updates, ensuring they're reflected in chat matches
 * and storing previous photos in the user's media gallery
 */
export const useProfileSync = () => {
  const { user } = useAuthContext();
  const { uploadProfileImage } = useStorage();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Updates the user's profile photo across the app
   * @param newPhotoUri - The URI of the new profile photo
   * @returns Promise with the download URL of the new photo
   */
  const updateProfilePhoto = async (newPhotoUri: string): Promise<string | null> => {
    if (!user || !newPhotoUri) return null;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      // 1. Get the current profile photo URL
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const currentPhotoURL = userDoc.exists() ? userDoc.data().photoURL : null;
      
      // 2. Upload the new photo to storage
      const downloadUrl = await uploadProfileImage(newPhotoUri);
      
      if (!downloadUrl) {
        throw new Error('Failed to upload profile image');
      }
      
      // 3. Update the user document with the new photo URL
      await updateDoc(userDocRef, {
        photoURL: downloadUrl,
        updatedAt: serverTimestamp()
      });
      
      // 4. Archive the old photo if it exists and is different from the new one
      if (currentPhotoURL && currentPhotoURL !== downloadUrl) {
        await archiveOldProfilePhoto(currentPhotoURL);
      }
      
      // 5. Update all chat matches to use the new photo URL
      await updateChatProfilePhotos(downloadUrl);
      
      return downloadUrl;
    } catch (error) {
      console.error('Error updating profile photo:', error);
      setError('Failed to update profile photo');
      return null;
    } finally {
      setIsUpdating(false);
    }
  };
  
  /**
   * Archives the old profile photo to the user's media gallery
   * @param oldPhotoURL - The URL of the old profile photo
   */
  const archiveOldProfilePhoto = async (oldPhotoURL: string): Promise<void> => {
    if (!user || !oldPhotoURL) return;
    
    try {
      // Add to user's media gallery
      const mediaRef = collection(firestore, 'users', user.uid, 'media');
      await addDoc(mediaRef, {
        imageURL: oldPhotoURL,
        type: 'photo',
        isProfilePhoto: false,
        wasProfilePhoto: true,
        createdAt: serverTimestamp(),
        description: 'Previous profile photo'
      });
      
      console.log('Archived old profile photo to media gallery');
    } catch (error) {
      console.error('Error archiving old profile photo:', error);
    }
  };
  
  /**
   * Updates the user's profile photo in all chat matches
   * @param newPhotoURL - The URL of the new profile photo
   */
  const updateChatProfilePhotos = async (newPhotoURL: string): Promise<void> => {
    if (!user || !newPhotoURL) return;
    
    try {
      // First, get all matches where this user is a participant
      const matchesRef = collection(firestore, 'matches');
      const matchesSnapshot = await getDoc(doc(firestore, `users/${user.uid}/matchList/summary`));
      
      if (!matchesSnapshot.exists()) return;
      
      const matchIds = matchesSnapshot.data().matches || [];
      
      // Update user profile in each match
      for (const matchId of matchIds) {
        const matchRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchRef);
        
        if (matchDoc.exists()) {
          const matchData = matchDoc.data();
          
          // If the match contains the user's profile, update it
          if (matchData.userProfiles && matchData.userProfiles[user.uid]) {
            // Update only the photo URL, keeping other profile data
            await updateDoc(matchRef, {
              [`userProfiles.${user.uid}.photoURL`]: newPhotoURL,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      
      console.log('Updated profile photo in all chat matches');
    } catch (error) {
      console.error('Error updating profile photos in chats:', error);
    }
  };

  return {
    isUpdating,
    error,
    updateProfilePhoto
  };
};