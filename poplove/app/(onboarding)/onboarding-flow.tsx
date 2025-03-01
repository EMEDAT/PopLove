// app/(onboarding)/onboarding-flow.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { firestore, serverTimestamp } from '../../lib/firebase';

// Import the onboarding components (using default imports)
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
  const { user, setHasCompletedOnboarding } = useAuthContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
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
            lifestyle: profileData.lifestyle,
            interests: profileData.interests,
            dealBreaker: profileData.dealBreaker,
            prompts: profileData.prompts,
            subscriptionPlan: profileData.subscriptionPlan,
            hasCompletedOnboarding: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          await setHasCompletedOnboarding(true);
          router.replace('/(tabs)');
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
            onSelectGender={(gender) => updateProfile('gender', gender)}
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
  },
  content: {
    flex: 1,
  }
});