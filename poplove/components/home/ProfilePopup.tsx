// components/home/ProfilePopup.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageStatus } from '../chat/MessageStatus';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, doc, addDoc, updateDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { firestore } from '../../lib/firebase';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface ProfilePopupProps {
  visible: boolean;
  onClose: () => void;
  profile: {
    id: string;
    displayName: string;
    photoURL: string;
    bio?: string;
    age?: string;
    location?: string;
  } | null;
  onSendLike: () => void;
  onSendFlower: () => void;
}

export function ProfilePopup({ 
  visible, 
  onClose, 
  profile, 
  onSendLike, 
  onSendFlower
}: ProfilePopupProps) {
  const [message, setMessage] = useState('');
  const { user } = useAuthContext();
  const scaleValue = useSharedValue(1);
  const rotateValue = useSharedValue(0);

  // Create animated styles:
const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value },
        { rotate: `${rotateValue.value}deg` }
      ]
    };
  });
  
  // Add this function to start the beating animation:
  const animateEmoji = () => {
    // Heart beating animation
    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ), 
      3
    );
    
    // Flower slight rotation
    rotateValue.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 500 }),
        withTiming(-15, { duration: 500 }),
        withTiming(0, { duration: 250 })
      ),
      2
    );
  };

  if (!profile) return null;

  // Extract first name and age from display name (assuming format: "Name,Age")
  const nameParts = profile.displayName.split(',');
  const firstName = nameParts[0].trim();
  const age = profile.age || (nameParts.length > 1 ? nameParts[1].trim() : '');

  const handleSendMessage = async () => {
    if (!message.trim() || !user?.uid || !profile) return;
    
    try {
      // Check if a match already exists between these users
      const matchesRef = collection(firestore, 'matches');
      const q = query(
        matchesRef,
        where('users', 'array-contains', user.uid)
      );
      
      const existingMatches = await getDocs(q);
      let matchId;
      
      if (!existingMatches.empty) {
        // Use existing match
        matchId = existingMatches.docs[0].id;
      } else {
        // Create new match if none exists
        const matchRef = doc(collection(firestore, 'matches'));
        matchId = matchRef.id;
        
        await setDoc(matchRef, {
            users: [user.uid, profile.id],
            userProfiles: {
              [user.uid]: {
                displayName: user.displayName,
                photoURL: user.photoURL
              },
              [profile.id]: {
                displayName: profile.displayName,
                photoURL: profile.photoURL
              }
            },
            unreadCount: {
              [user.uid]: 0,
              [profile.id]: 1  // Initialize with 1 unread for recipient
            },
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp()
          });
      }
      
      // Then add the message to the correct match
      const messagesRef = collection(firestore, 'matches', matchId, 'messages');
      await addDoc(messagesRef, {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      
      setMessage('');
      onClose();
      
      router.push({
        pathname: '/chat/[id]',
        params: { id: matchId }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleEnhancedLike = async () => {
    if (!user || !profile) return;
    
    try {
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      
      const querySnapshot = await getDocs(q);
      const existingMatch = querySnapshot.docs.find(doc => 
        doc.data().users.includes(profile.id)
      );
      
      if (existingMatch) {
        // Add heart emoji with special type
        await addDoc(collection(firestore, 'matches', existingMatch.id, 'messages'), {
          text: "❤️",
          senderId: user.uid,
          createdAt: serverTimestamp(),
          status: MessageStatus.SENT,
          messageType: "animated-emoji", // Add this field
          emojiSize: 48, // Make it larger
          animationType: "heartbeat" // Specify animation type
        });
        
        // Update match document
        await updateDoc(doc(firestore, 'matches', existingMatch.id), {
          lastMessage: "❤️",
          lastMessageTime: serverTimestamp(),
          lastMessageType: "animated-emoji" // Add this field here too
        });
        
        onClose();
        router.push({
          pathname: '/chat/[id]',
          params: { id: existingMatch.id }
        });
      } else {
        onSendLike();
      }
    } catch (error) {
      console.error('Error sending like:', error);
    }
  };
  
  const handleEnhancedFlower = async () => {
    if (!user || !profile) return;
    
    try {
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      
      const querySnapshot = await getDocs(q);
      const existingMatch = querySnapshot.docs.find(doc => 
        doc.data().users.includes(profile.id)
      );
      
      if (existingMatch) {
        // Add flower emoji with animation properties
        await addDoc(collection(firestore, 'matches', existingMatch.id, 'messages'), {
          text: "🌹",
          senderId: user.uid,
          createdAt: serverTimestamp(),
          status: MessageStatus.SENT,
          messageType: "animated-emoji",
          emojiSize: 60,
          animationType: "bloomingFlower"
        });
        
        // Update match with last message info
        await updateDoc(doc(firestore, 'matches', existingMatch.id), {
          lastMessage: "🌹",
          lastMessageTime: serverTimestamp(),
          lastMessageType: "animated-emoji"
        });
        
        onClose();
        router.push({
          pathname: '/chat/[id]',
          params: { id: existingMatch.id }
        });
      } else {
        onSendFlower();
      }
    } catch (error) {
      console.error('Error sending flower:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header with profile pic and name */}
          <View style={styles.header}>
            <View style={styles.profileHeaderInfo}>
              <Image 
                source={{ uri: profile.photoURL }} 
                style={styles.profileImage} 
              />
              <Text style={styles.profileName}>{firstName}{age ? `,${age}` : ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {/* About section */}
          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>About Me</Text>
            <Text style={styles.bioText}>{profile.bio || 'No bio available'}</Text>
          </View>

          {/* Message input */}
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Message"
              value={message}
              onChangeText={setMessage}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendMessage}
            >
              <Ionicons name="paper-plane" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={handleEnhancedLike}  // Use the new function here
            >
            <Text style={styles.likeButtonText}>Send a like 💖</Text>
            </TouchableOpacity>

            <TouchableOpacity 
            style={styles.flowerButton}
            onPress={handleEnhancedFlower}  // Use the new function here
            >
            <LinearGradient
                colors={['#EC5F61', '#F0B433']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
            >
                <Text style={styles.flowerButtonText}>Send a flower 🌹</Text>
            </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  aboutSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
    marginBottom: 40,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginBottom: 20,
  },
  bioText: {
    fontSize: 25,
    lineHeight: 30,
    color: '#000',
    fontWeight: '600',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  messageInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    gap: 10,
  },
  likeButton: {
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  likeButtonText: {
    color: '#141414',
    fontSize: 16,
    fontWeight: '500',
  },
  flowerButton: {
    height: 45,
    borderRadius: 22.5,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ProfilePopup;