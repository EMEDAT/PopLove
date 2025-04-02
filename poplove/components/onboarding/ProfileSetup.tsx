// components/onboarding/ProfileSetup.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageUpload } from './ImageUpload';
import { LocationSelectionModal } from './LocationSelectionModal';
import { useAuthContext } from '../auth/AuthProvider';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore, serverTimestamp } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';

interface ProfileSetupProps {
  data: {
    displayName: string;
    photoURL: string;
    bio: string;
    location: string;
  };
  onUpdate: (field: string, value: string) => void;
  onNext: () => void;
}

export default function ProfileSetup({ data, onUpdate, onNext }: ProfileSetupProps) {
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const { user } = useAuthContext();

  // Update Firebase Auth profile when display name changes
  useEffect(() => {
    const updateUserProfile = async () => {
      if (data.displayName && user && data.displayName !== user.displayName) {
        try {
          setSaveInProgress(true);
          
          // Update Firebase Auth profile
          await updateProfile(user, { displayName: data.displayName });
          
          // Also update Firestore user document
          await updateDoc(doc(firestore, 'users', user.uid), {
            displayName: data.displayName,
            updatedAt: serverTimestamp()
          });
          
          console.log("User display name updated in Firebase Auth and Firestore");
        } catch (error) {
          console.error("Error updating user display name:", error);
          Alert.alert("Error", "Failed to update profile. Please try again.");
        } finally {
          setSaveInProgress(false);
        }
      }
    };
    
    // Debounce the update to avoid too many writes
    const timeoutId = setTimeout(() => {
      if (data.displayName && user && data.displayName !== user.displayName) {
        updateUserProfile();
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [data.displayName, user]);

  const handleLocationSelect = (selectedLocation: {
    country: string;
    city?: string;
    customLocation?: string;
  }) => {
    // Format the location display
    const displayLocation = selectedLocation.customLocation || 
      `${selectedLocation.city}, ${selectedLocation.country}` || 'Select location';
    
    onUpdate('location', displayLocation);
  };

  const isFormValid = () => {
    return data.displayName.trim() !== '' && data.location.trim() !== '';
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <ImageUpload 
          value={data.photoURL}
          onChange={(url) => onUpdate('photoURL', url)}
        />
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            value={data.displayName}
            onChangeText={(text) => onUpdate('displayName', text)}
            placeholderTextColor="#aaa"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Short Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter a description..."
            value={data.bio}
            onChangeText={(text) => onUpdate('bio', text)}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#aaa"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Location</Text>
          <TouchableOpacity 
            style={styles.locationInput}
            onPress={() => setLocationModalVisible(true)}
          >
            <Text style={[
              styles.locationText,
              data.location ? { color: '#000' } : {}
            ]}>
              {data.location || 'Select location'}
            </Text>
            <Ionicons name="chevron-down" size={20} style={styles.dropdownIcon} />
          </TouchableOpacity>
        </View>

        <LocationSelectionModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
          onSelectLocation={handleLocationSelect}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 50, // Extra padding for keyboard
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9F6F2',
    color: '#000',
  },
  locationInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9F6F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 16,
    color: '#aaa',
  },
  dropdownIcon: {
    color: '#aaa',
  },
  textArea: {
    height: 130,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  }
});