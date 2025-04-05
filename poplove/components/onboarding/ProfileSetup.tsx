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
    firstName: string;
    lastName: string;
  };
  onUpdate: (field: string, value: string) => void;
  onNext: () => void;
}

export default function ProfileSetup({ data, onUpdate, onNext }: ProfileSetupProps) {
  const [saveInProgress, setSaveInProgress] = useState(false);
  const { user } = useAuthContext();

  useEffect(() => {
    const updateUserProfile = async () => {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      
      if (fullName && user && fullName !== user.displayName) {
        try {
          setSaveInProgress(true);
          
          await updateProfile(user, { displayName: fullName });
          
          await updateDoc(doc(firestore, 'users', user.uid), {
            displayName: fullName,
            updatedAt: serverTimestamp()
          });
          
          onUpdate('displayName', fullName);
        } catch (error) {
          console.error("Profile update error:", error);
          Alert.alert("Update Failed", "Could not update profile name.");
        } finally {
          setSaveInProgress(false);
        }
      }
    };
    
    updateUserProfile();
  }, [data.firstName, data.lastName]);

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
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={styles.input}
            value={data.firstName}
            onChangeText={(text) => onUpdate('firstName', text)}
            autoCapitalize="words"
            returnKeyType="next"
            placeholder="Enter your first name"  // Added this placeholder
            placeholderTextColor="#aaa"         // Added this for better visibility
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={data.lastName}
            onChangeText={(text) => onUpdate('lastName', text)}
            autoCapitalize="words"
            placeholder="Enter your last name (optional)"  // Added this placeholder
            placeholderTextColor="#aaa"                    // Added this for better visibility
          
          />
          <Text style={styles.optionalDescription}>
            Last name is optional and only shared with matches
          </Text>
          <TouchableOpacity onPress={() => {
            Alert.alert(
              'Why last name?',
              'We only share your last name with mutual matches to help create a more personal connection. Your privacy is our priority, and you can always control what information is shared.',
              [{ text: 'I Understand', style: 'default' }]
            );
          }}>
            <Text style={styles.whyText}>Why do we ask for last name?</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Short Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.bio}
            onChangeText={(text) => onUpdate('bio', text)}
            multiline
            textAlignVertical="top"
            placeholder="Tell us a bit about yourself..."  // Added this placeholder
            placeholderTextColor="#aaa"                    // Added this for better visibility
          />
        </View>
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
    paddingBottom: 50,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#161616',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#FFFAFA',
    color: '#000',
  },
  textArea: {
    height: 130,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  // Add these new styles
  optionalDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 5,
  },
  whyText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 5,
  }
});