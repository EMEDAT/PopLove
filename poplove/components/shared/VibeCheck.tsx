// components/shared/VibeCheck.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../auth/AuthProvider';
import ProfilePopup from '../home/ProfilePopup';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface VibeCheckProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  requiredTier?: 'basic' | 'premium' | 'vip';
  vibePercentage?: number;
}

export default function VibeCheck({ 
  visible, 
  onClose, 
  profile, 
  requiredTier = 'basic',
  vibePercentage: initialVibePercentage
}: VibeCheckProps) {
  const { user } = useAuthContext();
  const [vibePercentage, setVibePercentage] = useState(initialVibePercentage || 90);
  const [profilePopupVisible, setProfilePopupVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  
  // Get subscription data from your app
  // In a real app, you would use a context or service to get the subscription status
  // For now, we'll force it to false to simulate the user not having premium
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    // Generate a random vibe percentage between 75-99 for demo if not provided
    if (visible && profile && !initialVibePercentage) {
      const randomVibe = Math.floor(Math.random() * 25) + 75;
      setVibePercentage(randomVibe);
    } else if (initialVibePercentage) {
      setVibePercentage(initialVibePercentage);
    }
    
    // IMPORTANT: Setting to false to ensure subscription modal always shows
    // When integrating with your actual subscription system, replace this
    setHasPremium(false);
    
    // If the modal becomes visible, immediately check if subscription modal should show
    if (visible && requiredTier !== 'basic') {
      // Small delay to ensure modal is fully visible first
      setTimeout(() => {
        setSubscriptionModalVisible(true);
      }, 500);
    }
  }, [visible, profile, initialVibePercentage, requiredTier]);

  if (!profile) return null;

  const handleChatNow = () => {
    // ALWAYS check subscription status
    if (requiredTier !== 'basic') {
      // Always show subscription modal for premium features
      setSubscriptionModalVisible(true);
      return;
    }

    // Only for basic tier features:
    // Close the vibe check modal first
    onClose();
    // Show the profile popup for messaging
    setProfilePopupVisible(true);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSubscriptionModalVisible(false);
          onClose();
        }}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            {/* Cards Container */}
            <View style={styles.cardsContainer}>
              {/* User Card */}
              <Image 
                source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
                style={[styles.card, styles.yourCard]}
              />
              
              {/* Match Card */}
              <Image 
                source={{ uri: profile.photoURL }}
                style={[styles.card, styles.matchCard]}
              />

              {/* Heart Icons */}
              <Image
                source={require('../../assets/images/main/VibeCheckLove.png')}
                style={[styles.heartIcon, styles.leftHeartIcon]}
              />
              
              <Image
                source={require('../../assets/images/main/VibeCheckLove.png')}
                style={[styles.heartIcon, styles.rightHeartIcon]}
              />
            </View>

            {/* Vibe Percentage */}
            <View style={styles.vibeContainer}>
              <Text style={styles.vibeText}>Vibe Check</Text>
              <View style={styles.percentageCircleContainer}>
                <View style={styles.percentageProgressBackground}>
                  <View style={[styles.percentageProgress, { width: `${vibePercentage}%` }]} />
                </View>
                <View style={styles.percentageCircle}>
                  <Text style={styles.percentageText}>{vibePercentage}%</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity 
                style={styles.chatButton}
                onPress={handleChatNow}
              >
                  <Text style={styles.chatButtonText}>Chat Now</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.keepLookingButton}
                onPress={onClose}
              >
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradient}
                >
                  <Text style={styles.chatButtonText2}>Keep Looking</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Popup for Chat */}
      <ProfilePopup
        visible={profilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        profile={profile}
        onSendLike={() => {
          setProfilePopupVisible(false);
        }}
        onSendFlower={() => {
          setProfilePopupVisible(false);
        }}
      />

      {/* Subscription Modal */}
      <Modal
        transparent={true} 
        animationType="slide"
        visible={subscriptionModalVisible}
        onRequestClose={() => setSubscriptionModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSubscriptionModalVisible(false)}>
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
                  The "Find Love" feature is only available for {requiredTier.toUpperCase()} 
                  subscribers and above.
                </Text>
                
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => {
                    setSubscriptionModalVisible(false);
                    onClose(); // Close the vibe check modal too
                    
                    // Navigate to subscription page
                    router.push({
                      pathname: '/subscription',
                      params: { 
                        highlight: requiredTier,
                        feature: 'Find Love'
                      }
                    });
                  }}
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
                  onPress={() => setSubscriptionModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardsContainer: {
    width: '100%',
    height: height * 0.5,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  card: {
    width: width * 0.45,
    height: height * 0.33,
    borderRadius: 15,
    position: 'absolute',
  },
  yourCard: {
    left: '10%',
    top: '45%',
    transform: [{ rotate: '-10deg' }],
    zIndex: 2,
  },
  matchCard: {
    right: '10%',
    bottom: '35%',
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
    top: '105%',
    left: '14%',
  },
  rightHeartIcon: {
    bottom: '95%',
    right: '42%',
  },
  vibeContainer: {
    alignItems: 'center',
    bottom: 25,
  },
  vibeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  percentageCircleContainer: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  percentageProgressBackground: {
    width: '80%',
    height: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
  },
  percentageProgress: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
  percentageCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -3,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FF6B6B',
  },
  actionContainer: {
    width: '100%',
    gap: 15,
    marginBottom: 10,
  },
  chatButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  keepLookingButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#0C111D',
    fontSize: 15,
    fontWeight: '600',
  },
  chatButtonText2: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Subscription modal styles
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