// components/live-love/SpeedDating/SearchingScreen.tsx
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform,
  Dimensions,
  TouchableOpacity  // Added for back button
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';  // Added for back icon

const { width } = Dimensions.get('window');

interface SearchingScreenProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  onBack?: () => void; // Optional callback for going back
}

export default function SearchingScreen({ 
  timeLeft, 
  formatTime,
  onBack
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
      <View style={styles.header}>
        {/* Back button */}
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Speed Dating Mode</Text>
      </View>
      
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
        
        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel Search</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 10, // Adjusted for Android
    paddingHorizontal: 16,
    marginTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  timerContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
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
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});