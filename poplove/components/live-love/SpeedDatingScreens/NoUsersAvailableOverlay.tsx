// components/live-love/SpeedDatingScreens/NoUsersAvailableOverlay.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface NoUsersAvailableOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  autoDismissTime?: number; // Time in ms
}

export default function NoUsersAvailableOverlay({ 
  visible, 
  onDismiss,
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
  }, [visible, onDismiss, autoDismissTime]);
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.container}>
        <View style={styles.card}>
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
    backgroundColor: 'white',
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
  }
});