// components/chat/ChatList.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  AppState
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
  lastMessageStatus?: MessageStatus;
  lastCheckedAt?: any;
}

export function ChatList({ searchQuery = '' }) {
  const { user } = useAuthContext();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add ref to track chats the user has opened
  const openedChats = useRef<Set<string>>(new Set());

  // Apply search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChats(chats);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase().trim();
    const filtered = chats.filter(chat => 
      chat.otherUserName.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  // Listen for profile updates from other users
  useEffect(() => {
    if (!user) return;
    
    // Subscribe to user profile updates that might affect chat displays
    const profileListeners: any[] = [];
    
    // Clean up function to unsubscribe all listeners
    const unsubscribeAll = () => {
      profileListeners.forEach(unsubFn => {
        if (typeof unsubFn === 'function') {
          unsubFn();
        }
      });
    };
    
    // Set up listeners once we have chats
    if (chats.length > 0) {
      // For each chat, set up a listener for the other user's profile
      chats.forEach(chat => {
        if (!chat.otherUserId) return;
        
        const otherUserRef = doc(firestore, 'users', chat.otherUserId);
        const unsubscribe = onSnapshot(otherUserRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data();
            
            // Check if profile photo has changed
            if (userData.photoURL && userData.photoURL !== chat.otherUserPhoto) {
              console.log('Detected profile photo change for', chat.otherUserName);
              
              // Update local state immediately
              setChats(currentChats => 
                currentChats.map(item => 
                  item.id === chat.id 
                    ? {...item, otherUserPhoto: userData.photoURL} 
                    : item
                )
              );
              
              // Also update the match document
              updateDoc(doc(firestore, 'matches', chat.id), {
                [`userProfiles.${chat.otherUserId}.photoURL`]: userData.photoURL,
                updatedAt: serverTimestamp()
              }).catch(err => console.error('Error updating match profile:', err));
            }
            
            // Also check for name changes
            if (userData.displayName && userData.displayName !== chat.otherUserName) {
              // Update local state
              setChats(currentChats => 
                currentChats.map(item => 
                  item.id === chat.id 
                    ? {...item, otherUserName: userData.displayName} 
                    : item
                )
              );
              
              // Update the match document
              updateDoc(doc(firestore, 'matches', chat.id), {
                [`userProfiles.${chat.otherUserId}.displayName`]: userData.displayName,
                updatedAt: serverTimestamp()
              }).catch(err => console.error('Error updating match name:', err));
            }
          }
        });
        
        profileListeners.push(unsubscribe);
      });
    }
    
    // Clean up on unmount
    return unsubscribeAll;
  }, [chats, user]);

  // Global message status checking
  const checkGlobalMessageStatus = async () => {
    if (!user) return;

    try {
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      const matchesSnapshot = await getDocs(q);

      for (const matchDoc of matchesSnapshot.docs) {
        const matchId = matchDoc.id;
        const matchData = matchDoc.data();
        
        const otherUserId = matchData.users.find((id: string) => id !== user.uid);
        
        const messagesRef = collection(firestore, 'matches', matchId, 'messages');
        const pendingQuery = query(
          messagesRef,
          where('senderId', '==', user.uid),
          where('status', '==', MessageStatus.SENT)
        );
        
        const pendingMessages = await getDocs(pendingQuery);
        
        if (!pendingMessages.empty) {
          const statusDoc = await getDoc(doc(firestore, 'userStatus', otherUserId));
          
          if (statusDoc.exists() && statusDoc.data().isOnline) {
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

  // Listen for message status changes in real time
  useEffect(() => {
    if (!user) return;
    
    // Create individual listeners for each chat's last message
    const messageStatusListeners: any[] = [];
    
    chats.forEach(chat => {
      if (!chat.id) return;
      
      // Check if the last message was sent by the current user
      if (chat.lastMessageSenderId === user.uid) {
        // Set up a listener for the last message
        const messagesRef = collection(firestore, 'matches', chat.id, 'messages');
        const lastMsgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
        
        const unsubscribe = onSnapshot(lastMsgQuery, (snapshot) => {
          if (!snapshot.empty) {
            const lastMsgDoc = snapshot.docs[0];
            const lastMsgData = lastMsgDoc.data();
            const status = lastMsgData.status;
            
            // Update our chat preview with the current status
            setChats(currentChats => 
              currentChats.map(item => 
                item.id === chat.id 
                  ? {...item, lastMessageStatus: status} 
                  : item
              )
            );
          }
        });
        
        messageStatusListeners.push(unsubscribe);
      }
    });
    
    return () => {
      // Clean up all message status listeners
      messageStatusListeners.forEach(unsubFn => {
        if (typeof unsubFn === 'function') {
          unsubFn();
        }
      });
    };
  }, [chats, user]);

  // Fetch chats and setup listeners
  useEffect(() => {
    if (!user) return;

    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkGlobalMessageStatus();
      }
    });

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
          
          const chatPreviews = await Promise.all(
            matchesData.map(async (match: any) => {
              const otherUserId = match.users.find((id: string) => id !== user.uid) || '';
              
              const userProfile = otherUserId ? match.userProfiles?.[otherUserId] || {} : {};
              
              // Get unread count and last checked time
              const unreadCount = match.unreadCount?.[user.uid] || 0;
              const lastCheckedAt = match.lastCheckedAt;
        
              let lastMessage = match.lastMessage || '';
              let lastMessageTime = match.lastMessageTime || null;
              let lastMessageSenderId = '';
              let lastMessageStatus = MessageStatus.SENT;
        
              try {
                const messagesRef = collection(firestore, 'matches', match.id, 'messages');
                const msgQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
                const messageSnap = await getDocs(msgQuery);
                
                if (!messageSnap.empty) {
                  const messageData = messageSnap.docs[0].data();
                  lastMessage = messageData.text || '';
                  lastMessageTime = messageData.createdAt;
                  lastMessageSenderId = messageData.senderId;
                  lastMessageStatus = messageData.status || MessageStatus.SENT;
                }
              } catch (error) {
                console.error('Error fetching messages:', error);
              }
              
              // Set unread count to 0 if the chat was already opened by user
              // This ensures chat appears read in the list even if Firebase update is delayed
              const hasBeenOpened = openedChats.current.has(match.id);
              const effectiveUnreadCount = hasBeenOpened ? 0 : unreadCount;
        
              return {
                id: match.id,
                otherUserId,
                otherUserName: userProfile.displayName || 'User',
                otherUserPhoto: userProfile.photoURL || '',
                lastMessage,
                lastMessageTime,
                unreadCount: effectiveUnreadCount,
                lastMessageSenderId,
                lastMessageStatus,
                lastCheckedAt
              };
            })
          );
        
          setChats(chatPreviews);
          setFilteredChats(chatPreviews);
          
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

    const statusCheckInterval = setInterval(() => {
      checkGlobalMessageStatus();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(statusCheckInterval);
      appStateSubscription.remove();
    };
  }, [user]);

  // Navigation to chat with read status handling
  const navigateToChat = async (chat: ChatPreview) => {
    if (!user) return;
    
    try {
      // Mark this chat as opened so it appears as read in the list immediately
      openedChats.current.add(chat.id);
      
      // Reset unread count in Firestore
      if (chat.unreadCount > 0) {
        await updateDoc(doc(firestore, 'matches', chat.id), {
          [`unreadCount.${user.uid}`]: 0,
          lastCheckedAt: serverTimestamp()
        });
      }
      
      // Mark incoming messages as at least DELIVERED
      const messagesRef = collection(firestore, 'matches', chat.id, 'messages');
      const unreadQuery = query(
        messagesRef,
        where('senderId', '==', chat.otherUserId),
        where('status', 'in', [MessageStatus.SENT, MessageStatus.DELIVERED])
      );
      
      const snapshot = await getDocs(unreadQuery);
      
      if (!snapshot.empty) {
        // Mark all as READ (not just DELIVERED)
        const batch = writeBatch(firestore);
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { 
            status: MessageStatus.READ, // Update directly to READ
            readAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        console.log(`Marked ${snapshot.size} messages as READ`);
      }
      
      // Update the display for this chat in our list immediately
      setChats(prevChats => 
        prevChats.map(item => 
          item.id === chat.id ? {...item, unreadCount: 0} : item
        )
      );
    } catch (error) {
      console.error('Error updating message status:', error);
    }
    
    // Navigate to the chat
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

  const formatLastMessageTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (diff < 48 * 60 * 60 * 1000) {
      return 'yesterday';
    }
    
    return date.toLocaleDateString();
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const messagesRef = collection(firestore, 'matches', chatId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      const batch = writeBatch(firestore);
      messagesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await deleteDoc(doc(firestore, 'matches', chatId));
      
      setChats(currentChats => currentChats.filter(chat => chat.id !== chatId));
    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete conversation');
    }
  };

  // Function to determine if a chat should appear "read" (non-bold)
  const isChatRead = (chat: ChatPreview) => {
    // If unread count is 0, it's always read
    if (chat.unreadCount === 0) return true;
    
    // If we've marked this chat as opened in this session, show as read
    if (openedChats.current.has(chat.id)) return true;
    
    return false;
  };

  return (
    <View style={styles.container}>
      <View style={styles.messagesHeader}>
        <Text style={styles.messagesLabel}>Messages</Text>
      </View>
      
      <FlatList
        data={filteredChats}
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
              {!isChatRead(item) && (
                <View style={styles.unreadDot} />
              )}
            </View>
            
            <View style={styles.chatDetails}>
              <View style={styles.chatHeader}>
                <Text style={[
                  styles.chatName, 
                  !isChatRead(item) && styles.unreadChatName
                ]} numberOfLines={1}>
                  {item.otherUserName}
                </Text>
                <Text style={styles.chatTime}>
                  {formatLastMessageTime(item.lastMessageTime)}
                </Text>
              </View>
              <View style={styles.chatPreview}>
                <Text 
                  style={[
                    styles.chatPreviewText,
                    !isChatRead(item) && styles.unreadMessage
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessageSenderId === user?.uid ? `You: ${item.lastMessage}` : item.lastMessage || "Start a conversation"}
                </Text>
                {!isChatRead(item) && (
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
    backgroundColor: '#F2F1ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F1ED',
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
    backgroundColor: '#F2F1ED',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#333',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  messagesHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 5,
  },
  messagesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chatList: {
    paddingTop: 5,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F2F1ED',
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
    borderBottomColor: '#FFE0E0', // Lighter pink border
    paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  unreadChatName: {
    fontWeight: '700',
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