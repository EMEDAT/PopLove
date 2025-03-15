// components/profile/ProfileImageChanger.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Modal,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { useStorage } from '../../hooks/useStorage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

interface ProfileImageChangerProps {
  photoURL: string | null;
  onImageUpdated?: (newUrl: string) => void;
}

export default function ProfileImageChanger({ photoURL, onImageUpdated }: ProfileImageChangerProps) {
  const { user } = useAuthContext();
  const { pickImage, takePhoto, uploadProfileImage, uploading } = useStorage();
  const [showOptions, setShowOptions] = useState(false);
  
  const handlePickImage = async () => {
    try {
      const imageUri = await pickImage();
      
      if (imageUri) {
        const downloadUrl = await uploadProfileImage(imageUri);
        
        if (downloadUrl && user) {
          // Update auth profile
          await updateProfile(user, {
            photoURL: downloadUrl
          });
          
          // Update Firestore document
          await updateDoc(doc(firestore, 'users', user.uid), {
            photoURL: downloadUrl,
            updatedAt: serverTimestamp()
          });
          
          // Notify parent component
          if (onImageUpdated) {
            onImageUpdated(downloadUrl);
          }
          
          Alert.alert('Success', 'Profile picture updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setShowOptions(false);
    }
  };
  
  const handleTakePhoto = async () => {
    try {
      const imageUri = await takePhoto();
      
      if (imageUri) {
        const downloadUrl = await uploadProfileImage(imageUri);
        
        if (downloadUrl && user) {
          // Update auth profile
          await updateProfile(user, {
            photoURL: downloadUrl
          });
          
          // Update Firestore document
          await updateDoc(doc(firestore, 'users', user.uid), {
            photoURL: downloadUrl,
            updatedAt: serverTimestamp()
          });
          
          // Notify parent component
          if (onImageUpdated) {
            onImageUpdated(downloadUrl);
          }
          
          Alert.alert('Success', 'Profile picture updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Error', 'Failed to update profile picture');
    } finally {
      setShowOptions(false);
    }
  };
  
  return (
    <View>
      {/* Show the original profile image styling, but make it touchable */}
      <TouchableOpacity 
        onPress={() => setShowOptions(true)}
        disabled={uploading}
      >
        {photoURL ? (
          <Image 
            source={{ uri: photoURL }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="person" size={40} color="#999" />
          </View>
        )}
        
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
      
      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Change Profile Photo</Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handlePickImage}
            >
              <Ionicons name="image-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionItem, styles.cancelOption]}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 2,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 20,
    paddingBottom: 30,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
  },
  cancelOption: {
    justifyContent: 'center',
    marginTop: 0,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
    textAlign: 'center',
  },
});