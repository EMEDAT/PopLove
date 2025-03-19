// components/onboarding/SubscriptionPlan.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SubscriptionPlanProps {
  selectedPlan: string;
  onSelectPlan: (planId: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

export default function SubscriptionPlan({ 
  selectedPlan, 
  onSelectPlan, 
  onSkip, 
  onContinue 
}: SubscriptionPlanProps) {
  
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
      monthlyPrice: '$12.99/month',
      weeklyPrice: '$5.99/week',
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
      monthlyPrice: '$25.99/month',
      weeklyPrice: '$14.99/week',
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

  return (
    <View style={styles.container}>
      
      <View style={styles.tabsContainer}>
        {plans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.tabButton,
              selectedPlan === plan.id && styles.activeTab
            ]}
            onPress={() => onSelectPlan(plan.id)}
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
      
      <View style={styles.planDetailsContainer}>
        {plans.map(plan => {
          if (plan.id !== selectedPlan) return null;
          
          return (
            <View key={plan.id}>
              <View style={styles.planHeader}>
                <LinearGradient
                  colors={['#996633',  '#F0B433',  '#33CCFF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.planGradient}
                >
                  <Text style={styles.planTitle}>{plan.title.split(' ')[0]}</Text>
                  <Text style={styles.monthlyPrice}>{plan.monthlyPrice}</Text>
                  {plan.monthlyPrice && (
                    <Text style={styles.weeklyPrice}>{plan.weeklyPrice}</Text>
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
      
      <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
        <LinearGradient
          colors={['#EC5F61', '#F0B433']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueGradient}
        >
          <Text style={styles.continueText}>Select Plan</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
  planDetailsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
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
  monthlyPrice: {
    fontSize: 24,
    fontWeight: '400',
    color: 'white',
    marginTop: 8,
  },
  weeklyPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 1,
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
  continueButton: {
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  }
});