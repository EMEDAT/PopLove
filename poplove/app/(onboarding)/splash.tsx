// app/(onboarding)/splash.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  FlatList,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Simplified splash screens - removed the intro screen completely
const SPLASH_SCREENS = [
  {
    id: 0,
    type: 'feature',
    image: require('../../assets/images/onboarding/SplashScreen2.png'),
    title: 'Speed Dating Mode',
    description: 'Fast, fun, and flirty! Match, chat, and vibe—all in just a few minutes.',
    buttonText: 'Get Started',
    dotIndex: 0
  },
  {
    id: 1,
    type: 'feature',
    image: require('../../assets/images/onboarding/SplashScreen3.png'),
    title: 'Live Lineup Matchmaking',
    description: 'Step into the spotlight! Join the lineup, get chosen, or make your pick in real-time.',
    buttonText: 'Get Started',
    dotIndex: 1
  }
];

export default function SplashScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showInitialSplash, setShowInitialSplash] = useState(true);
  
  // Always define ALL hooks at the top level, even if conditionally used
  const flatListRef = useRef<FlatList>(null);
  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  // Show initial splash for 2 seconds
  useEffect(() => {
    if (showInitialSplash) {
      const timer = setTimeout(() => {
        setShowInitialSplash(false);
        setIsLoading(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showInitialSplash]);
  
  // If still showing initial splash screen
  if (showInitialSplash) {
    return (
      <View style={styles.fullScreenContainer}>
        <StatusBar style="dark" />
        <Image 
          source={require('../../assets/images/onboarding/Splash.jpg')}
          style={styles.fullSplashImage}
          resizeMode="cover"
        />
      </View>
    );
  }
  
  const renderScreen = ({ item, index }: { item: any, index: number }) => {
    // If there was an error during initialization, show a simplified version
    if (hasError) {
      return (
        <View style={[styles.slide, styles.errorContainer]}>
          <Text style={styles.featureTitle}>Welcome to PopLove</Text>
          <TouchableOpacity 
            style={styles.buttonWrapper} 
            onPress={() => router.push('/(auth)/signup')}
          >
            <LinearGradient
              colors={['#EC5F61', '#F0B433']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.slide}>
        <Image 
          source={item.image}
          style={styles.fullImage}
          resizeMode="contain"
        />
        
        <View style={styles.paginationWithinImage}>
          <View style={[
            styles.paginationDot,
            item.dotIndex === 0 ? styles.activePaginationDot : styles.inactivePaginationDot
          ]} />
          <View style={[
            styles.paginationDot,
            item.dotIndex === 1 ? styles.activePaginationDot : styles.inactivePaginationDot
          ]} />
        </View>
        
        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>{item.title}</Text>
          <Text style={styles.featureDescription}>{item.description}</Text>
        </View>
        
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.buttonWrapper} 
            onPress={() => router.push('/(auth)/signup')}
          >
            <LinearGradient
              colors={['#EC5F61', '#F0B433']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>{item.buttonText}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  if (isLoading) {
    // Show a simple loading state that won't cause crashes
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="dark" />
        <Text>Loading...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <FlatList
        ref={flatListRef}
        data={SPLASH_SCREENS}
        renderItem={renderScreen}
        keyExtractor={item => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50
        }}
        initialScrollIndex={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'black', // Use black background to avoid any white gaps
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  fullSplashImage: {
    width: '100%',
    height: '100%',
    flex: 1, // Fill available space
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
    backgroundColor: '#838F6F',
    width: 16,
  },
  inactivePaginationDot: {
    backgroundColor: '#DDD',
  }
});