// components/shared/LineUpNotification.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { router } from 'expo-router';

// Add TypeScript interface for global window object
declare global {
  interface Window {
    lineupContextRef?: {
      current: any;
    };
  }
}

const { width } = Dimensions.get('window');

export default function LineUpNotification({ notification }) {
  const { user } = useAuthContext();
  const [showNotification, setShowNotification] = useState(true);
  
  // Animation values
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // Show notification with animation
  useEffect(() => {
    if (notification) {
      // Start animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ]).start();
      
      // Auto-hide after 10 seconds
      const timerId = setTimeout(() => {
        hideNotification();
      }, 10000);
      
      return () => clearTimeout(timerId);
    }
  }, [notification]);
  
  // Hide notification with animation
  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      setShowNotification(false);
    });
  };
  
  // Handle notification tap
  const handleNotificationPress = async () => {
    // Mark notification as read
    try {
      if (notification && notification.id) {
        await fetch(`/api/notifications/mark-read?id=${notification.id}`, {
          method: 'POST',
        });
      }
      
      // Hide the notification
      hideNotification();
      
      // Handle the lineup turn notification
      if (notification.type === 'lineup_turn') {
        const sessionId = notification.data?.sessionId;
        
        if (sessionId) {
          // Set the context values via the global reference
          if (typeof window !== 'undefined' && window.lineupContextRef?.current) {
            window.lineupContextRef.current.setIsCurrentUser(true);
            window.lineupContextRef.current.setSessionId(sessionId);
            
            // Start contestant timer after navigation completes
            setTimeout(() => {
              if (typeof window !== 'undefined' && window.lineupContextRef && window.lineupContextRef.current) {
                window.lineupContextRef.current.setIsCurrentUser(true);
                window.lineupContextRef.current.setSessionId(sessionId);
              }
            }, 1000);
          }
          
          // Navigate to private screen
          router.push({
            pathname: '/live-love',
            params: { 
              screen: 'private', 
              sessionId,
              direct: 'true'
            }
          });
        } else {
          router.push('/live-love');
        }
      }
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };
  
  if (!notification || !showNotification) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim
        }
      ]}
    >
      <TouchableOpacity
        style={styles.notificationBanner}
        onPress={handleNotificationPress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={24} color="white" />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Line-Up Update</Text>
          <Text style={styles.message}>{notification.message}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.closeButton}
          onPress={hideNotification}
        >
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  notificationBanner: {
    width: width - 40,
    backgroundColor: 'white',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    padding: 5,
  },
});