// components/live-love/LineUpScreens/EliminatedScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLineUp } from './LineUpContext';

// Create a logger function for this component
const logEliminated = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [EliminatedScreen] ❌ ${message}`, data ? data : '');
};

interface EliminatedScreenProps {
  onBack: () => void;
}

export default function EliminatedScreen({ onBack }: EliminatedScreenProps) {
  logEliminated('Component rendering');
  
  const { loading, eliminationTimeLeft } = useLineUp();
  const [timeLeft, setTimeLeft] = useState(eliminationTimeLeft || 48 * 60 * 60); // 48 hours in seconds
  const [timerActive, setTimerActive] = useState(true);
  
  // Log component lifecycle
  useEffect(() => {
    logEliminated('Component mounted', { 
      initialTimeLeft: timeLeft,
      eliminationTimeLeft
    });
    
    return () => {
      logEliminated('Component unmounted');
    };
  }, []);

  // Log state changes
  useEffect(() => {
    if (timeLeft % 60 === 0 || timeLeft < 10) {  // Log every minute or when under 10 seconds
      logEliminated('Time left updated', { 
        timeLeft, 
        formattedTime: formatTimeLeft(),
        timerActive
      });
    }
  }, [timeLeft, timerActive]);

  // Convert seconds to readable time format
  const formatTimeLeft = () => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    
    return `${hoursStr}:${minutesStr}:${secondsStr}`;
  };
  
  // Countdown timer effect
  useEffect(() => {
    logEliminated('Setting up countdown timer');
    
    const timer = setInterval(() => {
      if (timerActive) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            logEliminated('Timer reached zero, clearing interval');
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => {
      logEliminated('Clearing timer interval');
      clearInterval(timer);
    };
  }, [timerActive]);

  logEliminated('Rendering component', { 
    timeLeftFormatted: formatTimeLeft(),
    loading,
    timerActive
  });
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            logEliminated('Back button pressed');
            onBack();
          }} 
          style={styles.backButton}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Line-Up Mode</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.eliminatedContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="close-circle" size={80} color="#FF3B30" />
          </View>
          
          <Text style={styles.eliminatedTitle}>
            Oops! Too many pops
          </Text>
          
          <Text style={styles.eliminatedSubtitle}>
            contestant is eliminated
          </Text>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Next round in</Text>
            <Text style={styles.timeValue}>{formatTimeLeft()}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => {
              logEliminated('Skip button pressed, returning to selection');
              onBack();
            }}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#344054',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  eliminatedContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginBottom: 20,
  },
  eliminatedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 5,
    textAlign: 'center',
  },
  eliminatedSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  skipButton: {
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});