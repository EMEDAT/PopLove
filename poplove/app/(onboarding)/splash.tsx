// app/(onboarding)/splash.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  FlatList
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Video } from 'expo-av';
import { ResizeMode } from 'expo-av';


const { width, height } = Dimensions.get('window');

// Splash screens exactly as per your design
const SPLASH_SCREENS = [
  {
    id: 1,
    type: 'intro',
    // Replace image with video source
    video: require('../../assets/images/onboarding/video/SplashScreen1.mp4'),
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

export default function SplashScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const videoRef = useRef<Video>(null);

  // Auto-advance from first screen after 2 seconds
  useEffect(() => {
    // Don't need timer anymore - video end will trigger navigation
  }, [activeIndex]);
  
  const renderScreen = ({ item, index }: { item: any, index: number }) => {
if (item.type === 'intro') {
  return (
    <View style={styles.slide}>
      <Video
        ref={videoRef}
        source={item.video}
        posterSource={require('../../assets/images/onboarding/SplashScreen1.jpg')}
        usePoster={true}
        posterStyle={{ width, height: '100%' }}
        style={styles.fullImage}
        resizeMode={ResizeMode.COVER}
        shouldPlay={activeIndex === 0}
        isLooping={true}
        isMuted={true}
        rate={2.0}
        useNativeControls={false}
        onLoad={() => console.log("Video loaded")}
        onError={(error) => console.log("Video error:", error)}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            setActiveIndex(1);
            flatListRef.current?.scrollToIndex({ index: 1, animated: true });
          }
        }}
      />
    </View>
  );
} else {
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
              onPress={() => router.push('/(auth)')}
            >
              <LinearGradient
                colors={['#EC5F61', '#F0B433'] }
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
                  source={require('../../assets/icons/GoogleIcon.png')} 
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Image 
                  source={require('../../assets/icons/FacebookIcon.png')} 
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Image 
                  source={require('../../assets/icons/AppleIcon.png')} 
                  style={styles.socialIcon}
                />
              </TouchableOpacity>
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
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          if (index === 0 && videoRef.current) {
            videoRef.current.replayAsync();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  orText: {
    marginHorizontal: 8,
    color: '#666',
    fontSize: 14,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 88,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  socialIcon: {
    width: 20,
    height: 20,
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
  },
  centeredVideo: {
    alignSelf: 'center',
    justifyContent: 'center',
  }
});