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
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../lib/theme';
import ProfileImageChanger from './ProfileImageChanger';
import { allInterests } from '../../utils/interests';

// Import selection components from onboarding
import GenderSelection from '../onboarding/GenderSelection';
import SexualitySelection from '../onboarding/SexualitySelection';
import PronounsSelection from '../onboarding/PronounsSelection';
import HeightSelection from '../onboarding/HeightSelection';
import EthnicitySelection from '../onboarding/EthnicitySelection';
import LocationSelection from '../onboarding/LocationSelection';
import RelationshipTypeSelection from '../onboarding/RelationshipTypeSelection';
import CurrentChildrenSelection from '../onboarding/CurrentChildrenSelection';
import WorkplaceSelection from '../onboarding/WorkplaceSelection';
import JobTitleSelection from '../onboarding/JobTitleSelection';
import SchoolSelection from '../onboarding/SchoolSelection';
import ReligiousBeliefSelection from '../onboarding/ReligiousBeliefSelection';
import PoliticalBeliefSelection from '../onboarding/PoliticalBeliefSelection';
import DrinkingSelection from '../onboarding/DrinkingSelection';
import SmokingSelection from '../onboarding/SmokingSelection';
import DrugUsageSelection from '../onboarding/DrugUsageSelection';
import InterestsSelection from '../onboarding/InterestsSelection';
import DatingPreferenceSelection from '../onboarding/DatingPreferenceSelection';
import ChildrenSelection from '../onboarding/ChildrenSelection';

const { width } = Dimensions.get('window');

interface PersonalDetailsScreenProps {
  onBack?: () => void;
}

export default function PersonalDetailsScreen({ onBack }: PersonalDetailsScreenProps) {
  const { user, updateUserProfile } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dropdown state management
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
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
    sexualityVisible: true,
    ageRange: '',
    age: '',
    height: '',
    ethnicity: '',
    ethnicityVisible: true,
    pronouns: '',
    pronounsVisible: true,
    
    // Lifestyle details
    relationshipType: '',
    relationshipTypeCustomDescription: '',
    relationshipTypeVisible: true,
    wantChildren: '',
    currentChildren: '',
    childrenVisible: true,
    drinking: '',
    drinkingVisible: true,
    smoking: '',
    smokingVisible: true,
    drugUsage: '',
    drugUsageVisible: true,
    dealBreaker: false,
    datingPreferences: [] as string[],
    datingPreferencesVisible: true,
    
    // Professional details
    workplace: '',
    workplaceVisible: true,
    jobTitle: '',
    jobTitleVisible: true,
    school: '',
    schoolVisible: true,
    education: '',
    educationVisible: false,
    
    // Beliefs
    religiousBeliefs: '',
    religiousBeliefsVisible: true,
    politicalBeliefs: '',
    politicalBeliefsVisible: true,
    
    // Location coordinates
    latitude: null as number | null,
    longitude: null as number | null,
    
    // Visibility settings
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
            sexualityVisible: userData.sexualityVisible ?? true,
            ageRange: userData.ageRange || '',
            age: userData.age || '',
            height: userData.height || '',
            ethnicity: userData.ethnicity || '',
            ethnicityVisible: userData.ethnicityVisible ?? true,
            pronouns: userData.pronouns || '',
            pronounsVisible: userData.pronounsVisible ?? true,
            
            // Lifestyle details
            relationshipType: userData.relationshipType || '',
            relationshipTypeCustomDescription: userData.relationshipTypeCustomDescription || '',
            relationshipTypeVisible: userData.relationshipTypeVisible ?? true,
            wantChildren: userData.wantChildren || '',
            currentChildren: userData.currentChildren || '',
            childrenVisible: userData.childrenVisible ?? true,
            drinking: userData.drinking || '',
            drinkingVisible: userData.drinkingVisible ?? true,
            smoking: userData.smoking || '',
            smokingVisible: userData.smokingVisible ?? true,
            drugUsage: userData.drugUsage || '',
            drugUsageVisible: userData.drugUsageVisible ?? true,
            dealBreaker: userData.dealBreaker || false,
            datingPreferences: userData.datingPreferences || [],
            datingPreferencesVisible: userData.datingPreferencesVisible ?? true,
            
            // Professional details
            workplace: userData.workplace || '',
            workplaceVisible: userData.workplaceVisible ?? true,
            jobTitle: userData.jobTitle || '',
            jobTitleVisible: userData.jobTitleVisible ?? true,
            school: userData.school || '',
            schoolVisible: userData.schoolVisible ?? true,
            education: userData.education || '',
            educationVisible: userData.educationVisible ?? false,
            
            // Beliefs
            religiousBeliefs: userData.religiousBeliefs || '',
            religiousBeliefsVisible: userData.religiousBeliefsVisible ?? true,
            politicalBeliefs: userData.politicalBeliefs || '',
            politicalBeliefsVisible: userData.politicalBeliefsVisible ?? true,
            
            // Location coordinates
            latitude: userData.latitude || null,
            longitude: userData.longitude || null,
            
            // Visibility settings
            visibilitySettings: {
              sexuality: userData.sexualityVisible ?? true,
              pronouns: userData.pronounsVisible ?? true,
              location: userData.locationVisible ?? true,
              gender: userData.genderVisible ?? true,
              interests: userData.interestsVisible ?? true,
              workplace: userData.workplaceVisible ?? true,
              education: userData.educationVisible ?? false,
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

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setUserDetails(prev => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  // Dropdown toggle function
  const toggleDropdown = (section: string) => {
    setOpenDropdown(openDropdown === section ? null : section);
  };

  // Save user details
  const saveDetails = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Prepare update object with all fields
      const updateData = {
        // Basic info
        displayName: userDetails.displayName,
        email: userDetails.email,
        bio: userDetails.bio,
        
        // Location
        location: userDetails.location,
        latitude: userDetails.latitude,
        longitude: userDetails.longitude,
        
        // Demographic details
        gender: userDetails.gender,
        sexuality: userDetails.sexuality,
        sexualityVisible: userDetails.sexualityVisible,
        ageRange: userDetails.ageRange,
        age: userDetails.age,
        height: userDetails.height,
        ethnicity: userDetails.ethnicity,
        ethnicityVisible: userDetails.ethnicityVisible,
        pronouns: userDetails.pronouns,
        pronounsVisible: userDetails.pronounsVisible,
        
        // Lifestyle
        relationshipType: userDetails.relationshipType,
        relationshipTypeCustomDescription: userDetails.relationshipTypeCustomDescription,
        relationshipTypeVisible: userDetails.relationshipTypeVisible,
        wantChildren: userDetails.wantChildren,
        currentChildren: userDetails.currentChildren,
        childrenVisible: userDetails.childrenVisible,
        drinking: userDetails.drinking,
        drinkingVisible: userDetails.drinkingVisible,
        smoking: userDetails.smoking,
        smokingVisible: userDetails.smokingVisible,
        drugUsage: userDetails.drugUsage,
        drugUsageVisible: userDetails.drugUsageVisible,
        
        // Interests & Preferences
        interests: userDetails.interests,
        dealBreaker: userDetails.dealBreaker,
        datingPreferences: userDetails.datingPreferences,
        datingPreferencesVisible: userDetails.datingPreferencesVisible,
        
        // Professional
        workplace: userDetails.workplace,
        workplaceVisible: userDetails.workplaceVisible,
        jobTitle: userDetails.jobTitle,
        jobTitleVisible: userDetails.jobTitleVisible,
        school: userDetails.school,
        schoolVisible: userDetails.schoolVisible,
        education: userDetails.education,
        educationVisible: userDetails.educationVisible,
        
        // Beliefs
        religiousBeliefs: userDetails.religiousBeliefs,
        religiousBeliefsVisible: userDetails.religiousBeliefsVisible,
        politicalBeliefs: userDetails.politicalBeliefs,
        politicalBeliefsVisible: userDetails.politicalBeliefsVisible,
        
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

  // Render dropdown section with gradient header
  const renderDropdownSection = (
    title: string, 
    content: React.ReactNode, 
    sectionKey: string
  ) => {
    const isOpen = openDropdown === sectionKey;
    
    return (
      <View style={styles.dropdownSection}>
        <TouchableOpacity 
          style={styles.dropdownHeader}
          onPress={() => toggleDropdown(sectionKey)}
        >
          <LinearGradient
            colors={isOpen ? ['#EC5F61', '#F0B433'] : ['#F9F9F9', '#F9F9F9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dropdownHeaderGradient}
          >
            <Text style={[
              styles.dropdownHeaderText, 
              isOpen && styles.dropdownHeaderTextActive
            ]}>
              {title}
            </Text>
            <Ionicons 
              name={isOpen ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={isOpen ? 'white' : '#666'} 
            />
          </LinearGradient>
        </TouchableOpacity>
        
        {isOpen && (
          <View style={styles.dropdownContent}>
            {content}
          </View>
        )}
      </View>
    );
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
      
      {/* Dropdowns for different sections */}
      <View style={styles.dropdownContainer}>
        {/* Basic Information Dropdown */}
        {renderDropdownSection(
          'Basic Information', 
          <View>
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
          </View>,
          'basicInfo'
        )}

        {/* Gender & Sexuality Dropdown */}
        {renderDropdownSection(
          'Gender & Sexuality',
          <View>
            <GenderSelection
              selectedGender={userDetails.gender}
              onSelectGender={(gender) => handleInputChange('gender', gender)}
              sexuality={userDetails.sexuality}
              onSelectSexuality={(sexuality) => handleInputChange('sexuality', sexuality)}
              sexualityVisible={userDetails.sexualityVisible}
              onToggleSexualityVisibility={(visible) => handleInputChange('sexualityVisible', visible)}
            />
          </View>,
          'genderSexuality'
        )}

        {/* Dating Preferences Dropdown */}
        {renderDropdownSection(
          'Dating Preferences',
          <View>
            <DatingPreferenceSelection
              selectedPreferences={userDetails.datingPreferences}
              onSelectPreferences={(preferences) => handleInputChange('datingPreferences', preferences)}
              visibleOnProfile={userDetails.datingPreferencesVisible}
              onToggleVisibility={(visible) => handleInputChange('datingPreferencesVisible', visible)}
            />
            <RelationshipTypeSelection
              selectedRelationshipType={userDetails.relationshipType}
              onSelectRelationshipType={(type) => handleInputChange('relationshipType', type)}
              customDescription={userDetails.relationshipTypeCustomDescription}
              onUpdateCustomDescription={(description) => handleInputChange('relationshipTypeCustomDescription', description)}
              visibleOnProfile={userDetails.relationshipTypeVisible}
              onToggleVisibility={(visible) => handleInputChange('relationshipTypeVisible', visible)}
            />
          </View>,
          'datingPreferences'
        )}

        {/* Pronouns Dropdown */}
        {renderDropdownSection(
          'Pronouns',
          <PronounsSelection
            selectedPronouns={userDetails.pronouns}
            onSelectPronouns={(pronouns) => handleInputChange('pronouns', pronouns)}
            visibleOnProfile={userDetails.pronounsVisible}
            onToggleVisibility={(visible) => handleInputChange('pronounsVisible', visible)}
          />,
          'pronouns'
        )}

        {/* Location Dropdown */}
        {renderDropdownSection(
          'Location',
          <LocationSelection
            selectedLocation={{
              latitude: userDetails.latitude || 5.033,
              longitude: userDetails.longitude || 7.9,
              address: userDetails.location || '',
              city: null,
              state: null,
              country: null
            }}
            onLocationSelect={(location) => {
              handleInputChange('location', location.address);
              handleInputChange('latitude', location.latitude);
              handleInputChange('longitude', location.longitude);
            }}
            updateProfile={handleInputChange}
          />,
          'location'
        )}

        {/* Ethnicity Dropdown */}
        {renderDropdownSection(
          'Ethnicity',
          <EthnicitySelection
            selectedEthnicity={userDetails.ethnicity}
            onSelectEthnicity={(ethnicity) => handleInputChange('ethnicity', ethnicity)}
            visibleOnProfile={userDetails.ethnicityVisible}
            onToggleVisibility={(visible) => handleInputChange('ethnicityVisible', visible)}
          />,
          'ethnicity'
        )}

        {/* Height Dropdown */}
        {renderDropdownSection(
          'Height',
          <HeightSelection
            height={userDetails.height}
            onHeightChange={(height) => handleInputChange('height', height)}
          />,
          'height'
        )}

        {/* Children Dropdown */}
        {renderDropdownSection(
          'Children',
          <View>
            <CurrentChildrenSelection
              selectedOption={userDetails.currentChildren}
              onSelectOption={(option) => handleInputChange('currentChildren', option)}
              visibleOnProfile={userDetails.childrenVisible}
              onToggleVisibility={(visible) => handleInputChange('childrenVisible', visible)}
            />
            <ChildrenSelection
              selectedOption={userDetails.wantChildren}
              onSelectOption={(option) => handleInputChange('wantChildren', option)}
              visibleOnProfile={userDetails.childrenVisible}
              onToggleVisibility={(visible) => handleInputChange('childrenVisible', visible)}
            />
          </View>,
          'children'
        )}

        {/* Work & Education Dropdown */}
        {renderDropdownSection(
          'Work & Education',
          <View>
            <WorkplaceSelection
              workplace={userDetails.workplace}
              onWorkplaceChange={(workplace) => handleInputChange('workplace', workplace)}
              visibleOnProfile={userDetails.workplaceVisible}
              onToggleVisibility={(visible) => handleInputChange('workplaceVisible', visible)}
            />
            <JobTitleSelection
              jobTitle={userDetails.jobTitle}
              onJobTitleChange={(jobTitle) => handleInputChange('jobTitle', jobTitle)}
              visibleOnProfile={userDetails.jobTitleVisible}
              onToggleVisibility={(visible) => handleInputChange('jobTitleVisible', visible)}
            />
            <SchoolSelection
              school={userDetails.school}
              onSchoolChange={(school) => handleInputChange('school', school)}
              visibleOnProfile={userDetails.schoolVisible}
              onToggleVisibility={(visible) => handleInputChange('schoolVisible', visible)}
            />
          </View>,
          'workEducation'
        )}

        {/* Interests Dropdown */}
        {renderDropdownSection(
          'Interests',
          <InterestsSelection
            selectedInterests={userDetails.interests}
            onSelectInterests={(interests) => handleInputChange('interests', interests)}
            dealBreaker={userDetails.dealBreaker}
            onToggleDealBreaker={(value) => handleInputChange('dealBreaker', value)}
          />,
          'interests'
        )}

        {/* Lifestyle Habits Dropdown */}
        {renderDropdownSection(
          'Lifestyle Habits',
          <View>
            <DrinkingSelection
              selectedOption={userDetails.drinking}
              onSelectOption={(option) => handleInputChange('drinking', option)}
              visibleOnProfile={userDetails.drinkingVisible}
              onToggleVisibility={(visible) => handleInputChange('drinkingVisible', visible)}
            />
            <SmokingSelection
              selectedOption={userDetails.smoking}
              onSelectOption={(option) => handleInputChange('smoking', option)}
              visibleOnProfile={userDetails.smokingVisible}
              onToggleVisibility={(visible) => handleInputChange('smokingVisible', visible)}
            />
            <DrugUsageSelection
              selectedOption={userDetails.drugUsage}
              onSelectOption={(option) => handleInputChange('drugUsage', option)}
              visibleOnProfile={userDetails.drugUsageVisible}
              onToggleVisibility={(visible) => handleInputChange('drugUsageVisible', visible)}
            />
          </View>,
          'lifestyleHabits'
        )}

        {/* Beliefs Dropdown */}
        {renderDropdownSection(
          'Beliefs',
          <View>
            <ReligiousBeliefSelection
              selectedOption={userDetails.religiousBeliefs}
              onSelectOption={(option) => handleInputChange('religiousBeliefs', option)}
              visibleOnProfile={userDetails.religiousBeliefsVisible}
              onToggleVisibility={(visible) => handleInputChange('religiousBeliefsVisible', visible)}
            />
            <PoliticalBeliefSelection
              selectedOption={userDetails.politicalBeliefs}
              onSelectOption={(option) => handleInputChange('politicalBeliefs', option)}
              visibleOnProfile={userDetails.politicalBeliefsVisible}
              onToggleVisibility={(visible) => handleInputChange('politicalBeliefsVisible', visible)}
            />
          </View>,
          'beliefs'
        )}
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
    width: '48%', 
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
    marginHorizontal: 20,
    borderRadius: 25,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New dropdown-related styles
  dropdownContainer: {
    paddingHorizontal: 20,
  },
  dropdownSection: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  dropdownHeader: {
    backgroundColor: '#F9F9F9',
  },
  dropdownHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dropdownHeaderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dropdownHeaderTextActive: {
    color: 'white',
  },
  dropdownContent: {
    backgroundColor: 'white',
    padding: 15,
  },
});