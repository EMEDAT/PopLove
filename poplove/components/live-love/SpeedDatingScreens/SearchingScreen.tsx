// components/live-love/SpeedDating/SearchingScreen.tsx
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform,
  Dimensions
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface SearchingScreenProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  onBack?: () => void; // Make optional
}

export default function SearchingScreen({ 
  timeLeft, 
  formatTime
}: SearchingScreenProps) {
  // Animated values for circle progress and dots
  const progressValue = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);

  // Animation styles for trailing dot
  const animatedTrailingDotStyle = useAnimatedStyle(() => {
    // Use middle circle's radius (140 from your SVG)
    const radius = 150; 
    
    // Full circle rotation
    const angle = interpolate(
      progressValue.value, 
      [0, 1], 
      [0, 2 * Math.PI]
    );
  
    return {
      position: 'absolute',
      transform: [
        { 
          translateX: radius * Math.cos(angle - Math.PI/2) 
        },
        { 
          translateY: radius * Math.sin(angle - Math.PI/2) 
        }
      ]
    };
  });

  // Dots pulsing animation
  const animatedDotsStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        dotsOpacity.value,
        [0, 1],
        [0.3, 1]
      )
    };
  });

  // Animate progress and dots
  useEffect(() => {
    // Circular progress animation
    progressValue.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1 // Infinite loop
    );

    // Dots pulsing animation
    dotsOpacity.value = withRepeat(
      withTiming(1, { duration: 500 }),
      -1, 
      true // Reverse the animation
    );
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Speed Dating Mode</Text>
      
      <View style={styles.contentContainer}>
        <View style={styles.timerContainer}>
        <Svg width={width * 0.9} height={width * 0.9} viewBox="0 0 300 300">
              {/* Outer thin circle */}
              <Circle
                cx={150}
                cy={150}
                r={150}
                stroke="#FFE4E4"
                strokeWidth={2}
                fill="transparent"
              />
              
              {/* Middle thin circle */}
              <Circle
                cx={150}
                cy={150}
                r={140}
                stroke="#FFE4E4"
                strokeWidth={2}
                fill="transparent"
              />
              
              {/* Inner thin circle */}
              <Circle
                cx={150}
                cy={150}
                r={130}
                stroke="#FFE4E4"
                strokeWidth={2}
                fill="transparent"
              />
            </Svg>
          
          {/* Trailing dot */}
          <Animated.View 
            style={[
              styles.trailingDot, 
              animatedTrailingDotStyle
            ]} 
          />
          
          {/* Timer text */}
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
        </View>
        
        {/* Finding text */}
        <Text style={styles.searchingText}>Finding the perfect pair...</Text>
        
        {/* Animated waiting dots */}
        <Animated.View 
          style={[
            styles.dotsContainer,
            animatedDotsStyle
          ]}
        >
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.dot} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  headerTitle: {
    textAlign: 'left',
    fontSize: 22,
    fontWeight: '500',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 0,
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 70,
    position: 'relative',
  },
  trailingDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
  },
  timerText: {
    position: 'absolute',
    fontSize: 50,
    fontWeight: '400',
    color: '#FF6B6B',
  },
  searchingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginHorizontal: 4,
  },
});