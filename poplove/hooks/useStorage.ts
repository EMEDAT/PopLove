// hooks/useStorage.ts
import { useState } from 'react';
import { Alert } from 'react-native';
import { StorageService } from '../services/storage';
import { useAuthContext } from '../components/auth/AuthProvider';

/**
 * Custom hook for handling storage operations
 */
export const useStorage = () => {
  const { user } = useAuthContext();
  const [uploading, setUploading] = useState(false);
  
  /**
   * Upload a profile picture
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
      const downloadUrl = await StorageService.uploadProfileImage(uri, user.uid);
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