// components/live-love/LineUpScreens/ConfirmationScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ConfirmationScreenProps {
  onBack: () => void;
}

export default function ConfirmationScreen({ onBack }: ConfirmationScreenProps) {
  const { selectedMatches, confirmMatch, loading } = useLineUp();
  const [countdown, setCountdown] = useState(5);
  const [confirmed, setConfirmed] = useState(false);
  const [processingMatch, setProcessingMatch] = useState(false);
  
  // Get the first match from the list
  const match = selectedMatches.length > 0 ? selectedMatches[0] : null;
  
  // Start countdown timer
  useEffect(() => {
    if (match && countdown > 0 && !confirmed) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !confirmed && !processingMatch) {
      // Auto-confirm when timer reaches zero
      handleConfirm();
    }
  }, [countdown, confirmed, processingMatch, match]);
  
  // Handle confirm action
  const handleConfirm = async () => {
    if (!match || confirmed || processingMatch) return;
    
    try {
      setProcessingMatch(true);
      setConfirmed(true);
      
      // Confirm the match and get chat ID
      const chatId = await confirmMatch(match);
      
      if (chatId) {
        // Short delay to show confirmation state
        setTimeout(() => {
          // Navigate to chat screen
          router.push({
            pathname: '/chat/[id]',
            params: { id: chatId }
          });
        }, 1500);
      } else {
        // Handle error case
        setTimeout(() => {
          router.replace('/(tabs)/matches');
        }, 1500);
      }
    } catch (error) {
      console.error('Error confirming match:', error);
      
      // Navigate to matches tab on error
      setTimeout(() => {
        router.replace('/(tabs)/matches');
      }, 1500);
    }
  };

  // Show loading if no match
  if (!match) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading match details...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Header with match info */}
        <View style={styles.header}>
          <Text style={styles.matchText}>You've been matched!</Text>
        </View>
        
        {/* Match cards */}
        <View style={styles.cardsContainer}>
          <Image 
            source={{ uri: match.photoURL }} 
            style={[styles.matchCard, styles.frontCard]}
          />
        </View>
        
        {/* Progress bar with countdown */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={['#EC5F61', '#F0B433']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${(countdown / 5) * 100}%` }]}
            />
          </View>
          <Text style={styles.countdownText}>
            {confirmed 
              ? 'Match confirmed!' 
              : `Next round in ${countdown}...`}
          </Text>
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.confirmButton, confirmed && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={confirmed || processingMatch}
          >
            <LinearGradient
              colors={['#EC5F61', '#F0B433']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {loading || processingMatch ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {confirmed ? 'Match Confirmed!' : 'Confirm Match'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cancelButton, confirmed && styles.disabledButton]}
            onPress={onBack}
            disabled={confirmed || processingMatch}
          >
            <Text style={styles.cancelButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  cardContainer: {
    width: width * 0.9,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  matchText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  cardsContainer: {
    height: height * 0.4,
    width: '100%',
    marginBottom: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchCard: {
    width: width * 0.6,
    height: height * 0.35,
    borderRadius: 15,
    position: 'absolute',
  },
  frontCard: {
    transform: [{ rotate: '-3deg' }],
    zIndex: 2,
  },
  backCard: {
    transform: [{ rotate: '3deg' }],
    zIndex: 1,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  countdownText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    width: '100%',
  },
  confirmButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    marginBottom: 15,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
});