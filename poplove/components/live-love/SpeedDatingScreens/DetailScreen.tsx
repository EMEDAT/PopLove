import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Match } from '../SpeedDatingMode';
import { useAuthContext } from '../../../components/auth/AuthProvider';

const { width, height } = Dimensions.get('window');

interface DetailScreenProps {
  match: Match | null;
  onConnect: (match: Match) => void;
  onReject: (match: Match) => void;
  onBack: () => void;
}

export default function DetailScreen({ 
  match,
  onConnect,
  onReject,
  onBack
}: DetailScreenProps) {
  const { user } = useAuthContext();
  const [countdown, setCountdown] = useState(5);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // // If countdown reaches 0 and no action taken, go back to searching
      onBack();
    }
  }, [countdown, onBack]);

  if (!match || !user) return null;
  
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        onPress={onBack} 
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={24} color="#000" />
      </TouchableOpacity>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        {/* User Card */}
        <Image 
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
          style={[styles.card, styles.yourCard]}
        />
        
        {/* Match Card */}
        <Image 
          source={{ uri: match.photoURL }}
          style={[styles.card, styles.matchCard]}
        />

        {/* Heart Icons */}
        <Image
          source={require('../../../assets/images/main/VibeCheckLove.png')}
          style={[styles.heartIcon, styles.leftHeartIcon]}
        />
        
        <Image
          source={require('../../../assets/images/main/VibeCheckLove.png')}
          style={[styles.heartIcon, styles.rightHeartIcon]}
        />
      </View>

        {/* Matched Text */}
        <Text style={styles.matchedText}>You have been matched!</Text>

      {/* Chat Now Button */}
      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => onConnect(match)}
      >
        <LinearGradient
          colors={['#EC5F61', '#F0B433']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Text style={styles.chatButtonText}>Chat Now</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Countdown Text */}
      <Text style={styles.countdownText}>Next round in {countdown}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 10,
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardsContainer: {
    width: '100%',
    height: height * 0.5,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  card: {
    width: width * 0.45,
    height: height * 0.33,
    borderRadius: 15,
    position: 'absolute',
  },
  yourCard: {
    left: '10%',
    top: '55%',
    transform: [{ rotate: '-10deg' }],
    zIndex: 2,
  },
  matchCard: {
    right: '10%',
    bottom: '15%',
    transform: [{ rotate: '10deg' }],
    zIndex: 1,
  },
  heartIcon: {
    width: 45,
    height: 45,
    position: 'absolute',
    zIndex: 3,
  },
  leftHeartIcon: {
    top: '115%',
    left: '14%',
  },
  rightHeartIcon: {
    bottom: '75%',
    right: '48%',
  },
  matchedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 70,
    marginBottom: 15,
    paddingHorizontal: 50,
    textAlign: 'center',
  },
  chatButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 35,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 16,
    color: '#666',
  },
});