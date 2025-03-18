// components/onboarding/Welcome.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Easing,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';

interface WelcomeProps {
  onContinue: () => void;
}

export default function Welcome({ onContinue }: WelcomeProps) {
  const { user, setHasCompletedOnboarding } = useAuthContext();
  
  // Animation values
  const heartScale = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const [titleText, setTitleText] = useState('');
  const [subtitleText, setSubtitleText] = useState('');
  const fullTitle = 'Welcome to PopLove';
  const fullSubtitle = 'Love is just a pop away!';
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Automatically complete onboarding when animation completes
  useEffect(() => {
    if (animationComplete && user) {
      const completeOnboarding = async () => {
        try {
          // Mark onboarding as complete in Firebase
          await setHasCompletedOnboarding(true);
          
          // Wait a moment to show the welcome screen
          setTimeout(() => {
            // Call the parent onContinue function
            onContinue();
            
            // Navigate to main app
            router.replace('/(tabs)');
          }, 1000);
        } catch (error) {
          console.error('Error completing onboarding:', error);
        }
      };
      
      completeOnboarding();
    }
  }, [animationComplete, user]);

  // Animation effects
  useEffect(() => {
    // Heart beat animation - slower, more realistic
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.15,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Fade in animation
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    // Type title animation - slower typing speed
    let titleIndex = 0;
    const titleInterval = setInterval(() => {
      if (titleIndex <= fullTitle.length) {
        setTitleText(fullTitle.substring(0, titleIndex));
        titleIndex++;
      } else {
        clearInterval(titleInterval);
        
        // Start subtitle animation after title completes
        setTimeout(() => {
          let subtitleIndex = 0;
          const subtitleInterval = setInterval(() => {
            if (subtitleIndex <= fullSubtitle.length) {
              setSubtitleText(fullSubtitle.substring(0, subtitleIndex));
              subtitleIndex++;
            } else {
              clearInterval(subtitleInterval);
              
              // Set animation complete flag
              setTimeout(() => {
                setAnimationComplete(true);
              }, 1000);
            }
          }, 120); // Slower typing for subtitle
        }, 700);
      }
    }, 120); // Slower typing for title
    
    return () => {
      clearInterval(titleInterval);
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#fff', '#FFF5F5']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Animated.View 
            style={[
              styles.heartContainer,
              { 
                transform: [{ scale: heartScale }],
                opacity: fadeIn
              }
            ]}
          >
            <Text style={styles.heartEmoji}>❤️</Text>
          </Animated.View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{titleText}</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>{subtitleText}</Text>
              {subtitleText === fullSubtitle && 
                <Text style={styles.cursorBlink}>|</Text>
              }
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartContainer: {
    marginBottom: 20,
  },
  heartEmoji: {
    fontSize: 80,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#FF6B6B',
    fontFamily: 'Inter_700Bold',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    fontFamily: 'Inter_400Regular',
  },
  cursorBlink: {
    fontSize: 20,
    color: '#666',
    marginBottom: 40,
    opacity: 0.7,
    fontFamily: 'Inter_400Regular',
  }
});