// // components/onboarding/SubscriptionPlan.tsx
// import React from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   TouchableOpacity,
//   ScrollView
// } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Ionicons } from '@expo/vector-icons';

// interface SubscriptionPlanProps {
//   selectedPlan: string;
//   onSelectPlan: (planId: string) => void;
//   onSkip: () => void;
//   onContinue: () => void;
// }

// export default function SubscriptionPlan({ 
//   selectedPlan, 
//   onSelectPlan, 
//   onSkip, 
//   onContinue 
// }: SubscriptionPlanProps) {
  
//   // Plan features
//   const plans = [
//     {
//       id: 'basic',
//       title: 'Basic',
//       price: 'Free',
//       features: [
//         { text: 'Unlimited Pop or Find Love: 9 likes per day', included: true },
//         { text: 'Advance match filters: Basic filters', included: true },
//         { text: 'See who pursued you: Limited to 3', included: true },
//         { text: 'Undo a pop (rewind feature)', included: false },
//         { text: 'Match meter', included: false },
//         { text: 'Boost Profile Visibility', included: false },
//         { text: 'Priority in live matchmaking', included: false },
//         { text: 'Exclusive matchmaking events', included: false },
//         { text: 'Virtual gifts / Roses: Buy Only', included: true }
//       ]
//     },
//     {
//       id: 'premium',
//       title: 'Premium ✨',
//       monthlyPrice: '$12.99/month',
//       weeklyPrice: '$5.99/week',
//       features: [
//         { text: 'Unlimited Pop or Find Love', included: true },
//         { text: 'Advance match filters: Height, religion, lifestyle, race', included: true },
//         { text: 'See who pursued you: Unlimited per term', included: true },
//         { text: 'Undo a pop (rewind feature): 5/ day', included: true },
//         { text: 'Match meter: YES', included: true },
//         { text: 'Boost Profile Visibility: 1 free boost / week', included: true },
//         { text: 'Priority in live matchmaking: Queue skip in speed dating', included: true },
//         { text: 'Exclusive matchmaking events', included: false },
//         { text: 'Virtual gifts / Roses: Earn daily 4', included: true }
//       ]
//     },
//     {
//       id: 'vip',
//       title: 'VIP 👑',
//       monthlyPrice: '$25.99/month',
//       weeklyPrice: '$14.99/week',
//       features: [
//         { text: 'Unlimited Pop or Find Love', included: true },
//         { text: 'Advance match filters: All Filters + AI Suggestions', included: true },
//         { text: 'See who pursued you: Unlimited', included: true },
//         { text: 'Undo a pop (rewind feature): Unlimited', included: true },
//         { text: 'Match meter: YES', included: true },
//         { text: 'Boost Profile Visibility: 3 free boost / week', included: true },
//         { text: 'Priority in live matchmaking: Front of the line in live event', included: true },
//         { text: 'Exclusive matchmaking events: VIP Only', included: true },
//         { text: 'Virtual gifts / Roses: Earn daily 6', included: true }
//       ]
//     }
//   ];

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={styles.headerTitle}>Select Plan</Text>
//         <TouchableOpacity onPress={onSkip}>
//           <Text style={styles.skipText}>Skip</Text>
//         </TouchableOpacity>
//       </View>
      
//       <Text style={styles.subtitle}>Choose a plan that fits your dating style.</Text>
      
//       <View style={styles.tabsContainer}>
//         {plans.map(plan => (
//           <TouchableOpacity
//             key={plan.id}
//             style={[
//               styles.tabButton,
//               selectedPlan === plan.id && styles.activeTab
//             ]}
//             onPress={() => onSelectPlan(plan.id)}
//           >
//             <Text 
//               style={[
//                 styles.tabText,
//                 selectedPlan === plan.id && styles.activeTabText
//               ]}
//             >
//               {plan.title.split(' ')[0]}
//               {plan.id === 'premium' && ' ✨'}
//               {plan.id === 'vip' && ' 👑'}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>
      
//       <View style={styles.planDetailsContainer}>
//         {plans.map(plan => {
//           if (plan.id !== selectedPlan) return null;
          
//           return (
//             <View key={plan.id}>
//               <View style={styles.planHeader}>
//                 <LinearGradient
//                   colors={['#996633',  '#F0B433',  '#33CCFF']}
//                   start={{ x: 0, y: 0 }}
//                   end={{ x: 1, y: 0 }}
//                   style={styles.planGradient}
//                 >
//                   <Text style={styles.planTitle}>{plan.title.split(' ')[0]}</Text>
//                   <Text style={styles.monthlyPrice}>{plan.monthlyPrice}</Text>
//                   {plan.monthlyPrice && (
//                     <Text style={styles.weeklyPrice}>{plan.weeklyPrice}</Text>
//                   )}
//                 </LinearGradient>
//               </View>
              
//               <View style={styles.featuresList}>
//                 {plan.features.map((feature, index) => (
//                   <View key={index} style={styles.featureItem}>
//                     <Ionicons 
//                       name={feature.included ? "checkmark-circle" : "close-circle"} 
//                       size={20} 
//                       color={feature.included ? "#FF6B6B" : "#ccc"} 
//                       style={styles.featureIcon}
//                     />
//                     <Text style={styles.featureText}>{feature.text}</Text>
//                   </View>
//                 ))}
//               </View>
//             </View>
//           );
//         })}
//       </View>
      
//       <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
//         <LinearGradient
//           colors={['#EC5F61', '#F0B433']}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//           style={styles.continueGradient}
//         >
//           <Text style={styles.continueText}>Select Plan</Text>
//         </LinearGradient>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: 'white',
//     paddingBottom: 20,
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 50,
//     marginBottom: 10,
//   },
//   headerTitle: {
//     fontSize: 24,
//     fontWeight: 'bold',
//   },
//   skipText: {
//     color: '#FF6B6B',
//     fontSize: 16,
//     fontWeight: '500',
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#666',
//     paddingHorizontal: 20,
//   },
//   tabsContainer: {
//     flexDirection: 'row',
//     marginTop: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E5E5',
//   },
//   tabButton: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: '#FF6B6B',
//   },
//   tabText: {
//     fontSize: 16,
//     color: '#666',
//   },
//   activeTabText: {
//     color: '#FF6B6B',
//     fontWeight: '600',
//   },
//   planDetailsContainer: {
//     flex: 1,
//     paddingHorizontal: 20,
//     paddingTop: 24,
//   },
//   planHeader: {
//     borderRadius: 12,
//     overflow: 'hidden',
//     marginBottom: 24,
//   },
//   planGradient: {
//     padding: 20,
//   },
//   planTitle: {
//     fontSize: 24,
//     fontWeight: '500',
//     color: 'white',
//   },
//   monthlyPrice: {
//     fontSize: 24,
//     fontWeight: '400',
//     color: 'white',
//     marginTop: 8,
//   },
//   weeklyPrice: {
//     fontSize: 15,
//     fontWeight: 'bold',
//     color: 'white',
//     marginTop: 1,
//   },
//   featuresList: {
//     marginBottom: 20,
//   },
//   featureItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 8,
//   },
//   featureIcon: {
//     marginRight: 10,
//   },
//   featureText: {
//     flex: 1,
//     fontSize: 15,
//   },
//   continueButton: {
//     marginHorizontal: 20,
//     borderRadius: 28,
//     overflow: 'hidden',
//   },
//   continueGradient: {
//     paddingVertical: 16,
//     alignItems: 'center',
//   },
//   continueText: {
//     color: 'white',
//     fontSize: 10,
//     fontWeight: 'bold',
//   }
// });

// components/onboarding/WaitlistPage.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface WaitlistPageProps {
  onSkip: () => void;
}

export default function WaitlistPage({ onSkip }: WaitlistPageProps) {
  const [showModal, setShowModal] = useState(false);
  // Animation values
  const spinValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(0);
  
  // Create animations
  useEffect(() => {
    // Continuous spinning animation
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    
    // Pulsing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    
    // Start animations
    spin.start();
    pulse.start();
    
    return () => {
      spin.stop();
      pulse.stop();
    };
  }, []);
  
  // Interpolate rotation for spin animation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Interpolate scale for pulse animation
  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1]
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verification</Text>
        <TouchableOpacity onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.animationContainer}>
          <Animated.View 
            style={[
              styles.loadingCircleOuter, 
              { transform: [{ rotate: spin }, { scale }] }
            ]}
          >
            <LinearGradient
              colors={['#EC5F61', '#F0B433', '#33CCFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCircle}
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.loadingCircleMid, 
              { transform: [{ rotate: spin }, { scale }] }
            ]}
          >
            <LinearGradient
              colors={['#F0B433', '#33CCFF', '#EC5F61']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientCircle}
            />
          </Animated.View>
          
          <View style={styles.innerCircle}>
            <Ionicons name="heart" size={40} color="#FF6B6B" />
          </View>
        </View>
        
        <Text style={styles.verificationTitle}>Your Profile is Being Verified</Text>
        
        <View style={styles.verificationItems}>
          <View style={styles.verificationItem}>
            <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" style={styles.verificationIcon} />
            <Text style={styles.verificationText}>Analyzing your preferences and compatibility traits</Text>
          </View>
          
          <View style={styles.verificationItem}>
            <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" style={styles.verificationIcon} />
            <Text style={styles.verificationText}>Curating a personalized dating experience</Text>
          </View>
          
          <View style={styles.verificationItem}>
            <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" style={styles.verificationIcon} />
            <Text style={styles.verificationText}>Ensuring authentic profiles for quality connections</Text>
          </View>
          
          <View style={styles.verificationItem}>
            <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" style={styles.verificationIcon} />
            <Text style={styles.verificationText}>Preparing your unique matching algorithm</Text>
          </View>
        </View>
        
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            We're carefully reviewing your profile to create the best possible experience and ensure our community 
            maintains high-quality connections.
          </Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.notifyButton} onPress={() => setShowModal(true)}>
        <LinearGradient
          colors={['#EC5F61', '#F0B433']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.notifyGradient}
        >
          <Text style={styles.notifyText}>Notify Me When Ready</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={50} color="#FF6B6B" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Notification Set</Text>
            <Text style={styles.modalText}>We'll notify you as soon as your profile is verified and ready!</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setShowModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  skipText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  animationContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    position: 'absolute',
  },
  loadingCircleMid: {
    width: 130,
    height: 130,
    borderRadius: 65,
    position: 'absolute',
    transform: [{ rotate: '-30deg' }],
  },
  gradientCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
    opacity: 0.8,
  },
  innerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  verificationItems: {
    width: '100%',
    marginBottom: 30,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  verificationIcon: {
    marginRight: 12,
  },
  verificationText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  messageContainer: {
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 30,
    marginTop: -40,
  },
  messageText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 22,
    textAlign: 'center',
  },
  notifyButton: {
    marginHorizontal: 20,
    borderRadius: 28,
    overflow: 'hidden',
  },
  notifyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  notifyText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  }
});