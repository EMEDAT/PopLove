// components/live-love/SpeedDating/CongratulationsScreen.tsx
import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Animated, 
  Easing,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Match } from '../SpeedDatingMode';
import { useAuthContext } from '../../../components/auth/AuthProvider';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { router } from 'expo-router';

interface CongratulationsScreenProps {
  match: Match | null;
  onGoToChat: () => void;
  onSkip: () => void;
}

export default function CongratulationsScreen({ 
  match,
  onGoToChat,
  onSkip
}: CongratulationsScreenProps) {
  const { user } = useAuthContext();
  
  // Animation values
  const scaleIn = new Animated.Value(0.8);
  const moveUp = new Animated.Value(50);
  
  // Start animations when component mounts
  useEffect(() => {
    // Animations with no opacity changes
    Animated.parallel([
      Animated.timing(scaleIn, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.elastic(1.2),
      }),
      Animated.timing(moveUp, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, []);
  
  // If match is null, don't render anything
  if (!match) {
    return null;
  }
  
  // Extract first name with null safety
  const firstName = match.displayName 
    ? match.displayName.split(' ')[0] 
    : 'Friend';
  
  // Enhanced go to chat handler that checks for existing chats
  const handleGoToChat = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to chat');
      return;
    }
    
    try {
      // First check if a chat already exists with this user
      const matchesRef = collection(firestore, 'matches');
      
      // This is the problematic query - we need to modify it
      const q = query(
        matchesRef, 
        where('users', 'array-contains', user.uid)
      );
      
      const matchesSnapshot = await getDocs(q);
      let existingMatchId = null as string | null;
      
      // Check each document to see if the match.id is in the users array
      for (const doc of matchesSnapshot.docs) {
        const matchData = doc.data();
        if (matchData.users && matchData.users.includes(match.id)) {
          existingMatchId = doc.id;
          break;
        }
      }
      
      if (existingMatchId) {
        console.log(`Found existing chat: ${existingMatchId}`);
        // Navigate to the existing chat
        router.push({
          pathname: '/chat/[id]',
          params: { id: existingMatchId }
        });
      } else {
        // If no existing chat, create a new one
        console.log('Creating new chat room');
        
        // Create a new match document
        const newMatchRef = await addDoc(collection(firestore, 'matches'), {
          users: [user.uid, match.id],
          userProfiles: {
            [user.uid]: {
              displayName: user.displayName || 'You',
              photoURL: user.photoURL || ''
            },
            [match.id]: {
              displayName: match.displayName,
              photoURL: match.photoURL
            }
          },
          createdAt: serverTimestamp(),
          lastMessageTime: serverTimestamp()
        });
        
        // Add welcome message
        await addDoc(collection(firestore, 'matches', newMatchRef.id, 'messages'), {
          text: "You're now connected! Say hello to start the conversation.",
          senderId: "system",
          createdAt: serverTimestamp()
        });
        
        // Navigate to the new chat
        router.push({
          pathname: '/chat/[id]',
          params: { id: newMatchRef.id }
        });
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
      
      // Fallback to original handler
      onGoToChat();
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Confetti image at the top */}
      <Animated.Image 
        source={require('../../../assets/images/main/confetti.png')} 
        style={[
          styles.confettiImage,
          {
            transform: [{ scale: scaleIn }]
          }
        ]}
        resizeMode="contain"
      />
      
      {/* Success message */}
      <Animated.Text 
        style={[
          styles.congratsTitle,
          {
            transform: [{ translateY: moveUp }]
          }
        ]}
      >
        Congratulation you are now friends with {firstName}
      </Animated.Text>
      
      {/* Profile images */}
      <Animated.View 
        style={[
          styles.profilesContainer,
          {
            transform: [{ translateY: moveUp }]
          }
        ]}
      >
        {/* Current user's profile image */}
        <Image 
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/100' }} 
          style={styles.profileImage}
        />
        
        {/* Match profile image */}
        <Image 
          source={{ uri: match.photoURL }} 
          style={styles.profileImage}
        />
        
        {/* Heart icon - position on top */}
        <Animated.Image 
          source={require('../../../assets/images/main/heart-icon.png')}
          style={styles.heartIcon}
          resizeMode="contain"
        />
      </Animated.View>
      
      {/* Action buttons */}
      <Animated.View 
        style={[
          styles.buttonsContainer,
          {
            transform: [{ translateY: moveUp }]
          }
        ]}
      >
        {/* Go to chat button */}
        <TouchableOpacity 
          style={styles.chatButton}
          onPress={handleGoToChat}
        >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.chatButtonText}>Go to Friends Chat</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Skip button */}
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -20,
    marginRight: -20,
  },
  confettiImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333333',
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative', // Added to support absolute positioning
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    zIndex: 1,
    marginHorizontal: -10, // Increased space between images to make room for heart
  },
  heartIcon: {
    width: 50,        // Increased width
    height: 50,       // Increased height
    position: 'absolute',
    left: '30%',
    marginLeft: -40,  // Adjusted to half of the new width
    top: '20%',
    marginTop: -40,   // Adjusted to half of the new height
    zIndex: 3,        // Higher z-index to appear on top
    resizeMode: 'contain', // Added to ensure the full image is visible
  },
  buttonsContainer: {
    width: '50%',
  },
  chatButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 15,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  skipButton: {
    padding: 5,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
});