// app/(onboarding)/profile-setup.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  StyleSheet,
  SafeAreaView
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { ImageUpload } from '../../components/onboarding/ImageUpload';
import { LocationSelectionModal } from '../../components/onboarding/LocationSelectionModal';
import { doc, setDoc } from 'firebase/firestore';
import { firestore, serverTimestamp } from '../../lib/firebase';

export default function ProfileSetupScreen() {
  const { user } = useAuthContext();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [location, setLocation] = useState<{
    country: string;
    customLocation?: string;
  }>({
    country: '',
    customLocation: undefined
  });

  // Profile data
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || '',
    bio: '',
    location: '',
    gender: '',
    ageRange: ''
  });

  // Fetch user data when component mounts
  useEffect(() => {
    if (user) {
      // Populate profile data with existing user information
      setProfileData(prev => ({
        ...prev,
        displayName: user.displayName || prev.displayName,
        photoURL: user.photoURL || prev.photoURL
      }));
    }
  }, [user]);

  // When selecting location
  const handleLocationSelect = (selectedLocation: {
    country: string;
    customLocation?: string;
  }) => {
    setLocation(selectedLocation);
    
    // Format the location display
    const displayLocation = selectedLocation.customLocation || 
      (selectedLocation.country || 'Select location');
    
    updateProfile('location', displayLocation);
  };

  const updateProfile = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const isCurrentStepValid = () => {
    switch (step) {
      case 1: // Basic info
        return profileData.displayName.trim() !== '' && 
               profileData.location.trim() !== '';
      case 2: // Gender
        return !!profileData.gender;
      case 3: // Age
        return !!profileData.ageRange;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Submit profile
      try {
        setLoading(true);
        setError(null);
        
        if (user) {
          // Update Firestore with profile data
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, {
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            bio: profileData.bio,
            location: profileData.location,
            gender: profileData.gender,
            ageRange: profileData.ageRange,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          router.replace('/(onboarding)/subscription');
        } else {
          throw new Error('User not authenticated');
        }
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setError(error.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {step > 1 && (
          <TouchableOpacity 
            onPress={handleBack}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Set up your Profile</Text>
        </View>
        <View style={styles.progressContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FFA07A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressBar,
              { width: `${(step / 3) * 100}%` }
            ]}
          />
          <View style={[styles.progressBackground, { width: `${100 - (step / 3) * 100}%` }]} />
        </View>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.formContainer}>
            <ImageUpload 
              value={profileData.photoURL}
              onChange={(url) => updateProfile('photoURL', url)}
            />
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={profileData.displayName}
                onChangeText={(text) => updateProfile('displayName', text)}
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Short Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter a description..."
                value={profileData.bio}
                onChangeText={(text) => updateProfile('bio', text)}
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
                  profileData.location ? { color: '#000' } : {}
                ]}>
                  {profileData.location || 'Select location'}
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
        
      case 2:
        return (
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Select your Gender</Text>
            
            {['male', 'female', 'other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                onPress={() => updateProfile('gender', gender)}
                style={styles.optionButton}
              >
                <LinearGradient
                  colors={profileData.gender === gender ? ['#FF6B6B', '#FFA07A'] : ['#E5E5E5', '#E5E5E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={[
                    styles.optionText,
                    profileData.gender === gender && styles.selectedOptionText
                  ]}>
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 3:
        return (
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Select your Age</Text>
            
            {[
              '18 to 24', '25 to 29', '30 to 34', 
              '35 to 44', '45 to 54', '55 or older'
            ].map((ageRange) => (
              <TouchableOpacity
                key={ageRange}
                onPress={() => updateProfile('ageRange', ageRange)}
                style={styles.optionButton}
              >
                <LinearGradient
                  colors={profileData.ageRange === ageRange ? ['#FF6B6B', '#FFA07A'] : ['#E5E5E5', '#E5E5E5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={[
                    styles.optionText,
                    profileData.ageRange === ageRange && styles.selectedOptionText
                  ]}>
                    {ageRange}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            {renderStepContent()}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={handleNext}
                disabled={!isCurrentStepValid() || loading}
                style={styles.buttonWrapper}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FFA07A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.continueButton,
                    (!isCurrentStepValid() || loading) && styles.disabledButton
                  ]}
                >
                  <Text style={styles.buttonText}>
                    {step === 3 ? 'Complete Profile' : 'Continue'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'android' ? 50 : 10,
    zIndex: 10,
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  progressContainer: {
    height: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
    backgroundColor: '#E5E5E5',
  },
  progressBar: {
    height: '100%',
  },
  progressBackground: {
    height: '100%',
    backgroundColor: '#E5E5E5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    width: '100%',
    marginTop: 20,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 20,
    gap: 16,
  },
  optionButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
  },
  buttonContainer: {
    width: '100%',
    paddingTop: 20,
    paddingBottom: 20,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  continueButton: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  }
});