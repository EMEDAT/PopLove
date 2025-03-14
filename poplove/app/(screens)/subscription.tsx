// app/(screens)/subscription.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuthContext } from '../../components/auth/AuthProvider';

export default function SubscriptionScreen() {
  const { user } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Load current subscription on mount
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) {
        setLoading(false);
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
        console.error('Error loading subscription:', error);
        Alert.alert('Error', 'Failed to load your subscription details');
      } finally {
        setLoading(false);
      }
    };
    
    loadSubscription();
  }, [user]);
  
  // Plan features
  const plans = [
    {
      id: 'basic',
      title: 'Basic',
      price: 'Free',
      features: [
        { text: 'Unlimited Pop or Find Love: 9 likes per day', included: true },
        { text: 'Advance match filters: Basic filters', included: true },
        { text: 'See who pursued you: Limited to 3', included: true },
        { text: 'Undo a pop (rewind feature)', included: false },
        { text: 'Match meter', included: false },
        { text: 'Boost Profile Visibility', included: false },
        { text: 'Priority in live matchmaking', included: false },
        { text: 'Exclusive matchmaking events', included: false },
        { text: 'Virtual gifts / Roses: Buy Only', included: true }
      ]
    },
    {
      id: 'premium',
      title: 'Premium ✨',
      price: '$155/yr',
      monthlyPrice: '$12.99/mo',
      features: [
        { text: 'Unlimited Pop or Find Love', included: true },
        { text: 'Advance match filters: Height, religion, lifestyle, race', included: true },
        { text: 'See who pursued you: Unlimited per term', included: true },
        { text: 'Undo a pop (rewind feature): 5/ day', included: true },
        { text: 'Match meter: YES', included: true },
        { text: 'Boost Profile Visibility: 1 free boost / week', included: true },
        { text: 'Priority in live matchmaking: Queue skip in speed dating', included: true },
        { text: 'Exclusive matchmaking events', included: false },
        { text: 'Virtual gifts / Roses: Earn daily 4', included: true }
      ]
    },
    {
      id: 'vip',
      title: 'VIP 👑',
      price: '$300/yr',
      monthlyPrice: '$25.99/mo',
      features: [
        { text: 'Unlimited Pop or Find Love', included: true },
        { text: 'Advance match filters: All Filters + AI Suggestions', included: true },
        { text: 'See who pursued you: Unlimited', included: true },
        { text: 'Undo a pop (rewind feature): Unlimited', included: true },
        { text: 'Match meter: YES', included: true },
        { text: 'Boost Profile Visibility: 3 free boost / week', included: true },
        { text: 'Priority in live matchmaking: Front of the line in live event', included: true },
        { text: 'Exclusive matchmaking events: VIP Only', included: true },
        { text: 'Virtual gifts / Roses: Earn daily 6', included: true }
      ]
    }
  ];

  // Save selected plan
  const handleSubscribe = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Mock payment processing - in a real app, you would integrate with a payment provider here
      // For now, we'll just update the user's subscription in Firestore
      
      await updateDoc(doc(firestore, 'users', user.uid), {
        subscriptionPlan: selectedPlan,
        subscriptionUpdatedAt: serverTimestamp()
      });
      
      Alert.alert(
        'Subscription Updated', 
        `You are now subscribed to the ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan!`,
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error) {
      console.error('Error updating subscription:', error);
      Alert.alert('Error', 'Failed to update your subscription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <Text style={styles.subtitle}>Choose a plan that fits your dating style</Text>
      
      <View style={styles.tabsContainer}>
        {plans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.tabButton,
              selectedPlan === plan.id && styles.activeTab
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            <Text 
              style={[
                styles.tabText,
                selectedPlan === plan.id && styles.activeTabText
              ]}
            >
              {plan.title.split(' ')[0]}
              {plan.id === 'premium' && ' ✨'}
              {plan.id === 'vip' && ' 👑'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.planDetailsContainer}>
          {plans.map(plan => {
            if (plan.id !== selectedPlan) return null;
            
            return (
              <View key={plan.id}>
                <View style={styles.planHeader}>
                  <LinearGradient
                    colors={plan.id === 'basic' ? ['#996633', '#F0B433', '#33CCFF'] : 
                            plan.id === 'premium' ? ['#EC5F61', '#F0B433'] : 
                            ['#996633', '#F0B433', '#33CCFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.planGradient}
                  >
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    {plan.monthlyPrice && (
                      <Text style={styles.monthlyPrice}>{plan.monthlyPrice}</Text>
                    )}
                  </LinearGradient>
                </View>
                
                <View style={styles.featuresList}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons 
                        name={feature.included ? "checkmark-circle" : "close-circle"} 
                        size={20} 
                        color={feature.included ? "#FF6B6B" : "#ccc"} 
                        style={styles.featureIcon}
                      />
                      <Text style={styles.featureText}>{feature.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          disabled={saving}
        >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {selectedPlan === 'basic' ? 'Confirm Free Plan' : 'Subscribe Now'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {selectedPlan !== 'basic' && (
          <Text style={styles.legalText}>
            Subscription will be charged to your payment method. Plans automatically renew until canceled.
          </Text>
        )}
      </View>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  planDetailsContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  planHeader: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  planGradient: {
    padding: 20,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: 'white',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '400',
    color: 'white',
    marginTop: 8,
  },
  monthlyPrice: {
    fontSize: 16,
    color: 'white',
    marginTop: 4,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
  },
  footerContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  subscribeButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 10,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  legalText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});