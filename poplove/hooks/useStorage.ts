// hooks/useStorage.ts - FIXED VERSION
import { useState } from 'react';
import { Alert } from 'react-native';
import { StorageService } from '../services/storage';
import { useAuthContext } from '../components/auth/AuthProvider';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, addDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Custom hook for handling storage operations with syncing across app
 */
export const useStorage = () => {
  const { user } = useAuthContext();
  const [uploading, setUploading] = useState(false);
  
  /**
   * Upload a profile picture and sync across all app components
   * @param uri Local URI of the image
   * @returns Download URL of the uploaded image or null if failed
   */
  const uploadProfileImage = async (uri: string): Promise<string | null> => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to upload an image');
      return null;
    }
    
    setUploading(true);
    
    try {
      // 1. Get current photo URL before updating
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const oldPhotoURL = userDoc.exists() ? userDoc.data().photoURL : null;
      
      // 2. Upload to Firebase Storage using existing StorageService
      const downloadUrl = await StorageService.uploadProfileImage(uri, user.uid);
      
      if (!downloadUrl) {
        throw new Error('Failed to upload image');
      }
      
      // 3. Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadUrl
        });
      }
      
      // 4. Update user document in Firestore
      await updateDoc(userDocRef, {
        photoURL: downloadUrl,
        updatedAt: serverTimestamp()
      });
      
      // 5. Update all chat matches where this user appears
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      const matchesSnapshot = await getDocs(q);
      
      if (!matchesSnapshot.empty) {
        const batch = writeBatch(firestore);
        
        matchesSnapshot.docs.forEach(matchDoc => {
          batch.update(matchDoc.ref, {
            [`userProfiles.${user.uid}.photoURL`]: downloadUrl,
            updatedAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log(`Updated photo in ${matchesSnapshot.size} chat matches`);
      }
      
      // 6. Archive old photo to media gallery if it exists and is different
      if (oldPhotoURL && oldPhotoURL !== downloadUrl) {
        // Check if this photo already exists in the media gallery
        const mediaRef = collection(firestore, 'users', user.uid, 'media');
        const mediaQuery = query(mediaRef, where('imageURL', '==', oldPhotoURL));
        const mediaSnapshot = await getDocs(mediaQuery);
        
        // Only add if not already in media gallery
        if (mediaSnapshot.empty) {
          await addDoc(mediaRef, {
            imageURL: oldPhotoURL,
            type: 'photo',
            isProfilePhoto: false,
            wasProfilePhoto: true,
            createdAt: serverTimestamp(),
            description: 'Previous profile photo'
          });
        }
      }
      
      // 7. Add new photo to media gallery
      const mediaRef = collection(firestore, 'users', user.uid, 'media');
      await addDoc(mediaRef, {
        imageURL: downloadUrl,
        type: 'photo',
        isProfilePhoto: true,
        wasProfilePhoto: false,
        createdAt: serverTimestamp(),
        description: 'Current profile photo'
      });
      
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      return null;
    } finally {
      setUploading(false);
    }
  };
  
  /**
   * Pick an image from the device gallery
   * @returns Selected image URI or null if canceled/failed
   */
  const pickImage = async (): Promise<string | null> => {
    try {
      return await StorageService.pickImage();
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  };
  
  /**
   * Take a photo using the device camera
   * @returns Captured image URI or null if canceled/failed
   */
  const takePhoto = async (): Promise<string | null> => {
    try {
      return await StorageService.takePhoto();
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  };
  
  /**
   * Delete an image from storage
   * @param url Download URL of the image to delete
   * @returns Whether deletion was successful
   */
  const deleteImage = async (url: string): Promise<boolean> => {
    try {
      await StorageService.deleteImage(url);
      return true;
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image. Please try again.');
      return false;
    }
  };
  
  return {
    uploading,
    uploadProfileImage,
    pickImage,
    takePhoto,
    deleteImage
  };
};