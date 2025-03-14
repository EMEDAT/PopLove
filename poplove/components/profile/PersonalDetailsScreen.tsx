// components/profile/PersonalDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { updateProfile } from 'firebase/auth';
import theme from '../../lib/theme';
import ProfileImageChanger from './ProfileImageChanger';
import { LinearGradient } from 'expo-linear-gradient';

interface PersonalDetailsScreenProps {
    onBack?: () => void;
  }

  export default function PersonalDetailsScreen({ onBack }: PersonalDetailsScreenProps) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User details
  const [userDetails, setUserDetails] = useState<{
    displayName: string;
    email: string;
    bio: string;
    location: string;
    profession: string;
    education: string;
    interests: string[]; // Change from never[] to string[]
    photoURL: string;
    ageRange: string;
    age: string;
  }>({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    profession: '',
    education: '',
    interests: [],
    photoURL: '',
    ageRange: '',
    age: '',
  });
  
  // Load user details
  useEffect(() => {
    const loadUserDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          setUserDetails({
            displayName: userData.displayName || user.displayName || '',
            email: userData.email || user.email || '',
            bio: userData.bio || '',
            location: userData.location || '',
            profession: userData.profession || '',
            education: userData.education || '',
            interests: userData.interests || [],
            photoURL: userData.photoURL || user.photoURL || '',
            age: userData.age || userData.ageRange || '',
            ageRange: userData.ageRange || '',
          });
        } else {
          // If no document exists, use auth data
          setUserDetails({
            displayName: user.displayName || '',
            email: user.email || '',
            bio: '',
            location: '',
            profession: '',
            education: '',
            interests: [],
            photoURL: user.photoURL || '',
            age: '',
            ageRange: '',
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading user details:', error);
        Alert.alert('Error', 'Failed to load your details');
        setLoading(false);
      }
    };
    
    loadUserDetails();
  }, [user]);
  
  // Handle text input change
  const handleInputChange = (field: string, value: string) => {
    setUserDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle interests input (comma separated)
  const handleInterestsChange = (value: string) => {
    const interestsArray = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');
    
    setUserDetails(prev => ({
      ...prev,
      interests: interestsArray
    }));
  };
  
  // Convert interests array to comma-separated string for display
  const interestsString = userDetails.interests.join(', ');
  
  // Handle profile image update
  const handleImageUpdated = (newUrl: string) => {
    setUserDetails(prev => ({
      ...prev,
      photoURL: newUrl
    }));
  };
  
  // Save user details
  const saveDetails = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: userDetails.displayName,
        photoURL: userDetails.photoURL
      });
      
      // Update Firestore document
      await updateDoc(doc(firestore, 'users', user.uid), {
        displayName: userDetails.displayName,
        email: userDetails.email,
        bio: userDetails.bio,
        location: userDetails.location,
        profession: userDetails.profession,
        education: userDetails.education,
        interests: userDetails.interests,
        age: userDetails.age,
        ageRange: userDetails.ageRange,
        photoURL: userDetails.photoURL,
        updatedAt: serverTimestamp()
      });
      
      Alert.alert('Success', 'Your profile has been updated');
      // Navigate back
      if (onBack) {
        onBack();
      } 
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update your profile');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your details...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
      <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Details</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Profile Image */}
      <View style={styles.profileImageContainer}>
      <ProfileImageChanger
        photoURL={userDetails.photoURL}
        onImageUpdated={handleImageUpdated}
      />
      </View>
      
      {/* Form Fields */}
      <View style={styles.formSection}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.displayName}
            onChangeText={(value) => handleInputChange('displayName', value)}
            placeholder="Your name"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Your email"
            editable={false}
            selectTextOnFocus={false}
          />
          <Text style={styles.helperText}>Email cannot be changed</Text>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.age}
            onChangeText={(value) => handleInputChange('age', value)}
            placeholder="Your age"
            keyboardType="number-pad"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={userDetails.bio}
            onChangeText={(value) => handleInputChange('bio', value)}
            placeholder="Tell others about yourself"
            multiline
            numberOfLines={4}
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Location</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="City, Country"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Profession</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.profession}
            onChangeText={(value) => handleInputChange('profession', value)}
            placeholder="Your profession"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Education</Text>
          <TextInput
            style={styles.textInput}
            value={userDetails.education}
            onChangeText={(value) => handleInputChange('education', value)}
            placeholder="Your education"
          />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Interests</Text>
          <TextInput
            style={styles.textInput}
            value={interestsString}
            onChangeText={handleInterestsChange}
            placeholder="Travel, Cooking, Sports, etc."
          />
          <Text style={styles.helperText}>Separate interests with commas</Text>
        </View>
      </View>
      
      {/* Save button */}
      <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveDetails}
          disabled={saving}
        >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
    borderColor: theme.colors.gray[300],
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  formSection: {
    marginHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.text,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.gray[500],
    marginTop: 4,
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gradientButton: {
    width: '90%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginLeft: '5%',
  },
});