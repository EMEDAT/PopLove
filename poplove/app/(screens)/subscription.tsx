// app/(screens)/subscription.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams } from '../../utils/routerHelpers';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuthContext } from '../../components/auth/AuthProvider';
import SubscriptionPlan from './SubscriptionPlan';

export default function EnhancedSubscriptionScreen() {
  const { user } = useAuthContext();
  const params = useLocalSearchParams();
  const highlightTier = params.highlight as string || null;
  const featureName = params.feature ? decodeURIComponent(params.feature as string) : null;
  
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [currentPlan, setCurrentPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to load the user's current subscription
  const loadSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const plan = userData.subscriptionPlan || 'basic';
        setSelectedPlan(plan);
        setCurrentPlan(plan);
        console.log('Loaded subscription plan:', plan);
      } else {
        console.log('User document not found, defaulting to basic plan');
        setSelectedPlan('basic');
        setCurrentPlan('basic');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setError('Failed to load your current subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load subscription on initial mount
  useEffect(() => {
    loadSubscription();
    
    // If a specific tier was highlighted (from SubscriptionGate), select it
    if (highlightTier && ['basic', 'premium', 'vip'].includes(highlightTier)) {
      setSelectedPlan(highlightTier);
    }
  }, [loadSubscription, highlightTier]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSubscription();
      return () => {};
    }, [loadSubscription])
  );

  // Handle plan selection
  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  // Handle continue/upgrade
  const handleContinue = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to change your subscription.');
      return;
    }
    
    // If the selected plan is the same as current, no need to update
    if (selectedPlan === currentPlan) {
      router.back();
      return;
    }
    
    setUpdating(true);
    setError(null);
    
    try {
      // Update user's subscription in Firestore
      await updateDoc(doc(firestore, 'users', user.uid), {
        subscriptionPlan: selectedPlan,
        subscriptionUpdatedAt: serverTimestamp()
      });
      
      // Show success message
      Alert.alert(
        'Subscription Updated', 
        `Your subscription has been updated to ${selectedPlan.toUpperCase()}.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Force refresh of any cached data
            setCurrentPlan(selectedPlan);
            
            // Go back to previous screen
            router.back();
          }
        }]
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      setError('Failed to update your subscription. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle skip/cancel
  const handleSkip = () => {
    router.back();
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render subscription plan component
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={router.back} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {featureName && highlightTier && (
        <View style={styles.featureBanner}>
          <Ionicons name="lock-open" size={20} color="#FF6B6B" style={styles.bannerIcon} />
          <Text style={styles.bannerText}>
            Upgrade to <Text style={styles.tierText}>{highlightTier.toUpperCase()}</Text> to unlock{' '}
            <Text style={styles.featureText}>{featureName}</Text>
          </Text>
        </View>
      )}
      
      <View style={styles.content}>
        {updating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Updating your subscription...</Text>
          </View>
        ) : (
          <SubscriptionPlan
            selectedPlan={selectedPlan}
            onSelectPlan={handleSelectPlan}
            onSkip={handleSkip}
            onContinue={handleContinue}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  backButton: {
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FFE4E4',
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  featureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E4',
    padding: 12,
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 5,
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  tierText: {
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  featureText: {
    fontWeight: '500',
    fontStyle: 'italic',
  },
});