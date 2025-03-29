import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  FlatList,
  Platform,
  ViewToken,
  InteractionManager
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Define an interface for our splash screen items
interface SplashScreenItem {
  id: number;
  type: string;
  image: any;
  title?: string;
  description?: string;
  buttonText?: string;
  dotIndex?: number;
}

// Use smaller images if possible to reduce memory usage
const SPLASH_SCREENS: SplashScreenItem[] = [
  {
    id: 1,
    type: 'intro',
    image: require('../../assets/images/onboarding/SplashScreen1.jpg'),
  },
  {
    id: 2,
    type: 'feature',
    image: require('../../assets/images/onboarding/SplashScreen2.png'),
    title: 'Speed Dating Mode',
    description: 'Fast, fun, and flirty! Match, chat, and vibe—all in just a few minutes.',
    buttonText: 'Get Started',
    dotIndex: 0
  },
  {
    id: 3,
    type: 'feature',
    image: require('../../assets/images/onboarding/SplashScreen3.png'),
    title: 'Live Lineup Matchmaking',
    description: 'Step into the spotlight! Join the lineup, get chosen, or make your pick in real-time.',
    buttonText: 'Get Started',
    dotIndex: 1
  }
];

// Simplified splash screen for testing
export default function SplashScreen() {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    // Simple delayed navigation
    const timer = setTimeout(() => {
      setReady(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (ready) {
      router.push('/(auth)/signup');
    }
  }, [ready]);
  
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Image 
        source={require('../../assets/images/onboarding/SplashScreen1.jpg')}
        style={styles.fullImage}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  slide: {
    width,
    height: '100%',
  },
  fullImage: {
    width,
    height: '100%',
  },
  paginationWithinImage: {
    position: 'absolute',
    flexDirection: 'row',
    alignSelf: 'center',
    bottom: height * 0.49,
    zIndex: 10,
  },
  featureContent: {
    position: 'absolute',
    top: height * 0.59,
    left: 0,
    paddingHorizontal: 20,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'left',
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: '100%',
  },
  buttonSection: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    marginBottom: 50,
  },
  buttonWrapper: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  activePaginationDot: {
    backgroundColor: '#FF6B6B',
    width: 16,
  },
  inactivePaginationDot: {
    backgroundColor: '#DDD',
  }
});