// poplove\lib\storage.ts

import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fetchFromUri } from '../utils/fetch';

export const uploadImageToStorage = async (uri: string, path: string): Promise<string> => {
  // Prepare the file URI for upload
  let fileUri = uri;
  if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
    fileUri = `file://${uri}`;
  }
  
  try {
    // Create a reference to the intended location
    const storageRef = ref(storage, path);
    
    // Fetch file data as a blob
    const fileData = await fetchFromUri(fileUri);
    
    // Upload the file
    await uploadBytes(storageRef, fileData);
    
    // Get and return the download URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const pickImageFromLibrary = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    return result.canceled || !result.assets ? null : result.assets[0].uri;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

export const takePhotoWithCamera = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access camera was denied');
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    return result.canceled || !result.assets ? null : result.assets[0].uri;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

export const deleteImage = async (url: string): Promise<void> => {
  if (!url) return;
  
  try {
    const reference = ref(storage, url);
    await deleteObject(reference);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};