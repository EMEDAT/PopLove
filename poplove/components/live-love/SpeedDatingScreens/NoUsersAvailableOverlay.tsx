// components/live-love/SpeedDatingScreens/NoUsersAvailableOverlay.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface NoUsersAvailableOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  onExitSpeedDating: () => void; // New prop to exit speed dating mode
  autoDismissTime?: number; // Time in ms
}

export default function NoUsersAvailableOverlay({
  visible,
  onDismiss,
  onExitSpeedDating,
  autoDismissTime = 4000 // Default 4 seconds
}: NoUsersAvailableOverlayProps) {
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    if (visible) {
      // Start countdown
      setCountdown(4);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Set up auto-dismiss
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissTime);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [visible]); // REMOVE onDismiss and autoDismissTime

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Close button in top right corner */}
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              onDismiss(); // First dismiss the overlay
              onExitSpeedDating(); // Then exit speed dating mode
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={28} color="#FF6B6B" />
          </TouchableOpacity>
          
          <View style={styles.iconContainer}>
            <Ionicons name="people-outline" size={60} color="#FF6B6B" />
          </View>
          <Text style={styles.title}>No Users Available</Text>
          <Text style={styles.description}>
            There are currently no users online searching for Speed Dating matches.
          </Text>
          <Text style={styles.countdownText}>
            Returning in {countdown}...
          </Text>
          
          {/* Exit button at the bottom */}
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={() => {
              onDismiss(); // First dismiss the overlay
              onExitSpeedDating(); // Then exit speed dating mode
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.exitButtonText}>Exit Speed Dating</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.8,
    backgroundColor: '#F2F1ED',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    alignSelf: 'center', // This ensures the card itself is centered
    justifyContent: 'center', // This centers the content vertically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    top: 140,
    left: 35,
    position: 'absolute',
    zIndex: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 101,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFE4E4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  countdownText: {
    fontSize: 18,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 24, // Added space before the exit button
  },
  exitButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  exitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  }
});