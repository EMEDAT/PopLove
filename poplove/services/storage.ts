// services/storage.ts

import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../lib/firebase';

/**
 * Service for managing file storage operations
 */
export class StorageService {
  /**
   * Upload user profile image to Firebase Storage
   * @param uri Local URI of the image
   * @param userId User ID for the profile
   * @returns Promise that resolves to the download URL
   */
  static async uploadProfileImage(uri: string, userId: string): Promise<string> {
    if (!uri || !userId) {
      throw new Error('Invalid image URI or user ID');
    }
    
    try {
      // Handle file URI based on platform
      let fileUri = uri;
      if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
        fileUri = `file://${uri}`;
      }
      
      // Create a unique filename
      const fileName = `profile_${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage(), `profile_images/${fileName}`);
      
      console.log('Uploading to path:', `profile_images/${fileName}`);
      console.log('File URI:', fileUri);
      
      // Upload the file
      await uploadBytesResumable(storageRef, fileUri);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
  
  /**
   * Pick an image from the device gallery
   * @returns Promise that resolves to the selected image URI or null if canceled
   */
  static async pickImage(): Promise<string | null> {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access media library was denied');
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }
  
  /**
   * Take a photo using the device camera
   * @returns Promise that resolves to the captured image URI or null if canceled
   */
  static async takePhoto(): Promise<string | null> {
    try {
      // Request permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Permission to access camera was denied');
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }
  
  /**
   * Delete an image from Firebase Storage
   * @param url Download URL of the image to delete
   */
  static async deleteImage(url: string): Promise<void> {
    if (!url) return;
    
    try {
      const storageRef = ref(storage(), url);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }
}

export default StorageService;