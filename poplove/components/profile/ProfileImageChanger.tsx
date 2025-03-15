// components/profile/ProfileImageChanger.tsx
import React, { useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  Text,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { useStorage } from '../../hooks/useStorage';
import MatchSyncService from '../../services/matchSyncService';

interface ProfileImageChangerProps {
  photoURL: string | null;
  onImageUpdated: (newPhotoURL: string) => void;
}

const ProfileImageChanger: React.FC<ProfileImageChangerProps> = ({ 
  photoURL, 
  onImageUpdated 
}) => {
  const { user } = useAuthContext();
  const { pickImage, takePhoto, uploadProfileImage } = useStorage();
  const [uploading, setUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleImageUpload = async (imageUri: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to update your profile image');
      return;
    }

    setUploading(true);
    
    try {
      // 1. Get current photo URL for archiving
      const currentPhotoURL = photoURL;
      
      // 2. Upload the new image
      const downloadUrl = await uploadProfileImage(imageUri);
      
      if (downloadUrl) {
        // 3. Archive the old photo if it exists
        if (currentPhotoURL && currentPhotoURL !== downloadUrl) {
          await MatchSyncService.archiveProfilePhoto(user.uid, currentPhotoURL);
        }
        
        // 4. Update the photo URL in all matches
        await MatchSyncService.updateProfilePhoto(user.uid, downloadUrl);
        
        // 5. Make sure we have an up-to-date match list summary
        await MatchSyncService.ensureMatchListSummary(user.uid);
        
        // 6. Notify parent component of the update
        onImageUpdated(downloadUrl);
      }
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Upload Failed', 'Failed to update profile image. Please try again.');
    } finally {
      setUploading(false);
      setShowOptions(false);
    }
  };

  const handleImagePickerAction = async (action: 'gallery' | 'camera') => {
    try {
      let imageUri: string | null = null;
      
      if (action === 'gallery') {
        imageUri = await pickImage();
      } else {
        imageUri = await takePhoto();
      }
      
      if (imageUri) {
        await handleImageUpload(imageUri);
      }
    } catch (error) {
      console.error('Error with image picker:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {photoURL ? (
        <TouchableOpacity 
          onPress={() => setShowOptions(true)}
          disabled={uploading}
        >
          <Image source={{ uri: photoURL }} style={styles.profileImage} />
          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          <View style={styles.editIconContainer}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.placeholderContainer}
          onPress={() => setShowOptions(true)}
          disabled={uploading}
        >
          <Ionicons name="person" size={48} color="#CCCCCC" />
          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}
          <View style={styles.editIconContainer}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Image picker options modal */}
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
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleImagePickerAction('camera')}
            >
              <Ionicons name="camera-outline" size={24} color="#333333" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => handleImagePickerAction('gallery')}
            >
              <Ionicons name="images-outline" size={24} color="#333333" />
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    marginLeft: 15,
    fontSize: 16,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 10,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

export default ProfileImageChanger;