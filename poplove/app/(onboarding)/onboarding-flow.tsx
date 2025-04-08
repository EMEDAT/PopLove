// app/(onboarding)/onboarding-flow.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { firestore, serverTimestamp } from '../../lib/firebase';

// Import the onboarding components
import ProfileSetup from '../../components/onboarding/ProfileSetup'; 
import GenderSelection from '../../components/onboarding/GenderSelection';
import SexualitySelection from '../../components/onboarding/SexualitySelection';
import AgeSelection from '../../components/onboarding/AgeSelection';
import DateOfBirthSelection from '../../components/onboarding/DateOfBirthSelection';
import PronounsSelection from '../../components/onboarding/PronounsSelection';
import HeightSelection from '../../components/onboarding/HeightSelection';
import EthnicitySelection from '../../components/onboarding/EthnicitySelection';
import ChildrenSelection from '../../components/onboarding/ChildrenSelection';
import ExpectationsLifestyle from '../../components/onboarding/ExpectationsLifestyle';
import InterestsSelection from '../../components/onboarding/InterestsSelection';
import ProfilePrompts from '../../components/onboarding/ProfilePrompts';
import SubscriptionPlan from '../../components/onboarding/SubscriptionPlan';
import Welcome from '../../components/onboarding/Welcome';
import ProgressBar from '../../components/onboarding/ProgressBar';
import OnboardingNavigation from '../../components/onboarding/OnboardingNavigation';
import LocationSelection from '../../components/onboarding/LocationSelection';
import DatingPreferenceSelection from '../../components/onboarding/DatingPreferenceSelection';
import RelationshipTypeSelection from '../../components/onboarding/RelationshipTypeSelection';
import CurrentChildrenSelection from '../../components/onboarding/CurrentChildrenSelection';
import WorkplaceSelection from '../../components/onboarding/WorkplaceSelection';
import JobTitleSelection from '../../components/onboarding/JobTitleSelection';
import SchoolSelection from '../../components/onboarding/SchoolSelection';
import EducationLevelSelection from '../../components/onboarding/EducationLevelSelection';
import ReligiousBeliefSelection from '../../components/onboarding/ReligiousBeliefSelection';
import PoliticalBeliefSelection from '../../components/onboarding/PoliticalBeliefSelection';
import DrinkingSelection from '../../components/onboarding/DrinkingSelection';
import SmokingSelection from '../../components/onboarding/SmokingSelection';
import DrugUsageSelection from '../../components/onboarding/DrugUsageSelection';

// Define all the steps in the onboarding flow
const STEPS = [
  'profile',
  'dateOfBirth', 
  'location', 
  'pronouns',
  'gender',
  'datingPreference',
  'lifestyle',
  'relationshipType',
  'height',
  'ethnicity',
  'currentChildren',
  'children',
  'workplace',        
  'jobTitle',          
  'school',            
  'education',         
  'religiousBeliefs',  
  'politicalBeliefs',  
  'drinking',          
  'smoking',           
  'drugUsage',         

   
  'interests',
  'prompts',
  'subscription',
  'welcome'
];


export default function OnboardingFlow() {
  const { user, setHasCompletedOnboarding, startOnboarding, saveOnboardingProgress } = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || '',
    bio: '',
    location: '',
    firstName: user?.displayName ? user.displayName.split(' ')[0] : '',
    lastName: user?.displayName && user.displayName.split(' ').length > 1 
      ? user.displayName.split(' ').slice(1).join(' ') 
      : '',
    gender: '',
    sexuality: '',          
    sexualityVisible: true, 
    showingSexualitySubpage: false,
    datingPreferences: [] as string[],
    datingPreferencesVisible: true,
    relationshipType: '',
    relationshipTypeCustomDescription: '',
    relationshipTypeVisible: true,
    pronouns: '',
    pronounsVisible: true,
    ageRange: '',
    age: '',
    ageConfirmed: false,
    birthDate: null as Date | null, 
    height: '',
    ethnicity: '',
    ethnicityVisible: true, 
    wantChildren: '',
    currentChildren: '', 
    childrenVisible: true,
    currentChildrenVisible: true,
    lifestyle: [] as string[],
    lifestyleVisible: true,  
    interests: [] as string[],
    dealBreaker: false,
    prompts: [] as { question: string; answer: string }[],
    subscriptionPlan: 'basic',
    locationCoordinates: null as {
      latitude: number;
      longitude: number;
      address: string;
      city: string | null;
      state: string | null;
      country: string | null;
      formattedAddress?: string;
      useExactAddress?: boolean;
    } | null,
    workplace: '',
    workplaceVisible: true,
    jobTitle: '',
    jobTitleVisible: true,
    school: '',
    schoolVisible: true,
    education: '',
    educationVisible: false,
    religiousBeliefs: '',
    religiousBeliefsVisible: true,
    politicalBeliefs: '',
    politicalBeliefsVisible: true,
    drinking: '',
    drinkingVisible: true,
    smoking: '',
    smokingVisible: true,
    drugUsage: '',
    drugUsageVisible: true,
  });

  // Load saved onboarding progress
  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If we have saved progress, restore it
          if (userData.onboardingProgress) {
            console.log('Restoring onboarding progress:', userData.onboardingProgress);
            
            // Update profile data with saved values
            setProfileData(prevData => ({
              ...prevData,
              ...userData.onboardingProgress
            }));
            
            // If there's a saved step, restore it
            if (userData.currentOnboardingStep !== undefined) {
              setCurrentStep(userData.currentOnboardingStep);
            }
          }
          
          // Update display name and photo from user profile
          if (user.displayName) {
            setProfileData(prevData => ({
              ...prevData,
              displayName: user.displayName || prevData.displayName
            }));
          }
          
          if (user.photoURL) {
            setProfileData(prevData => ({
              ...prevData,
              photoURL: user.photoURL || prevData.photoURL
            }));
          }
        }
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadProgress();
  }, [user]);

  // Initialize onboarding timer when component mounts
  useEffect(() => {
    startOnboarding();
  }, []);

  // Save progress to Firebase after each step change
  useEffect(() => {
    const saveProgress = async () => {
      if (!user || initialLoading) return;
      
      try {
        setSavingProgress(true);

        console.log('Progress save - wantChildren value:', profileData.wantChildren);
        
        // Save current progress to Firestore
        await setDoc(doc(firestore, 'users', user.uid), {
          onboardingProgress: profileData,
          currentOnboardingStep: currentStep,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Also save to the AuthContext for potential recovery
        await saveOnboardingProgress({
          ...profileData,
          currentStep
        });
        
        console.log(`Progress saved at step ${currentStep}`);
      } catch (error) {
        console.error('Error saving onboarding progress:', error);
      } finally {
        setSavingProgress(false);
      }
    };
    
    // Don't save on initial load or mount
    if (!initialLoading && user) {
      saveProgress();
    }
  }, [currentStep, profileData, user, initialLoading]);

  const updateProfile = (field: string, value: any) => {
    console.log(`Updating ${field} to:`, value);
    
    if (field === 'prompts') {
      // If value is an array, use it directly
      if (Array.isArray(value)) {
        setProfileData(prev => ({ 
          ...prev, 
          [field]: value 
        }));
      } else {
        // If not an array (likely a deletion), filter out the empty prompt
        setProfileData(prev => ({
          ...prev,
          [field]: prev[field].filter((p: any) => p.question !== '')
        }));
      }
    } else {
      setProfileData(prev => ({ 
        ...prev, 
        [field]: value 
      }));
    }
  };

  const updatePrompt = (index: number, value: string) => {
    console.log('Updating prompts:', { index, value });
    
    // Create a copy of the current prompts
    let updatedPrompts = [...profileData.prompts];
    
    if (value === '') {
      // This is a deletion request - if index is valid
      if (index >= 0 && index < updatedPrompts.length) {
        console.log('Deleting prompt at index:', index);
        updatedPrompts = updatedPrompts.filter((_, i) => i !== index);
        console.log('Updated prompts after deletion:', JSON.stringify(updatedPrompts));
      }
    } else {
      // This is an update or add request
      if (index < updatedPrompts.length) {
        // Update existing prompt answer
        updatedPrompts[index] = { 
          ...updatedPrompts[index], 
          answer: value 
        };
      } else {
        // Add new prompt - with a default question since we can't pass it through this API
        updatedPrompts.push({ 
          question: "New prompt", // Default question that will be overwritten later
          answer: value 
        });
      }
    }
    
    // Update the parent state
    console.log('Final updated prompts:', JSON.stringify(updatedPrompts));
    updateProfile('prompts', updatedPrompts);
  };

  // Define the type for profile data
  interface ProfileData {
    displayName: string;
    photoURL: string;
    bio: string;
    location: string;
    gender: string;
    pronouns: string;
    pronounsVisible?: boolean; 
    ageRange: string;
    age: string;
    ageConfirmed?: boolean;
    height: string;
    ethnicity: string;
    wantChildren: string;
    currentChildren?: string;
    lifestyle: string[];
    interests: string[];
    dealBreaker: boolean;
    prompts: Array<{question: string; answer: string}>;
    subscriptionPlan: string;
    [key: string]: any;
    locationCoordinates?: {
      latitude: number;
      longitude: number;
      address: string;
      neighborhood?: string;
      city?: string;
      country?: string;
    };
  }

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      // Validate current step before advancing
      if (STEPS[currentStep] === 'age' && !profileData.age) {
        Alert.alert('Missing Information', 'Please enter your age to continue');
        return;
      }

      if (STEPS[currentStep] === 'location' && !profileData.locationCoordinates) {
        Alert.alert('Missing Information', 'Please select your location to continue');
        return;
      }
      
      if (STEPS[currentStep] === 'height' && !profileData.height) {
        Alert.alert('Missing Information', 'Please enter your height to continue');
        return;
      }
      
      if (STEPS[currentStep] === 'ethnicity' && !profileData.ethnicity) {
        Alert.alert('Missing Information', 'Please select your ethnicity to continue');
        return;
      }
      
      if (STEPS[currentStep] === 'children' && !profileData.wantChildren) {
        Alert.alert('Missing Information', 'Please select an option to continue');
        return;
      }
      
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      try {
        setLoading(true);
        setError(null);
        
        if (user) {
          // Validate critical profile fields
          if (!profileData.gender) {
            setError('Gender selection is required');
            Alert.alert('Missing Information', 'Please select your gender to continue');
            // Go back to gender selection step
            const genderStepIndex = STEPS.indexOf('gender');
            if (genderStepIndex >= 0) {
              setCurrentStep(genderStepIndex);
            }
            setLoading(false);
            return;
          }
  
          // Check for valid gender value
          if (profileData.gender !== 'male' && profileData.gender !== 'female') {
            console.error(`Invalid gender value: ${profileData.gender}`);
            setError('Please select either male or female');
            Alert.alert('Invalid Selection', 'Please select either male or female');
            const genderStepIndex = STEPS.indexOf('gender');
            if (genderStepIndex >= 0) {
              setCurrentStep(genderStepIndex);
            }
            setLoading(false);
            return;
          }
          
          // Validate age is provided
          if (!profileData.age) {
            setError('Age is required');
            Alert.alert('Missing Information', 'Please enter your age to continue');
            const ageStepIndex = STEPS.indexOf('age');
            if (ageStepIndex >= 0) {
              setCurrentStep(ageStepIndex);
            }
            setLoading(false);
            return;
          }
          
          // Let's add logs to verify data being saved
          console.log('Saving profile data:', {
            displayName: profileData.displayName,
            gender: profileData.gender, 
            age: profileData.age,
            pronoun: profileData.pronouns,
            ageRange: profileData.ageRange,
            height: profileData.height,
            ethnicity: profileData.ethnicity,
            wantChildren: profileData.wantChildren
          });
          
          console.log('Final save - wantChildren value:', profileData.wantChildren);

          // Update Firestore with complete profile data
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, {
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            bio: profileData.bio,
            location: profileData.location,
            gender: profileData.gender, 
            datingPreferences: profileData.datingPreferences,
            datingPreferencesVisible: profileData.datingPreferencesVisible !== false,
            pronouns: profileData.pronouns,
            pronounsVisible: profileData.pronounsVisible !== false,
            age: profileData.age,
            ageRange: profileData.ageRange,
            height: profileData.height,
            ethnicity: profileData.ethnicity,
            wantChildren: profileData.wantChildren,
            childrenVisible: profileData.childrenVisible !== false,
            currentChildrenVisible: profileData.currentChildrenVisible !== false,
            workplace: profileData.workplace,
            workplaceVisible: profileData.workplaceVisible,
            jobTitle: profileData.jobTitle,
            jobTitleVisible: profileData.jobTitleVisible,
            school: profileData.school,
            schoolVisible: profileData.schoolVisible,
            education: profileData.education,
            educationVisible: false, 
            religiousBeliefs: profileData.religiousBeliefs,
            religiousBeliefsVisible: profileData.religiousBeliefsVisible,
            politicalBeliefs: profileData.politicalBeliefs,
            politicalBeliefsVisible: profileData.politicalBeliefsVisible,
            drinking: profileData.drinking,
            drinkingVisible: profileData.drinkingVisible,
            smoking: profileData.smoking,
            smokingVisible: profileData.smokingVisible,
            drugUsage: profileData.drugUsage,
            drugUsageVisible: profileData.drugUsageVisible,
            lifestyle: profileData.lifestyle,
            lifestyleVisible: profileData.lifestyleVisible !== false,
            interests: profileData.interests,
            dealBreaker: Boolean(profileData.dealBreaker),
            prompts: profileData.prompts,
            subscriptionPlan: profileData.subscriptionPlan,
            hasCompletedOnboarding: true,
            updatedAt: serverTimestamp(),
            // Clear onboarding progress data since it's now complete
            onboardingProgress: null,
            onboardingStartTime: null
          }, { merge: true });
          
          await setHasCompletedOnboarding(true);
          
          // Verify the gender was properly set
          const verifyDoc = await getDoc(userRef);
          if (verifyDoc.exists()) {
            const userData = verifyDoc.data();
            console.log('Verified saved gender:', userData.gender);
            console.log('Verified saved age:', userData.age);
            console.log('Verified saved pronouns:', userData.pronouns);
            console.log('Verified saved ageRange:', userData.ageRange);
            console.log('Verified saved height:', userData.height);
            console.log('Verified saved ethnicity:', userData.ethnicity);
            console.log('Verified saved wantChildren:', userData.wantChildren);
            
            if (!userData.gender) {
              console.error('Gender not saved properly!');
            }
            
            if (!userData.age) {
              console.error('Age not saved properly!');
            }
          }
          
          router.replace('/(tabs)');
        } else {
          throw new Error('User not authenticated');
        }
      } catch (error: any) {
        console.error('Error updating profile:', error);
        setError(error.message || 'An unexpected error occurred');
        Alert.alert('Error', 'Failed to complete onboarding. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateAge = (birthdate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    return age;
  };

  const isCurrentStepValid = () => {
    const step = STEPS[currentStep];

    if (step === 'gender' && profileData.showingSexualitySubpage) {
      return false;
    }
    
    switch (step) {
      case 'profile':
        return profileData.firstName.trim() !== '' && 
               profileData.bio.trim() !== '';
      case 'gender':
        return !!profileData.gender;
      case 'datingPreference':
        return profileData.datingPreferences.length > 0;
      case 'relationshipType':
        return !!profileData.relationshipType;
      case 'dateOfBirth':
        return !!profileData.birthDate && 
                !!profileData.age && 
                !!profileData.ageRange && 
                profileData.ageConfirmed === true;
      case 'location':
        // Check if we have valid location data
        return profileData.locationCoordinates !== null && 
                profileData.locationCoordinates.latitude !== undefined &&
                profileData.locationCoordinates.longitude !== undefined &&
                profileData.locationCoordinates.address !== '';
      case 'pronouns':
        return !!profileData.pronouns;
      case 'height':
        return !!profileData.height;
      case 'ethnicity':
        return !!profileData.ethnicity;
      case 'currentChildren':
        return !!profileData.currentChildren;
      case 'children':
        return !!profileData.wantChildren;
      case 'workplace':
        return !!profileData.workplace;
      case 'jobTitle':
        return !!profileData.jobTitle;
      case 'school':
        return !!profileData.school;
      case 'education':
        return !!profileData.education;
      case 'religiousBeliefs':
        return !!profileData.religiousBeliefs;
      case 'politicalBeliefs':
        return !!profileData.politicalBeliefs;
      case 'drinking':
        return !!profileData.drinking;
      case 'smoking':
        return !!profileData.smoking;
      case 'drugUsage':
        return !!profileData.drugUsage;
      case 'lifestyle':
        return profileData.lifestyle.length > 0;
      case 'interests':
        return profileData.interests.length > 0;
      case 'prompts':
        return profileData.prompts.some(prompt => prompt.answer.trim() !== '');
      case 'subscription':
      case 'welcome':
        return true;
      default:
        return false;
    }
  };

  const renderHeader = () => {
    const step = STEPS[currentStep];
    
    // Don't render header for subscription or welcome screens
    if (step === 'subscription' || step === 'welcome') {
      return null;
    }
    
    let title = '';
    
    if (step === 'gender' && profileData.showingSexualitySubpage) {
      title = 'Sexuality';
    } else {
      switch (step) {
        case 'profile':
          title = 'Set up your Profile';
          break;
      case 'gender':
        title = 'Gender';
        break;
      case 'datingPreference':
        title = 'Dating Preference';
        break;
      case 'relationshipType':
        title = 'Relationship Type';
        break;
      case 'dateOfBirth':
        title = 'Age';
        break;
      case 'location':
        title = 'Location';  
        break;
      case 'pronouns':
        title = 'Pronouns';
        break;
      case 'height':
        title = 'Height';
        break;
      case 'ethnicity':
        title = 'Ethnicity';
        break;
      case 'children':
        title = 'Children';
        break;
      case 'currentChildren':
        title = 'Current Children';
        break;
      case 'workplace':
        title = 'Workplace';
        break;
      case 'jobTitle':
        title = 'Job Title';
        break;
      case 'school':
        title = 'School';
        break;
      case 'education':
        title = 'Education Level';
        break;
      case 'religiousBeliefs':
        title = 'Religious Beliefs';
        break;
      case 'politicalBeliefs':
        title = 'Political Beliefs';
        break;
      case 'drinking':
        title = 'Drinking Habits';
        break;
      case 'smoking':
        title = 'Smoking Habits';
        break;
      case 'drugUsage':
        title = 'Drug Usage';
        break;
      case 'lifestyle':
        title = 'Dating Intentions';
        break;
      case 'interests':
        title = 'Interests';
        break;
      case 'prompts':
        title = 'Prompts';
        break;
    }
  }
    
    return (
      <View style={styles.header}>
        {(currentStep > 0 || profileData.showingSexualitySubpage) && (
          <TouchableOpacity 
            onPress={profileData.showingSexualitySubpage ? () => updateProfile('showingSexualitySubpage', false) : handleBack}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        {savingProgress && (
          <ActivityIndicator size="small" color="#FF6B6B" style={styles.savingIndicator} />
        )}
      </View>
    );
  };

  const renderStep = () => {
    const step = STEPS[currentStep];
    
    switch (step) {
      case 'profile':
        return (
        <ProfileSetup 
          data={{
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            bio: profileData.bio,
            location: profileData.location,
            firstName: profileData.firstName || '',
            lastName: profileData.lastName || ''
          }}
          onUpdate={updateProfile}
          onNext={handleNext}
        />
        );
        case 'gender':
          if (profileData.showingSexualitySubpage) {
            // Render sexuality selection as a subpage
            return (
              <SexualitySelection 
                selectedSexuality={profileData.sexuality}
                onSelectSexuality={(sexuality) => updateProfile('sexuality', sexuality)}
                visibleOnProfile={profileData.sexualityVisible}
                onToggleVisibility={(visible) => updateProfile('sexualityVisible', visible)}
                onBack={() => updateProfile('showingSexualitySubpage', false)}
              />
            );
          }
          
          return (
            <GenderSelection 
              selectedGender={profileData.gender}
              onSelectGender={(gender) => {
                console.log('Gender selected:', gender);
                updateProfile('gender', gender);
              }}
              sexuality={profileData.sexuality}
              onSelectSexuality={(sexuality) => updateProfile('sexuality', sexuality)}
              sexualityVisible={profileData.sexualityVisible}
              onToggleSexualityVisibility={(visible) => updateProfile('sexualityVisible', visible)}
              onShowSexuality={() => updateProfile('showingSexualitySubpage', true)}
            />
          );
          case 'datingPreference':
            return (
              <DatingPreferenceSelection 
                selectedPreferences={profileData.datingPreferences}
                onSelectPreferences={(preferences) => updateProfile('datingPreferences', preferences)}
                visibleOnProfile={profileData.datingPreferencesVisible}
                onToggleVisibility={(visible) => updateProfile('datingPreferencesVisible', visible)}
              />
            );
        case 'relationshipType':
          return (
            <RelationshipTypeSelection
              selectedRelationshipType={profileData.relationshipType}
              onSelectRelationshipType={(relationshipType) => updateProfile('relationshipType', relationshipType)}
              customDescription={profileData.relationshipTypeCustomDescription}
              onUpdateCustomDescription={(description) => updateProfile('relationshipTypeCustomDescription', description)}
              visibleOnProfile={profileData.relationshipTypeVisible}
              onToggleVisibility={(visible) => updateProfile('relationshipTypeVisible', visible)}
            />
          );
        case 'pronouns':
          return (
            <PronounsSelection 
              selectedPronouns={profileData.pronouns}
              onSelectPronouns={(pronouns) => updateProfile('pronouns', pronouns)}
              visibleOnProfile={profileData.pronounsVisible !== false}
              onToggleVisibility={(visible) => updateProfile('pronounsVisible', visible)}
            />
          );
        case 'dateOfBirth':
          return (
            <DateOfBirthSelection
              selectedDate={profileData.birthDate || null}
              onSelectDate={(date) => {
                // Ensure date is a Date object
                const selectedDateObj = date instanceof Date ? date : new Date(date);
                const newAge = calculateAge(selectedDateObj);
                updateProfile('birthDate', selectedDateObj);
                updateProfile('age', newAge.toString());
              }}
              age={profileData.age}
              ageRange={profileData.ageRange}
              onSelectAgeRange={(range) => updateProfile('ageRange', range)}
              onAgeConfirm={(confirmed) => {
                // Add a new field to track age confirmation
                updateProfile('ageConfirmed', confirmed);
              }}
            />
          );
      case 'age':
        return (
          <AgeSelection 
            selectedAgeRange={profileData.ageRange}
            onSelectAge={(ageRange) => updateProfile('ageRange', ageRange)}
            age={profileData.age}
            onAgeChange={(age) => updateProfile('age', age)}
          />
        );
        case 'location':
          return (
          <LocationSelection
            selectedLocation={profileData.locationCoordinates}
            onLocationSelect={(location) => {
              updateProfile('locationCoordinates', {
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
              });
              updateProfile('location', location.city || location.address);
            }}
          />
          );
        case 'height':
          return (
            <HeightSelection
              height={profileData.height}
              onHeightChange={(height) => updateProfile('height', height)}
            />
          );
          case 'ethnicity':
            return (
              <EthnicitySelection 
                selectedEthnicity={profileData.ethnicity}
                onSelectEthnicity={(ethnicity) => updateProfile('ethnicity', ethnicity)}
                visibleOnProfile={profileData.ethnicityVisible}
                onToggleVisibility={(visible) => updateProfile('ethnicityVisible', visible)}
              />
            );
            case 'children':
              return (
                <ChildrenSelection
                  selectedOption={profileData.wantChildren}
                  onSelectOption={(option) => updateProfile('wantChildren', option)}
                  visibleOnProfile={profileData.childrenVisible !== false}
                  onToggleVisibility={(visible) => updateProfile('childrenVisible', visible)}
                />
              );
              case 'currentChildren':
                return (
                  <CurrentChildrenSelection 
                    selectedOption={profileData.currentChildren}
                    onSelectOption={(option) => updateProfile('currentChildren', option)}
                    visibleOnProfile={profileData.currentChildrenVisible !== false}
                    onToggleVisibility={(visible) => updateProfile('currentChildrenVisible', visible)}
                  />
                );
      case 'lifestyle':
        return (
          <ExpectationsLifestyle 
            selectedLifestyle={profileData.lifestyle}
            onUpdateLifestyle={(lifestyle) => updateProfile('lifestyle', lifestyle)}
            visibleOnProfile={profileData.lifestyleVisible}
            onToggleVisibility={(visible) => updateProfile('lifestyleVisible', visible)}
          />
        );
      case 'interests':
        return (
          <InterestsSelection 
            selectedInterests={profileData.interests}
            onSelectInterests={(interests) => updateProfile('interests', interests)}
            dealBreaker={profileData.dealBreaker}
            onToggleDealBreaker={(value) => updateProfile('dealBreaker', value)}
          />
        );
        case 'workplace':
          return (
            <WorkplaceSelection
              workplace={profileData.workplace}
              onWorkplaceChange={(workplace) => updateProfile('workplace', workplace)}
              visibleOnProfile={profileData.workplaceVisible}
              onToggleVisibility={(visible) => updateProfile('workplaceVisible', visible)}
            />
          );
          
        case 'jobTitle':
          return (
            <JobTitleSelection
              jobTitle={profileData.jobTitle}
              onJobTitleChange={(jobTitle) => updateProfile('jobTitle', jobTitle)}
              visibleOnProfile={profileData.jobTitleVisible}
              onToggleVisibility={(visible) => updateProfile('jobTitleVisible', visible)}
            />
          );
          
        case 'school':
          return (
            <SchoolSelection
              school={profileData.school}
              onSchoolChange={(school) => updateProfile('school', school)}
              visibleOnProfile={profileData.schoolVisible}
              onToggleVisibility={(visible) => updateProfile('schoolVisible', visible)}
            />
          );
          
          case 'education':
            return (
              <EducationLevelSelection
                selectedOption={profileData.education}
                onSelectOption={(option) => updateProfile('education', option)}
              />
            );
          
        case 'religiousBeliefs':
          return (
            <ReligiousBeliefSelection
              selectedOption={profileData.religiousBeliefs}
              onSelectOption={(option) => updateProfile('religiousBeliefs', option)}
              visibleOnProfile={profileData.religiousBeliefsVisible}
              onToggleVisibility={(visible) => updateProfile('religiousBeliefsVisible', visible)}
            />
          );
          
        case 'politicalBeliefs':
          return (
            <PoliticalBeliefSelection
              selectedOption={profileData.politicalBeliefs}
              onSelectOption={(option) => updateProfile('politicalBeliefs', option)}
              visibleOnProfile={profileData.politicalBeliefsVisible}
              onToggleVisibility={(visible) => updateProfile('politicalBeliefsVisible', visible)}
            />
          );
          
        case 'drinking':
          return (
            <DrinkingSelection
              selectedOption={profileData.drinking}
              onSelectOption={(option) => updateProfile('drinking', option)}
              visibleOnProfile={profileData.drinkingVisible}
              onToggleVisibility={(visible) => updateProfile('drinkingVisible', visible)}
            />
          );
          
        case 'smoking':
          return (
            <SmokingSelection
              selectedOption={profileData.smoking}
              onSelectOption={(option) => updateProfile('smoking', option)}
              visibleOnProfile={profileData.smokingVisible}
              onToggleVisibility={(visible) => updateProfile('smokingVisible', visible)}
            />
          );
          
        case 'drugUsage':
          return (
            <DrugUsageSelection
              selectedOption={profileData.drugUsage}
              onSelectOption={(option) => updateProfile('drugUsage', option)}
              visibleOnProfile={profileData.drugUsageVisible}
              onToggleVisibility={(visible) => updateProfile('drugUsageVisible', visible)}
            />
          );
          case 'prompts':
            return (
              <ProfilePrompts 
                prompts={profileData.prompts}  // Use prompts instead of userPrompts
                onUpdatePrompt={(index, answer) => {
                  const updatedPrompts = [...profileData.prompts];
                  
                  // If it's an existing prompt
                  if (index < updatedPrompts.length) {
                    updatedPrompts[index] = {
                      ...updatedPrompts[index],
                      answer
                    };
                  } else {
                    // Adding a new prompt
                    updatedPrompts.push({
                      question: "",  // This will be set by the component
                      answer
                    });
                  }
                  
                  updateProfile('prompts', updatedPrompts);
                }}
                onUpdatePrompts={(updatedPrompts) => {
                  console.log('Directly updating entire prompts array:', JSON.stringify(updatedPrompts));
                  updateProfile('prompts', updatedPrompts);
                }}
                onClose={() => handleNext()}
              />
            );
      case 'subscription':
        return (
          <SubscriptionPlan 
            selectedPlan={profileData.subscriptionPlan}
            onSelectPlan={(planId) => updateProfile('subscriptionPlan', planId)}
            onSkip={handleNext}
            onContinue={handleNext}
          />
        );
      case 'welcome':
        return (
          <Welcome onContinue={handleNext} />
        );
      default:
        return null;
    }
  };

  // If user is not authenticated, redirect to auth screen
  if (!user && !loading && !initialLoading) {
    router.replace('/(auth)/signup');
    return null;
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {STEPS[currentStep] !== 'subscription' && STEPS[currentStep] !== 'welcome' && (
        <ProgressBar 
          currentStep={currentStep + 1} 
          totalSteps={STEPS.length - 2} // Don't count subscription and welcome
        />
      )}
      
      <View style={styles.content}>
        {renderStep()}
      </View>
      
      {STEPS[currentStep] !== 'subscription' && 
       STEPS[currentStep] !== 'welcome' && (
        <OnboardingNavigation 
          onBack={handleBack}
          onNext={handleNext}
          canGoBack={currentStep > 0}
          canGoNext={isCurrentStepValid()}
        />
      )}
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Saving your profile...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 10,
    paddingBottom: 10,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#292929',
    flex: 1,
  },
  savingIndicator: {
    marginLeft: 10,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  }
});