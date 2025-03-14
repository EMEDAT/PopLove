// components/shared/SubscriptionGate.tsx (Completely Fixed Version)
import React, { ReactNode, useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback 
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../contexts/SubscriptionContext';

const { width, height } = Dimensions.get('window');

interface SubscriptionGateProps {
  children: ReactNode;
  requiredTier: 'basic' | 'premium' | 'vip';
  featureName: string;
  onClose: () => void;
}

export function SubscriptionGate({ 
  children, 
  requiredTier, 
  featureName,
  onClose
}: SubscriptionGateProps) {
  const { user } = useAuthContext();
  const { currentTier, isLoading, hasSufficientTier } = useSubscription();
  const [isNavigating, setIsNavigating] = useState(false);
  const [modalVisible, setModalVisible] = useState(true);

  // Close modal with animation
  const closeModal = () => {
    setModalVisible(false);
    // Wait for animation to finish before calling onClose
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Navigate to subscription page
  const navigateToSubscription = () => {
    setIsNavigating(true);
    
    try {
      // Navigation should happen after modal is closed
      router.push({
        pathname: '/subscription',
        params: { 
          highlight: requiredTier,
          feature: encodeURIComponent(featureName)
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Handler for upgrade button
  const handleUpgrade = () => {
    // First close the modal
    closeModal();
    
    // Then navigate with a delay to ensure modal closing animation completes
    setTimeout(navigateToSubscription, 350);
  };

  // Show loading state while fetching tier
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // If user has sufficient tier, render children
  if (hasSufficientTier(requiredTier)) {
    return <>{children}</>;
  }

  // Upgrade Modal Component
  return (
    <Modal 
      transparent={true} 
      animationType="slide"
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContainer}>
              <Ionicons 
                name="lock-closed" 
                size={50} 
                color="#FF6B6B" 
                style={styles.lockIcon}
              />
              
              <Text style={styles.title}>Upgrade Required</Text>
              
              <Text style={styles.description}>
                The "{featureName}" feature is only available for {requiredTier.toUpperCase()} 
                subscribers and above.
              </Text>
              
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={handleUpgrade}
                disabled={isNavigating}
              >
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isNavigating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  lockIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  upgradeButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    marginBottom: 15,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 10,
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
  }
});