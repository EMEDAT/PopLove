// components/onboarding/ImageUpload.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Text, Modal, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import storage from '@react-native-firebase/storage';

type ImageUploadProps = {
  onChange: (url: string) => void;
  value?: string;
  uploading?: boolean;
};

export function ImageUpload({ onChange, value, uploading = false }: ImageUploadProps) {
  const { user } = useAuthContext();
  const [modalVisible, setModalVisible] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  const isUploading = uploading || localUploading;

  const handleImageSelection = async (type: 'camera' | 'library') => {
    try {
      // Close modal first
      setModalVisible(false);
      
      let result;
      
      if (type === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Error selecting image. Please try again.');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!uri || !user) return;
  
    try {
      setLocalUploading(true);
      
      // Handle file URI based on platform
      let fileUri = uri;
      if (Platform.OS === 'ios' && !uri.startsWith('file://')) {
        fileUri = `file://${uri}`;
      }
      
      // Create a unique filename
      const fileName = `profile_${user.uid}_${Date.now()}.jpg`;
      const reference = storage().ref(`profile_images/${fileName}`);
      
      console.log('Uploading to path:', `profile_images/${fileName}`);
      console.log('File URI:', fileUri);
      
      // Upload the file directly
      await reference.putFile(fileUri);
      
      // Get the download URL
      const downloadURL = await reference.getDownloadURL();
      console.log('Download URL:', downloadURL);
      
      // Update the UI with the new image URL
      onChange(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert(
        "Upload Failed", 
        `Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setLocalUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.profileImageContainer}>
          {value ? (
            <Image 
              source={{ uri: value }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="person" size={40} color="#000000" />
            </View>
          )}
          
          <TouchableOpacity 
            onPress={() => setModalVisible(true)}
            disabled={isUploading}
            style={styles.cameraButtonContainer}
          >
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={14} color="white" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.helperText}>Upload Profile Picture</Text>
      
      {/* Photo Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profile Photo</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => handleImageSelection('camera')}
              >
                <View style={styles.modalIconContainer}>
                  <Ionicons name="camera-outline" size={24} color="#000" />
                </View>
                <Text style={styles.modalOptionText}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalOption}
                onPress={() => handleImageSelection('library')}
              >
                <View style={styles.modalIconContainer}>
                  <Ionicons name="image-outline" size={24} color="#000" />
                </View>
                <Text style={styles.modalOptionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    width: '100%',
    position: 'relative',
  },
  profileContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFE7CC',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // overflow: 'hidden',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  cameraButtonContainer: {
    position: 'absolute',
    bottom: 1,
    right: 1,
  },
  cameraButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    backgroundColor: '#667185',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  uploadingText: {
    color: 'white',
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  modalOption: {
    alignItems: 'center',
    width: 80,
  },
  modalIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 14,
  },
});