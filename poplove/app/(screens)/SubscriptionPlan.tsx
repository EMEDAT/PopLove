// app/(screens)/SubscriptionPlan.tsx - Fixed version
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

export default function SubscriptionPlanScreen() {
  const { user } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Get params from navigation (if any)
  const params = useLocalSearchParams();
  const highlightTier = params.highlight as string || null;
  const featureName = params.feature ? 
    decodeURIComponent(params.feature as string) : null;
  const returnToModal = params.returnToModal === 'true';
  const profileId = params.profileId as string || null;
  
  // Load current subscription on mount
  useEffect(() => {
    const loadCurrentPlan = async () => {
      if (!user) {
        setInitialLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.subscriptionPlan) {
            setSelectedPlan(userData.subscriptionPlan);
          }
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadCurrentPlan();
  }, [user]);
  
  // If component receives a highlight tier, select it
  useEffect(() => {
    if (highlightTier && !initialLoading) {
      setSelectedPlan(highlightTier);
    }
  }, [highlightTier, initialLoading]);

  // Handle proper back navigation
  const handleBack = () => {
    // Use router.back() instead of router.replace() to maintain navigation history
    // This preserves state in the previous screen
    router.back();
  };
  
  // Handle plan selection
  const selectPlan = async (plan: string) => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to select a plan');
      return;
    }
    
    setLoading(true);
    
    try {
      // Update user's subscription plan
      await updateDoc(doc(firestore, 'users', user.uid), {
        subscriptionPlan: plan,
        updatedAt: serverTimestamp()
      });
      
      Alert.alert(
        'Subscription Updated',
        `Your subscription has been updated to ${plan.toUpperCase()}!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // If we came from a modal, return with a flag to reopen it
              if (returnToModal && profileId) {
                // We need to preserve navigation state for the modal
                router.back();
              } else {
                router.back();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update your subscription');
    } finally {
      setLoading(false);
    }
  };
  
  // Subscription plan data
  const plans = [
    {
      id: 'basic',
      title: 'Basic',
      price: 'Free',
      features: [
        'Unlimited swipes per day',
        'Basic matching algorithm',
        'Limited profile visibility',
        'Standard support'
      ]
    },
    {
      id: 'premium',
      title: 'Premium',
      price: '$12.99/month',
      features: [
        'See who liked you',
        'Advanced filters',
        'Unlimited likes',
        'Priority profile boost',
        'No ads'
      ]
    },
    {
      id: 'vip',
      title: 'VIP',
      price: '$24.99/month',
      features: [
        'All Premium features',
        'Ultra profile boost',
        'VIP badge',
        'Read receipts',
        'Exclusive events',
        'Priority support'
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 24 }} /> {/* Placeholder for alignment */}
      </View>
      
      {featureName && (
        <View style={styles.featurePrompt}>
          <Ionicons name="lock-closed" size={24} color="#FF6B6B" />
          <Text style={styles.featurePromptText}>
            Upgrade to use the <Text style={styles.featureHighlight}>{featureName}</Text> feature
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.content}>
        {plans.map((plan) => (
          <View 
            key={plan.id} 
            style={[
              styles.planCard,
              selectedPlan === plan.id && styles.selectedPlanCard,
              highlightTier === plan.id && styles.highlightedPlanCard
            ]}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </View>
            
            <View style={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity
              style={[
                styles.selectButton,
                selectedPlan === plan.id && styles.currentPlanButton
              ]}
              onPress={() => selectPlan(plan.id)}
              disabled={loading || selectedPlan === plan.id}
            >
              {selectedPlan === plan.id ? (
                <Text style={styles.currentPlanText}>Current Plan</Text>
              ) : (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.selectButtonText}>Select Plan</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 0 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  featurePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  featurePromptText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  featureHighlight: {
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedPlanCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
  },
  highlightedPlanCard: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  planFeatures: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 10,
    color: '#333',
  },
  selectButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  currentPlanButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentPlanText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});