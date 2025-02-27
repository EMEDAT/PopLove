// app/(onboarding)/subscription.tsx

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { SubscriptionCard } from '../../components/onboarding/SubscriptionCard';
import { doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { firestore } from '../../lib/firebase';

// Define subscription plans
const subscriptionPlans = [
  {
    id: 'basic',
    title: 'Basic',
    price: 'Free',
    features: [
      'Limited matches per day',
      'Basic messaging',
      'Standard profile customization'
    ],
    isPremium: false
  },
  {
    id: 'premium',
    title: 'Premium',
    price: '$9.99/month',
    features: [
      'Unlimited matches',
      'Advanced messaging',
      'Premium profile customization',
      'See who liked you'
    ],
    isPremium: true
  },
  {
    id: 'vip',
    title: 'VIP',
    price: '$19.99/month',
    features: [
      'All Premium features',
      'Priority in matching algorithm',
      'Exclusive VIP badge',
      'Ad-free experience',
      'Premium customer support'
    ],
    isPremium: true
  }
];

export default function SubscriptionScreen() {
  const { user, setHasCompletedOnboarding } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (user) {
        // Update user's subscription tier in Firestore
        const userRef = firestore().collection('users').doc(user.uid);
        await userRef.set({
          subscriptionTier: selectedPlan,
          hasCompletedOnboarding: true,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Update local state to indicate onboarding is complete
        await setHasCompletedOnboarding(true);
        
        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        throw new Error('User not authenticated');
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <Text style={styles.subtitle}>
          Select the plan that fits your dating needs
        </Text>
        
        {subscriptionPlans.map(plan => (
          <SubscriptionCard
            key={plan.id}
            title={plan.title}
            price={plan.price}
            features={plan.features}
            isSelected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
            isPremium={plan.isPremium}
          />
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={styles.continueButton}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FFA07A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                Continue
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service and Privacy Policy. 
          You can cancel your subscription at any time.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 48 : 10,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 30, // To center the title with the back button on the left
  },
  scrollView: {
    flex: 1,
    padding: 24,
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 16,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  }
});