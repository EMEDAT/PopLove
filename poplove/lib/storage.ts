// poplove\lib\storage.ts

import storage from '@react-native-firebase/storage';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * Upload an image to Firebase Storage
 * @param uri Local URI of the image to upload
 * @param path Path in storage where the image should be saved
 * @returns Promise that resolves to the download URL
 */
export const uploadImageToStorage = async (uri: string, path: string): Promise<string> => {
  // Create a reference to the intended location
  const storageRef = storage().ref(path);
  
  // Prepare the file URI for upload
  let fileUri = uri;
  if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
    fileUri = `file://${uri}`;
  }
  
  try {
    // Upload the file
    await storageRef.putFile(fileUri);
    
    // Get and return the download URL
    const downloadUrl = await storageRef.getDownloadURL();
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

/**
 * Pick an image from the device gallery
 * @returns Promise that resolves to the selected image URI or null if canceled
 */
export const pickImageFromLibrary = async (): Promise<string | null> => {
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
};

/**
 * Take a photo using the device camera
 * @returns Promise that resolves to the captured image URI or null if canceled
 */
export const takePhotoWithCamera = async (): Promise<string | null> => {
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
};

/**
 * Delete an image from Firebase Storage
 * @param url Download URL of the image to delete
 */
export const deleteImage = async (url: string): Promise<void> => {
  if (!url) return;
  
  try {
    const reference = storage().refFromURL(url);
    await reference.delete();
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};