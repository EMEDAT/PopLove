// components/shared/SubscriptionGate.tsx
import React, { ReactNode, useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator 
} from 'react-native';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

const { width, height } = Dimensions.get('window');

interface SubscriptionGateProps {
  children: ReactNode;
  requiredTier: 'basic' | 'premium' | 'vip';
  featureName: string;
  onClose: () => void;  // Added onClose prop
}

export function SubscriptionGate({ 
  children, 
  requiredTier, 
  featureName,
  onClose  // Added to function parameters
}: SubscriptionGateProps) {
  const { user } = useAuthContext();
  const [userTier, setUserTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to determine if user has sufficient tier
  const hasSufficientTier = (currentTier: string) => {
    const tierPriority = {
      'basic': 1,
      'premium': 2,
      'vip': 3
    };

    return tierPriority[currentTier as keyof typeof tierPriority] >= 
           tierPriority[requiredTier as keyof typeof tierPriority];
  };

  // Fetch user's subscription tier from Firestore
  useEffect(() => {
    const fetchUserTier = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserTier(userData.subscriptionPlan || 'basic');
        } else {
          setUserTier('basic');
        }
      } catch (error) {
        console.error('Error fetching user tier:', error);
        setUserTier('basic');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTier();
  }, [user]);

  // Show loading state while fetching tier
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // If user has sufficient tier, render children
  if (userTier && hasSufficientTier(userTier)) {
    return <>{children}</>;
  }

  // Upgrade Modal Component
  const UpgradeModal = () => {
    const handleUpgrade = () => {
      router.push('/(onboarding)/subscription');
    };

    return (
      <Modal 
        transparent={true} 
        animationType="slide"
        visible={true}
      >
        <View style={styles.modalOverlay}>
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
            >
              <LinearGradient
                colors={['#EC5F61', '#F0B433']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}  // Use the passed onClose method
            >
              <Text style={styles.cancelButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render upgrade modal if insufficient tier
  return <UpgradeModal />;
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