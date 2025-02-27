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
  SafeAreaView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

// Define your splash screens
const SPLASH_SCREENS = [
  {
    id: 1,
    type: 'intro',
    image: require('../../assets/images/onboarding/splash1.png'),
  },
  {
    id: 2,
    type: 'feature',
    image: require('../../assets/images/onboarding/splash2.png'),
    title: 'Speed Dating Mode',
    description: 'Fast, fun, and flirty! Match, chat, and vibe—all in just a few minutes.',
    buttonText: 'Get Started',
    dotIndex: 0
  },
  {
    id: 3,
    type: 'feature',
    image: require('../../assets/images/onboarding/splash3.png'),
    title: 'Live Lineup Matchmaking',
    description: 'Step into the spotlight! Join the lineup, get chosen, or make your pick in real-time.',
    buttonText: 'Get Started',
    dotIndex: 1
  }
];

export default function SplashScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // Auto-advance from first screen after 2 seconds
  useEffect(() => {
    if (activeIndex === 0) {
      const timer = setTimeout(() => {
        setActiveIndex(1);
        flatListRef.current?.scrollToIndex({ index: 1, animated: true });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [activeIndex]);

  const handleNext = () => {
    if (activeIndex < SPLASH_SCREENS.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      router.push('/(auth)/');
    }
  };
  
  const renderScreen = ({ item, index }: { item: any, index: number }) => {
    if (item.type === 'intro') {
      // First screen - just show the full image without any buttons or indicators
      return (
        <View style={styles.slide}>
          <Image 
            source={item.image} 
            style={styles.fullImage}
            resizeMode="cover"
          />
        </View>
      );
    } else {
      // Feature screens
      return (
        <View style={styles.slide}>
          <Image 
            source={item.image}
            style={styles.fullImage}
            resizeMode="cover"
          />
          
          {/* Feature screens display indicator dots within the feature image area */}
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
                colors={['#FF6B6B', '#FFA07A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>{item.buttonText}</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>or</Text>
              <View style={styles.orLine} />
            </View>
            
            <View style={styles.socialButtonsRow}>
              <TouchableOpacity style={styles.socialButton}>
                <Image 
                  source={require('../../assets/images/google-icon.png')} 
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.socialButton}>
                  <Image 
                    source={require('../../assets/images/apple-icon.png')} 
                    style={styles.socialIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }
  };
  
  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
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
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    color: '#fff',
  },
  featureDescription: {
    fontSize: 13,
    color: '#eee',
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
  },
  buttonWrapper: {
    width: '100%',
    height: 50,
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
    fontSize: 16,
    fontWeight: '600',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#666',
  },
  orText: {
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 14,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 5,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  socialIcon: {
    width: 24,
    height: 24,
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
    backgroundColor: '#666',
  },
});