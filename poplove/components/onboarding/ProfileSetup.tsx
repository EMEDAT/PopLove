// components/onboarding/ProfileSetup.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageUpload } from './ImageUpload';
import { LocationSelectionModal } from './LocationSelectionModal';

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

  const handleLocationSelect = (selectedLocation: {
    country: string;
    customLocation?: string;
  }) => {
    // Format the location display
    const displayLocation = selectedLocation.customLocation || 
      (selectedLocation.country || 'Select location');
    
    onUpdate('location', displayLocation);
  };

  const isFormValid = () => {
    return data.displayName.trim() !== '' && data.location.trim() !== '';
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
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
    backgroundColor: '#F9F9F9',
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