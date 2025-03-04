// components/chat/ChatList.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView
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

interface MatchData {
    id: string;
    users: string[];
    userProfiles: {
      [key: string]: {
        displayName?: string;
        photoURL?: string;
      };
    };
    lastMessageTime: any;
    // Add other properties as needed
  }

export function ChatList() {
  const { user } = useAuthContext();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch matches
    const fetchMatches = async () => {
      const matchesRef = collection(firestore, 'matches');
      const q = query(
        matchesRef,
        where('users', 'array-contains', user.uid),
        orderBy('lastMessageTime', 'desc')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }) as MatchData);
      
        // Process matches to get chat previews
        const chatPreviews = await Promise.all(
          matchesData.map(async (match) => {
            // Find the other user's ID
            const otherUserId = match.users.find((id: string) => id !== user.uid) || '';
            
            // Get user profile data
            const userProfile = otherUserId ? match.userProfiles?.[otherUserId] || {} : {};
      
            // Get last message
            let lastMessage = '';
            let lastMessageTime = match.lastMessageTime || null;
            let unreadCount = 0;
      
            // Fetch the last message from the messages subcollection
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
        setLoading(false);
      });

      return unsubscribe;
    };

    fetchMatches();
  }, [user]);

  const navigateToChat = (chat: ChatPreview) => {
    router.push({
      pathname: '/(tabs)/chat/[id]',
      params: { id: chat.id }
    });
  };

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile circles at top */}
      <View style={styles.profileCirclesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileCirclesScroll}
        >
          {chats.map(chat => (
            <TouchableOpacity 
              key={chat.id} 
              style={styles.profileCircle}
              onPress={() => navigateToChat(chat)}
            >
              {chat.otherUserPhoto ? (
                <Image 
                  source={{ uri: chat.otherUserPhoto }} 
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>
                    {chat.otherUserName.charAt(0)}
                  </Text>
                </View>
              )}
              {chat.unreadCount > 0 && (
                <View style={styles.unreadDot} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabSelector}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>Messages</Text>
        </TouchableOpacity>
      </View>

      {/* Chat list */}
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => navigateToChat(item)}
          >
            {/* Profile pic */}
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
            </View>
            
            {/* Chat details */}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  moreButton: {
    padding: 8,
  },
  profileCirclesContainer: {
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileCirclesScroll: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
  },
  unreadDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#fff',
  },
  tabSelector: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '600',
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
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
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