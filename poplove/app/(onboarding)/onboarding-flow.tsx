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
import AgeSelection from '../../components/onboarding/AgeSelection';
import ExpectationsLifestyle from '../../components/onboarding/ExpectationsLifestyle';
import InterestsSelection from '../../components/onboarding/InterestsSelection';
import ProfilePrompts from '../../components/onboarding/ProfilePrompts';
import SubscriptionPlan from '../../components/onboarding/SubscriptionPlan';
import Welcome from '../../components/onboarding/Welcome';
import ProgressBar from '../../components/onboarding/ProgressBar';
import OnboardingNavigation from '../../components/onboarding/OnboardingNavigation';

// Define all the steps in the onboarding flow
const STEPS = [
  'profile',
  'gender',
  'age',
  'interests',
  'prompts',
  'lifestyle',
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
  
  // Profile data
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || '',
    bio: '',
    location: '',
    gender: '',
    ageRange: '',
    lifestyle: [] as string[],
    interests: [] as string[],
    dealBreaker: false,
    prompts: [
      { question: 'My greatest strength?', answer: '' },
      { question: 'My most irrational fear?', answer: '' },
      { question: 'Dating me is like?', answer: '' }
    ],
    subscriptionPlan: 'basic'
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
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const updatePrompt = (index: number, answer: string) => {
    const updatedPrompts = [...profileData.prompts];
    updatedPrompts[index] = { 
      ...updatedPrompts[index], 
      answer 
    };
    
    updateProfile('prompts', updatedPrompts);
  };

  // Define the type for profile data
  interface ProfileData {
    displayName: string;
    photoURL: string;
    bio: string;
    location: string;
    gender: string;
    ageRange: string;
    lifestyle: string[];
    interests: string[];
    dealBreaker: boolean;
    prompts: Array<{question: string; answer: string}>;
    subscriptionPlan: string;
    [key: string]: any; // For any other fields
  }

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
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
          
          // Let's add logs to verify data being saved
          console.log('Saving profile data:', {
            displayName: profileData.displayName,
            gender: profileData.gender, 
            ageRange: profileData.ageRange
          });
          
          // Update Firestore with complete profile data
          const userRef = doc(firestore, 'users', user.uid);
          await setDoc(userRef, {
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            bio: profileData.bio,
            location: profileData.location,
            gender: profileData.gender, // Make sure this is properly set
            ageRange: profileData.ageRange,
            lifestyle: profileData.lifestyle,
            interests: profileData.interests,
            dealBreaker: profileData.dealBreaker,
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
            
            if (!userData.gender) {
              console.error('Gender not saved properly!');
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

  const isCurrentStepValid = () => {
    const step = STEPS[currentStep];
    
    switch (step) {
      case 'profile':
        return profileData.displayName.trim() !== '' && 
               profileData.location.trim() !== '';
      case 'gender':
        return !!profileData.gender;
      case 'age':
        return !!profileData.ageRange;
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
    
    switch (step) {
      case 'profile':
        title = 'Set up your Profile';
        break;
      case 'gender':
        title = 'Gender';
        break;
      case 'age':
        title = 'Age';
        break;
      case 'lifestyle':
        title = 'Expectations & Lifestyle';
        break;
      case 'interests':
        title = 'Interests';
        break;
      case 'prompts':
        title = 'Prompts';
        break;
    }
    
    return (
      <View style={styles.header}>
        {currentStep > 0 && (
          <TouchableOpacity 
            onPress={handleBack}
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

// Replace the renderStep function in onboarding-flow.tsx

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
            location: profileData.location
          }}
          onUpdate={updateProfile}
          onNext={handleNext}
        />
      );
    case 'gender':
      return (
        <GenderSelection 
          selectedGender={profileData.gender}
          onSelectGender={(gender) => {
            console.log('Gender selected:', gender); // Add this log
            updateProfile('gender', gender);
          }}
        />
      );
    case 'age':
      return (
        <AgeSelection 
          selectedAgeRange={profileData.ageRange}
          onSelectAge={(ageRange) => updateProfile('ageRange', ageRange)}
        />
      );
    case 'lifestyle':
      return (
        <ExpectationsLifestyle 
          selectedLifestyle={profileData.lifestyle}
          onUpdateLifestyle={(lifestyle) => updateProfile('lifestyle', lifestyle)}
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
    case 'prompts':
      return (
        <ProfilePrompts 
          prompts={profileData.prompts}
          onUpdatePrompt={updatePrompt}
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
    router.replace('/(auth)');
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
    backgroundColor: 'white',
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