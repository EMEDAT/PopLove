// app/(tabs)/matches.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator,
  Platform,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { useLocalSearchParams } from 'expo-router';

export default function MatchesScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const route = useLocalSearchParams();
  const matchId = route.matchId;

  useEffect(() => {
    if (matchId && typeof matchId === 'string') {
      // Find match in the matches array
      const match = matches.find(m => m.id === matchId);
      if (match) {
        handleSelectMatch(match);
      }
    }
  }, [matchId, matches]);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      
      // In a real app, we would fetch actual matches from a matches collection
      // For now, we'll simulate matches with other users
      const usersRef = collection(firestore, 'users');
      const q = query(
        usersRef,
        where('hasCompletedOnboarding', '==', true),
        where('uid', '!=', user?.uid),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      const matchesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Add some mock last message data
        lastMessage: {
          text: 'Hello, how are you?',
          timestamp: new Date(),
          unread: Math.random() > 0.5
        }
      }));
      
      setMatches(matchesData);
      
      // Set first match as active chat if no active chat
      if (matchesData.length > 0 && !activeChat) {
        setActiveChat(matchesData[0]);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMatch = (match: any) => {
    setActiveChat(match);
    
    // Mark message as read in a real app
    const updatedMatches = matches.map(m => {
      if (m.id === match.id && m.lastMessage?.unread) {
        return { ...m, lastMessage: { ...m.lastMessage, unread: false } };
      }
      return m;
    });
    
    setMatches(updatedMatches);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeChat) return;
    
    // In a real app, this would save the message to Firestore
    console.log(`Sending message to ${activeChat.displayName}: ${messageText}`);
    
    // Clear input
    setMessageText('');
  };

  const renderMatchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[
        styles.matchItem,
        activeChat?.id === item.id && styles.activeMatchItem
      ]}
      onPress={() => handleSelectMatch(item)}
    >
      <View style={styles.profileImageContainer}>
        {item.photoURL ? (
          <Image 
            source={{ uri: item.photoURL }} 
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.noPhotoContainer}>
            <Ionicons name="person" size={24} color="#CCCCCC" />
          </View>
        )}
        {item.lastMessage?.unread && <View style={styles.unreadIndicator} />}
      </View>
      
      <View style={styles.matchDetails}>
        <Text style={styles.matchName}>{item.displayName || 'User'}</Text>
        <Text 
          style={[
            styles.lastMessage,
            item.lastMessage?.unread && styles.unreadMessage
          ]}
          numberOfLines={1}
        >
          {item.lastMessage?.text || 'Say hi!'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderNoMatches = () => (
    <View style={styles.noMatchesContainer}>
      <Text style={styles.noMatchesText}>No matches yet</Text>
      <Text style={styles.noMatchesSubtext}>
        Start swiping to find your matches!
      </Text>
    </View>
  );
  // Generate some mock messages for active chat
  const generateMockMessages = () => {
    if (!activeChat) return [];
    
    const userMessage = {
      id: '1',
      senderId: user?.uid,
      text: 'Hello, how are you?',
      timestamp: new Date(Date.now() - 3600000) // 1 hour ago
    };
    
    const matchMessage = {
      id: '2',
      senderId: activeChat.id,
      text: 'I am doing good and you?',
      timestamp: new Date(Date.now() - 3000000) // 50 minutes ago
    };
    
    const userReply = {
      id: '3',
      senderId: user?.uid,
      text: 'I love your personality',
      timestamp: new Date(Date.now() - 300000) // 5 minutes ago
    };
    
    return [userMessage, matchMessage, userReply];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
      </View>
      
      <View style={styles.content}>
        {/* Profile circles at top */}
        <View style={styles.profileCircles}>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.profileCirclesContent}
          >
            {matches.map((match) => (
              <TouchableOpacity 
                key={match.id}
                style={[
                  styles.profileCircle,
                  activeChat?.id === match.id && styles.activeProfileCircle
                ]}
                onPress={() => handleSelectMatch(match)}
              >
                {match.photoURL ? (
                  <Image 
                    source={{ uri: match.photoURL }} 
                    style={styles.circleImage}
                  />
                ) : (
                  <View style={styles.noCirclePhoto}>
                    <Ionicons name="person" size={24} color="#CCCCCC" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        <Text style={styles.sectionTitle}>Messages</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : matches.length === 0 ? (
          renderNoMatches()
        ) : (
          <View style={styles.matchesList}>
            <FlatList
              data={matches}
              renderItem={renderMatchItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        
        {/* Active chat view */}
        {activeChat && (
          <Modal 
            visible={!!activeChat}
            animationType="slide"
            onRequestClose={() => setActiveChat(null)}
          >
            <SafeAreaView style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <TouchableOpacity 
                  onPress={() => setActiveChat(null)}
                  style={styles.backButton}
                >
                  <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                
                <View style={styles.chatHeaderProfile}>
                  {activeChat.photoURL ? (
                    <Image 
                      source={{ uri: activeChat.photoURL }} 
                      style={styles.chatHeaderImage}
                    />
                  ) : (
                    <View style={styles.chatHeaderNoPhoto}>
                      <Ionicons name="person" size={20} color="#CCCCCC" />
                    </View>
                  )}
                  <Text style={styles.chatHeaderName}>
                    {activeChat.displayName || 'User'}
                  </Text>
                </View>
                
                <TouchableOpacity style={styles.chatHeaderAction}>
                  <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              {/* Chat messages */}
              <FlatList
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                data={generateMockMessages()}
                keyExtractor={item => item.id}
                inverted={false}
                renderItem={({ item }) => (
                  <View 
                    style={[
                      styles.messageContainer,
                      item.senderId === user?.uid ? 
                        styles.userMessageContainer : 
                        styles.matchMessageContainer
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        item.senderId === user?.uid ? 
                          styles.userMessageBubble : 
                          styles.matchMessageBubble
                      ]}
                    >
                      <Text 
                        style={[
                          styles.messageText,
                          item.senderId === user?.uid ?
                            styles.userMessageText :
                            styles.matchMessageText
                        ]}
                      >
                        {item.text}
                      </Text>
                    </View>
                  </View>
                )}
              />
              
              {/* Message input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Message"
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                />
                
                <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
                  <Ionicons name="send" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileCircles: {
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  profileCirclesContent: {
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  profileCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 8,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  activeProfileCircle: {
    borderColor: '#FF6B6B',
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  noCirclePhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginLeft: 20,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
  },
  noMatchesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noMatchesText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  noMatchesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  matchesList: {
    flex: 1,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activeMatchItem: {
    backgroundColor: '#FAFAFA',
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  noPhotoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  matchDetails: {
    flex: 1,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  chatHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  chatHeaderNoPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderAction: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messagesContent: {
    paddingTop: 10,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  matchMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userMessageBubble: {
    backgroundColor: '#FF6B6B',
  },
  matchMessageBubble: {
    backgroundColor: '#F0F0F0',
  },
  messageText: {
    fontSize: 16,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  matchMessageText: {
    color: '#333333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  messageInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});