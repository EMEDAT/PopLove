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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, doc, addDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  if (!profile) return null;

  // Extract first name and age from display name (assuming format: "Name,Age")
  const nameParts = profile.displayName.split(',');
  const firstName = nameParts[0].trim();
  const age = profile.age || (nameParts.length > 1 ? nameParts[1].trim() : '');

  const handleSendMessage = async () => {
    if (!message.trim() || !user?.uid || !profile) return;
    
    try {
      // First create match document if it doesn't exist
      const matchRef = doc(collection(firestore, 'matches'));
      const matchId = matchRef.id;
      
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
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp()
      });
      
      // Then add the first message
      const messagesRef = collection(firestore, 'matches', matchId, 'messages');
      await addDoc(messagesRef, {
        text: message,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });
      
      console.log('Message sent successfully');
      setMessage('');
      onClose();
      
      // Navigate to the chat
      router.push({
        pathname: '/chat/[id]',
        params: { id: matchId }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
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
              onPress={onSendLike}
            >
              <Text style={styles.likeButtonText}>Send a like 💖</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.flowerButton}
              onPress={onSendFlower}
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