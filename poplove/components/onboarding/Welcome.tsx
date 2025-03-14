// components/onboarding/Welcome.tsx
import React, { useEffect } from 'react';
import { 
  View, 
  Image,
  StyleSheet
} from 'react-native';
import { useAuthContext } from '../auth/AuthProvider';
import { router } from 'expo-router';

interface WelcomeProps {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: WelcomeProps) {
  const { user, setHasCompletedOnboarding } = useAuthContext();
  
  // Automatically complete onboarding when this screen is shown
  useEffect(() => {
    const completeOnboarding = async () => {
      if (user) {
        try {
          // Mark onboarding as complete in Firebase
          await setHasCompletedOnboarding(true);
          
          // Wait a moment to show the welcome screen
          setTimeout(() => {
            // Call the parent onContinue function
            onContinue();
            
            // Navigate to main app
            router.replace('/(tabs)');
          }, 2000); // 2 second delay before navigation
        } catch (error) {
          console.error('Error completing onboarding:', error);
        }
      }
    };
    
    completeOnboarding();
  }, [user]);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/onboarding/Final_Onboard.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});