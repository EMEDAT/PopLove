import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
    AppState  // Add AppState import
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  doc, 
  limit, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { router } from 'expo-router';
import { MessageStatus } from './MessageStatus';

interface ChatPreview {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string;
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  lastMessageSenderId: string;
}

export function ChatList() {
  const { user } = useAuthContext();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New method for global message status checking
  const checkGlobalMessageStatus = async () => {
    if (!user) return;

    try {
      // Get all matches for the current user
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      const matchesSnapshot = await getDocs(q);

      for (const matchDoc of matchesSnapshot.docs) {
        const matchId = matchDoc.id;
        const matchData = matchDoc.data();
        
        // Find the other user in this match
        const otherUserId = matchData.users.find((id: string) => id !== user.uid);
        
        // Check messages that are still in SENT status
        const messagesRef = collection(firestore, 'matches', matchId, 'messages');
        const pendingQuery = query(
          messagesRef,
          where('senderId', '==', user.uid),
          where('status', '==', MessageStatus.SENT)
        );
        
        const pendingMessages = await getDocs(pendingQuery);
        
        if (!pendingMessages.empty) {
          // Check if recipient is online by checking their status document
          const statusDoc = await getDoc(doc(firestore, 'userStatus', otherUserId));
          
          if (statusDoc.exists() && statusDoc.data().isOnline) {
            // If recipient is online, update messages to DELIVERED
            const batch = writeBatch(firestore);
            pendingMessages.docs.forEach(messageDoc => {
              batch.update(messageDoc.ref, { 
                status: MessageStatus.DELIVERED,
                deliveredAt: serverTimestamp()
              });
            });
            
            await batch.commit();
          }
        }
      }
    } catch (error) {
      console.error('Global message status check failed:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Existing AppState handler for background/foreground tracking
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkGlobalMessageStatus();
      }
    });

    // Existing matches query logic
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
              
              // Get unread count (defaults to 0)
              const unreadCount = match.unreadCount?.[user.uid] || 0;
        
              // Get last message
              let lastMessage = match.lastMessage || '';
              let lastMessageTime = match.lastMessageTime || null;
              let lastMessageSenderId = '';
        
              try {
                const messagesRef = collection(firestore, 'matches', match.id, 'messages');
                const msgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
                const messageSnap = await getDocs(msgQuery);
                
                if (!messageSnap.empty) {
                  const messageData = messageSnap.docs[0].data();
                  lastMessage = messageData.text || '';
                  lastMessageTime = messageData.createdAt;
                  lastMessageSenderId = messageData.senderId;
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
                unreadCount,
                lastMessageSenderId
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

    // Periodic status check interval
    const statusCheckInterval = setInterval(() => {
      checkGlobalMessageStatus();
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      unsubscribe();
      clearInterval(statusCheckInterval);
      appStateSubscription.remove();
    };
  }, [user]);

  const navigateToChat = async (chat: ChatPreview) => {
    if (!user) return;
    
    try {
      // This function needs to reset unread count immediately when entering chat
      if (chat.unreadCount > 0) {
        // Reset unread count first
        await updateDoc(doc(firestore, 'matches', chat.id), {
          [`unreadCount.${user.uid}`]: 0
        });
      }
      
      // Get messages that need to be updated to delivered status
      const messagesRef = collection(firestore, 'matches', chat.id, 'messages');
      const q = query(
        messagesRef,
        where('senderId', '==', chat.otherUserId),
        where('status', '==', MessageStatus.SENT)
      );
      
      const snapshot = await getDocs(q);
      
      // Update messages in batch
      if (!snapshot.empty) {
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { 
            status: MessageStatus.DELIVERED,
            deliveredAt: serverTimestamp()
          });
        });
        
        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
    
    // Navigate to chat
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

  const handleDeleteChat = async (chatId: string) => {
  try {
    // Delete messages subcollection first
    const messagesRef = collection(firestore, 'matches', chatId, 'messages');
    const messagesSnapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(firestore);
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    
    // Then delete the match document
    await deleteDoc(doc(firestore, 'matches', chatId));
    
    // Update local state
    setChats(currentChats => currentChats.filter(chat => chat.id !== chatId));
  } catch (error) {
    console.error('Error deleting chat:', error);
    Alert.alert('Error', 'Failed to delete conversation');
  }
}

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
        <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => navigateToChat(item)}
        onLongPress={() => {
            Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this conversation?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteChat(item.id) }
            ]
            );
        }}
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
                <Text style={styles.chatName} numberOfLines={1}>{item.otherUserName}</Text>
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
                  {item.lastMessageSenderId === user?.uid ? `You: ${item.lastMessage}` : item.lastMessage || "Start a conversation"}
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