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
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../lib/theme';
import ProfileImageChanger from './ProfileImageChanger';
import { allInterests } from '../../utils/interests';

interface PersonalDetailsScreenProps {
  onBack?: () => void;
}

export default function PersonalDetailsScreen({ onBack }: PersonalDetailsScreenProps) {
  const { user, updateUserProfile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Comprehensive user details state
  const [userDetails, setUserDetails] = useState({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    profession: '',
    interests: [] as string[],
    photoURL: '',
    
    // Demographic details
    gender: '',
    sexuality: '',
    ageRange: '',
    age: '',
    height: '',
    ethnicity: '',
    pronouns: '',
    
    // Lifestyle details
    relationshipType: '',
    wantChildren: '',
    currentChildren: '',
    drinking: '',
    smoking: '',
    drugUsage: '',
    
    // Professional details
    workplace: '',
    jobTitle: '',
    school: '',
    education: '',
    
    // Beliefs
    religiousBeliefs: '',
    politicalBeliefs: '',
    
    // Visibility toggles
    visibilitySettings: {
      sexuality: true,
      pronouns: true,
      location: true,
      gender: true,
      interests: true,
      workplace: true,
      education: true,
      religiousBeliefs: true,
      politicalBeliefs: true
    }
  });

  // Load user details on component mount
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
          
          setUserDetails(prevDetails => ({
            ...prevDetails,
            displayName: userData.displayName || user.displayName || '',
            email: userData.email || user.email || '',
            photoURL: userData.photoURL || user.photoURL || '',
            bio: userData.bio || '',
            location: userData.location || '',
            profession: userData.profession || '',
            interests: userData.interests || [],
            
            // Demographic details
            gender: userData.gender || '',
            sexuality: userData.sexuality || '',
            ageRange: userData.ageRange || '',
            age: userData.age || '',
            height: userData.height || '',
            ethnicity: userData.ethnicity || '',
            pronouns: userData.pronouns || '',
            
            // Lifestyle details
            relationshipType: userData.relationshipType || '',
            wantChildren: userData.wantChildren || '',
            currentChildren: userData.currentChildren || '',
            drinking: userData.drinking || '',
            smoking: userData.smoking || '',
            drugUsage: userData.drugUsage || '',
            
            // Professional details
            workplace: userData.workplace || '',
            jobTitle: userData.jobTitle || '',
            school: userData.school || '',
            education: userData.education || '',
            
            // Beliefs
            religiousBeliefs: userData.religiousBeliefs || '',
            politicalBeliefs: userData.politicalBeliefs || '',
            
            // Visibility settings
            visibilitySettings: {
              sexuality: userData.sexualityVisible ?? true,
              pronouns: userData.pronounsVisible ?? true,
              location: userData.locationVisible ?? true,
              gender: userData.genderVisible ?? true,
              interests: userData.interestsVisible ?? true,
              workplace: userData.workplaceVisible ?? true,
              education: userData.educationVisible ?? true,
              religiousBeliefs: userData.religiousBeliefsVisible ?? true,
              politicalBeliefs: userData.politicalBeliefsVisible ?? true
            }
          }));
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

  // Handle text input changes
  const handleInputChange = (field: string, value: string) => {
    setUserDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle interests toggle
  const toggleInterest = (interest: string) => {
    setUserDetails(prev => {
      const currentInterests = prev.interests || [];
      const newInterests = currentInterests.includes(interest)
        ? currentInterests.filter(i => i !== interest)
        : [...currentInterests, interest];
      
      return {
        ...prev,
        interests: newInterests
      };
    });
  };

  // Handle visibility toggle
  const toggleVisibility = (field: keyof typeof userDetails.visibilitySettings) => {
    setUserDetails(prev => ({
      ...prev,
      visibilitySettings: {
        ...prev.visibilitySettings,
        [field]: !prev.visibilitySettings[field]
      }
    }));
  };

  // Save user details
  const saveDetails = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Prepare update object
      const updateData = {
        displayName: userDetails.displayName,
        email: userDetails.email,
        bio: userDetails.bio,
        location: userDetails.location,
        profession: userDetails.profession,
        interests: userDetails.interests,
        
        // Demographic details
        gender: userDetails.gender,
        sexuality: userDetails.sexuality,
        ageRange: userDetails.ageRange,
        age: userDetails.age,
        height: userDetails.height,
        ethnicity: userDetails.ethnicity,
        pronouns: userDetails.pronouns,
        
        // Lifestyle details
        relationshipType: userDetails.relationshipType,
        wantChildren: userDetails.wantChildren,
        currentChildren: userDetails.currentChildren,
        drinking: userDetails.drinking,
        smoking: userDetails.smoking,
        drugUsage: userDetails.drugUsage,
        
        // Professional details
        workplace: userDetails.workplace,
        jobTitle: userDetails.jobTitle,
        school: userDetails.school,
        education: userDetails.education,
        
        // Beliefs
        religiousBeliefs: userDetails.religiousBeliefs,
        politicalBeliefs: userDetails.politicalBeliefs,
        
        // Visibility settings
        sexualityVisible: userDetails.visibilitySettings.sexuality,
        pronounsVisible: userDetails.visibilitySettings.pronouns,
        locationVisible: userDetails.visibilitySettings.location,
        genderVisible: userDetails.visibilitySettings.gender,
        interestsVisible: userDetails.visibilitySettings.interests,
        workplaceVisible: userDetails.visibilitySettings.workplace,
        educationVisible: userDetails.visibilitySettings.education,
        religiousBeliefsVisible: userDetails.visibilitySettings.religiousBeliefs,
        politicalBeliefsVisible: userDetails.visibilitySettings.politicalBeliefs,
        
        // Timestamp
        updatedAt: serverTimestamp()
      };
      
      // Update Firebase Auth profile
      await updateUserProfile({
        displayName: userDetails.displayName,
        photoURL: userDetails.photoURL
      });
      
      // Update Firestore document
      await updateDoc(doc(firestore, 'users', user.uid), updateData);
      
      Alert.alert('Success', 'Your profile has been updated');
      
      // Navigate back
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update your profile');
    } finally {
      setSaving(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your details...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack || (() => router.back())} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Details</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Profile Image Changer */}
      <View style={styles.profileImageContainer}>
        <ProfileImageChanger
          photoURL={userDetails.photoURL}
          onImageUpdated={(newUrl) => handleInputChange('photoURL', newUrl)}
        />
      </View>
      
      {/* Sections */}
      <View style={styles.sectionsContainer}>
        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={userDetails.displayName}
            onChangeText={(value) => handleInputChange('displayName', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={userDetails.email}
            editable={false}
          />
          
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Bio"
            value={userDetails.bio}
            onChangeText={(value) => handleInputChange('bio', value)}
            multiline
            numberOfLines={4}
          />
        </View>
        
        {/* Demographic Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demographic Details</Text>
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Age"
              value={userDetails.age}
              onChangeText={(value) => handleInputChange('age', value)}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Height (cm)"
              value={userDetails.height}
              onChangeText={(value) => handleInputChange('height', value)}
              keyboardType="numeric"
            />
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Gender"
            value={userDetails.gender}
            onChangeText={(value) => handleInputChange('gender', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Sexuality"
            value={userDetails.sexuality}
            onChangeText={(value) => handleInputChange('sexuality', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Pronouns"
            value={userDetails.pronouns}
            onChangeText={(value) => handleInputChange('pronouns', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Ethnicity"
            value={userDetails.ethnicity}
            onChangeText={(value) => handleInputChange('ethnicity', value)}
          />
        </View>
        
        {/* Location & Professional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Professional</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={userDetails.location}
            onChangeText={(value) => handleInputChange('location', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Workplace"
            value={userDetails.workplace}
            onChangeText={(value) => handleInputChange('workplace', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Job Title"
            value={userDetails.jobTitle}
            onChangeText={(value) => handleInputChange('jobTitle', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="School"
            value={userDetails.school}
            onChangeText={(value) => handleInputChange('school', value)}
          />
        </View>
        
        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.interestsContainer}>
            {allInterests.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestTag,
                  userDetails.interests.includes(interest) && styles.selectedInterestTag
                ]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[
                  styles.interestText,
                  userDetails.interests.includes(interest) && styles.selectedInterestText
                ]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Lifestyle & Personal Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle & Preferences</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Relationship Type"
            value={userDetails.relationshipType}
            onChangeText={(value) => handleInputChange('relationshipType', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Want Children"
            value={userDetails.wantChildren}
            onChangeText={(value) => handleInputChange('wantChildren', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Drinking Habits"
            value={userDetails.drinking}
            onChangeText={(value) => handleInputChange('drinking', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Smoking Habits"
            value={userDetails.smoking}
            onChangeText={(value) => handleInputChange('smoking', value)}
          />
        </View>
        
        {/* Beliefs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beliefs</Text>
          

          <TextInput
            style={styles.input}
            placeholder="Religious Beliefs"
            value={userDetails.religiousBeliefs}
            onChangeText={(value) => handleInputChange('religiousBeliefs', value)}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Political Beliefs"
            value={userDetails.politicalBeliefs}
            onChangeText={(value) => handleInputChange('politicalBeliefs', value)}
          />
        </View>
        
        {/* Save Button */}
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
      </View>
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
  sectionsContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  halfInput: {
    width: '48%', // Adjust for side-by-side inputs
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  interestTag: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  selectedInterestTag: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FCA5A5',
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
  selectedInterestText: {
    color: '#E11D48',
  },
  saveButton: {
    marginTop: 20,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});