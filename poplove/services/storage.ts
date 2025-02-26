// poplove\services\storage.ts

import { 
    uploadImageToStorage, 
    pickImageFromLibrary, 
    takePhotoWithCamera, 
    deleteImage as deleteStorageImage
  } from '../lib/storage';
  
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
      const path = `profile_images/profile_${userId}_${Date.now()}.jpg`;
      return uploadImageToStorage(uri, path);
    }
    
    /**
     * Pick an image from the device gallery
     * @returns Promise that resolves to the selected image URI or null if canceled
     */
    static async pickImage(): Promise<string | null> {
      return pickImageFromLibrary();
    }
    
    /**
     * Take a photo using the device camera
     * @returns Promise that resolves to the captured image URI or null if canceled
     */
    static async takePhoto(): Promise<string | null> {
      return takePhotoWithCamera();
    }
    
    /**
     * Delete an image from Firebase Storage
     * @param url Download URL of the image to delete
     */
    static async deleteImage(url: string): Promise<void> {
      return deleteStorageImage(url);
    }
  }