// components/chat/ChatList.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, limit } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { router } from 'expo-router';

interface ChatPreview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
}

export function ChatList() {
  const { user } = useAuthContext();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    
    // Use onSnapshot to listen for real-time updates
    const matchesRef = collection(firestore, 'matches');
    const q = query(
      matchesRef,
      where('users', 'array-contains', user.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        try {
          if (snapshot.empty) {
            setChats([]);
            setError('No matches yet');
            setLoading(false);
            return;
          }

          const matchesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Process matches to get chat previews
          const chatPreviews = await Promise.all(
            matchesData.map(async (match: any) => {
              // Find the other user's ID
              const otherUserId = match.users.find((id: string) => id !== user.uid) || '';
              
              // Get user profile data
              const userProfile = otherUserId ? match.userProfiles?.[otherUserId] || {} : {};
        
              // Get last message
              let lastMessage = '';
              let lastMessageTime = match.lastMessageTime || null;
              let unreadCount = 0;
        
              try {
                const messagesRef = collection(firestore, 'matches', match.id, 'messages');
                const msgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
                const messageSnap = await getDocs(msgQuery);
                
                if (!messageSnap.empty) {
                  const messageData = messageSnap.docs[0].data();
                  lastMessage = messageData.text || '';
                  lastMessageTime = messageData.createdAt;
                  
                  // Check if the message is unread
                  if (messageData.senderId !== user.uid && !messageData.read) {
                    unreadCount = 1;
                  }
                }
              } catch (error) {
                console.error('Error fetching messages:', error);
              }
        
              return {
                id: match.id,
                otherUserId,
                otherUserName: userProfile.displayName || 'User',
                otherUserPhoto: userProfile.photoURL || '',
                lastMessage,
                lastMessageTime,
                unreadCount
              };
            })
          );
        
          setChats(chatPreviews);
          
          if (chatPreviews.length === 0) {
            setError('No matches yet');
          } else {
            setError(null);
          }
        } catch (err) {
          console.error('Error processing matches:', err);
          setError('Failed to load chats');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching matches:', err);
        setError('Failed to load chats');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const navigateToChat = (chat: ChatPreview) => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: chat.id }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  if (error && chats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={60} color="#ccc" />
        <Text style={styles.emptyTitle}>No matches yet</Text>
        <Text style={styles.emptySubtitle}>Start swiping to find your matches!</Text>
      </View>
    );
  }

  // Format time for last message
  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // If less than 24 hours, show time
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If yesterday
    if (diff < 48 * 60 * 60 * 1000) {
      return 'yesterday';
    }
    
    // Otherwise show date
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => navigateToChat(item)}
          >
            <View style={styles.avatarContainer}>
              {item.otherUserPhoto ? (
                <Image 
                  source={{ uri: item.otherUserPhoto }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.placeholderAvatar}>
                  <Text style={styles.placeholderText}>
                    {item.otherUserName.charAt(0)}
                  </Text>
                </View>
              )}
              {item.unreadCount > 0 && (
                <View style={styles.unreadDot} />
              )}
            </View>
            
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.otherUserName}</Text>
                <Text style={styles.chatTime}>
                  {formatLastMessageTime(item.lastMessageTime)}
                </Text>
              </View>
              <View style={styles.chatPreview}>
                <Text 
                  style={[
                    styles.chatPreviewText,
                    item.unreadCount > 0 && styles.unreadMessage
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage || "Start a conversation"}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.chatList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  chatList: {
    paddingTop: 10,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatDetails: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreviewText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatList;