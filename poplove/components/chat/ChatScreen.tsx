// components/chat/ChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { router } from 'expo-router';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

interface ChatScreenProps {
  matchId: string;
  otherUser: {
    id: string;
    displayName: string;
    photoURL: string;
    status?: string;
  };
}

export function ChatScreen({ matchId, otherUser }: ChatScreenProps) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Subscribe to messages
  useEffect(() => {
    if (!matchId) return;

    setLoading(true);
    const messagesRef = collection(firestore, 'matches', matchId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      setMessages(newMessages);
      setLoading(false);
      
      // Scroll to bottom on new messages
      if (newMessages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      }
    });

    return unsubscribe;
  }, [matchId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !user?.uid || !matchId) return;

    try {
      const messagesRef = collection(firestore, 'matches', matchId, 'messages');
      await addDoc(messagesRef, {
        text: inputMessage.trim(),
        senderId: user.uid,
        createdAt: serverTimestamp(),
      });

      // Clear input
      setInputMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Format time for messages
  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: any, message) => {
    const date = message.createdAt?.toDate ? message.createdAt.toDate() : new Date();
    const dateStr = isToday(date) ? 'Today' : date.toLocaleDateString();
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(message);
    return groups;
  }, {});

  // Flatten grouped messages with date headers
  const flattenedMessages = Object.entries(groupedMessages).flatMap(([date, msgs]) => [
    { id: `date-${date}`, type: 'date', text: date },
    ...(msgs as Message[])
  ]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <Image 
            source={{ uri: otherUser.photoURL }} 
            style={styles.headerAvatar} 
          />
          <View>
            <Text style={styles.headerUsername}>{otherUser.displayName.split(',')[0]}</Text>
            <Text style={styles.userStatus}>{otherUser.status || 'Online'}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.videoCallButton}>
            <Ionicons name="videocam" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={flattenedMessages}
        keyExtractor={(item) => ('id' in item) ? item.id : Math.random().toString()}
        renderItem={({ item }) => {
          if ('type' in item && item.type === 'date') {
            return (
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{item.text}</Text>
              </View>
            );
          }
          
          const message = item as Message;
          const isCurrentUser = message.senderId === user?.uid;
          
          return (
            <View style={[
              styles.messageContainer,
              isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
            ]}>
              <View style={[
                styles.messageBubble,
                isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  isCurrentUser ? styles.currentUserText : styles.otherUserText
                ]}>
                  {message.text}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.messageList}
      />

      {/* Message input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#999" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            placeholder="Message"
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            placeholderTextColor="#999"
          />
          
          <TouchableOpacity style={styles.inputButton} onPress={sendMessage}>
            <Ionicons name="camera" size={24} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.inputButton}>
            <Ionicons name="mic" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 5,
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  headerUsername: {
    fontSize: 16,
    fontWeight: '600',
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
  },
  videoCallButton: {
    padding: 5,
    marginRight: 10,
  },
  moreButton: {
    padding: 5,
  },
  messageList: {
    padding: 10,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  currentUserMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherUserMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  currentUserBubble: {
    backgroundColor: '#FF6B6B',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  inputButton: {
    padding: 8,
  },
});

export default ChatScreen;