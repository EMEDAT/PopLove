// components/chat/ChatScreen.tsx - Fixed message status handling

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Alert,
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  SafeAreaView,
  Image,
  AppState
} from 'react-native';
import { auth } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../auth/AuthProvider';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  getDoc,
  updateDoc,
  deleteDoc, 
  doc, 
  serverTimestamp, 
  where, 
  getDocs, 
  writeBatch,
  Timestamp,
  limit  
} from 'firebase/firestore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { firestore } from '../../lib/firebase';
import { MessageStatus, MessageStatusIndicator } from './MessageStatus';
import { router } from 'expo-router';

interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  status: MessageStatus;
  unreadCount?: number;
  messageType?: string;
  emojiSize?: number;
  animationType?: string;
}

interface ChatScreenProps {
  matchId: string;
  otherUser: {
    id: string;
    displayName: string;
    photoURL: string;
    status?: string;
  };
  speedDatingMode?: boolean;
  forcedCollectionPath?: 'matches' | 'speedDatingConnections';
  onGoBack?: () => void;
}

export function ChatScreen({ 
  matchId, 
  otherUser, 
  speedDatingMode = false, 
  forcedCollectionPath,
  onGoBack 
}: ChatScreenProps) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [appActive, setAppActive] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const appStateRef = useRef(AppState.currentState);
  const [isFocused, setIsFocused] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [longPressedMessage, setLongPressedMessage] = useState<string | null>(null);
  const [subscribedCollection, setSubscribedCollection] = useState<string | null>(null);
  const [collectionPath, setCollectionPath] = useState<string>(forcedCollectionPath || 'matches');

  // After the state declarations, right before the useEffect blocks
  console.log("BREAKPOINT 2: MESSAGES TO RENDER:", messages.map(m => ({
    id: m.id,
    senderId: m.senderId,
    text: m.text
  })));

  // Add inside component body, after state declarations
  useEffect(() => {
    console.log("ACTUAL AUTH USER:", auth.currentUser?.uid);
  }, []);
  
  // Add a ref to track whether we've marked messages as read
  const hasMarkedMessagesAsRead = useRef(false);

  // Listen for app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const isActive = nextAppState === 'active';
      appStateRef.current = nextAppState;
      setAppActive(isActive);
      
      // When app comes to foreground, mark messages as read
      if (isActive) {
        markMessagesAsRead();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Update messages to "READ" when the app comes to foreground
    if (appActive && isFocused) {
      markMessagesAsRead();
    }
  }, [appActive, isFocused]);

// Subscribe to messages
useEffect(() => {
  console.log(`Setting up chat for ${user?.uid} with other user: ${otherUser.id} in ${forcedCollectionPath || 'auto-detected'} collection`);

  if (!matchId) return;
  setLoading(true);
  
  // If collection path is forced, use it; otherwise detect
  let actualCollectionPath = forcedCollectionPath;
  
  const setupMessageListener = async () => {
    console.log(`BREAKPOINT 1: Collection path detection, forced=${forcedCollectionPath}`);
    
    // Only detect collection if it wasn't forced
    if (!forcedCollectionPath) {
      // Try matches collection first
      let matchRef = doc(firestore, 'matches', matchId);
      let matchExists = (await getDoc(matchRef)).exists();
      actualCollectionPath = 'matches'; // UPDATE THIS LINE - no 'let'
      
      // If not found, try speedDatingConnections
      if (!matchExists) {
        actualCollectionPath = 'speedDatingConnections';
        matchRef = doc(firestore, 'speedDatingConnections', matchId);
        matchExists = (await getDoc(matchRef)).exists();
        
        if (!matchExists) {
          console.error(`Chat not found: ${matchId}`);
          setLoading(false);
          return () => {};
        }
      }
    }
    
    // Save the collection path for other functions to use
    setCollectionPath(actualCollectionPath || 'matches');
    console.log(`Subscribing to: ${actualCollectionPath}/${matchId}/messages`);
    
    // Now setup message listener with the determined path
    const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
    const q = query(
      messagesRef, 
      orderBy('createdAt', 'asc')
    );

    // Add explicit logging in listener
    console.log('MESSAGE LISTENER DEBUG', {
      userId: user?.uid,
      otherUserId: otherUser.id,
      matchId,
      collectionPath
    });
    
    return onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || MessageStatus.SENT
      })) as Message[];
      
      // Important: Don't filter messages by sender - show ALL messages
      setMessages(newMessages);
      setLoading(false);
      
      // Scroll to bottom on new messages
      if (newMessages.length > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      }
      
      // Mark messages as read
      if (appActive && !hasMarkedMessagesAsRead.current) {
        markMessagesAsRead();
      }
    });
  };
  
  let unsubscribe = () => {};
  setupMessageListener().then(unsub => {
    if (unsub) unsubscribe = unsub;
  });

  return () => unsubscribe();
}, [matchId, forcedCollectionPath]);


  // Mark messages as read when chat is opened - FIXED VERSION
  useEffect(() => {
    // Only run this once when entering the chat screen
    if (!hasMarkedMessagesAsRead.current) {
      markMessagesAsRead();
      
      // Mark that we've processed messages
      hasMarkedMessagesAsRead.current = true;
    }
    
    // Start periodic updates when chat screen is opened
    const intervalId = setInterval(() => {
      if (appActive) {
        markMessagesAsRead();
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [matchId]);

  // Mark messages as read - IMPROVED VERSION
  const markMessagesAsRead = async () => {
    if (!matchId || !user || !appActive) return;
    
    try {
      // Use the determined collection path
      const actualCollectionPath = forcedCollectionPath || 'matches';
      
      console.log("Marking messages as read");
      
      // Find messages that need to be marked as read
      const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
      const deliveredQuery = query(
        messagesRef,
        where('senderId', '==', otherUser.id),
        where('status', 'in', [MessageStatus.SENT, MessageStatus.DELIVERED])
      );
      
      const deliveredMessages = await getDocs(deliveredQuery);
      
      if (!deliveredMessages.empty) {
        console.log(`Found ${deliveredMessages.size} messages to mark as read`);
        
        // Update to READ status in batch
        const batch = writeBatch(firestore);
        deliveredMessages.docs.forEach(messageDoc => {
          batch.update(messageDoc.ref, { 
            status: MessageStatus.READ,
            readAt: serverTimestamp()
          });
        });
        
        await batch.commit();
        
        // Only update match document if using matches collection
        if (actualCollectionPath === 'matches') {
          await updateDoc(doc(firestore, 'matches', matchId), {
            [`unreadCount.${user.uid}`]: 0,
            lastCheckedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      console.error('Error updating message status:', error);
    }
  };

  useEffect(() => {
    // Check delivery status for sent messages periodically when app is active
    const checkDeliveryInterval = setInterval(() => {
      if (appActive) {
        checkDeliveryStatus();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(checkDeliveryInterval);
  }, [appActive]);
  
  // Function to update message status to DELIVERED when recipient is online
  const checkDeliveryStatus = async () => {
    if (!matchId || !user) return;
    
    try {
      // Use the determined collection path
      const actualCollectionPath = collectionPath;
      
      // Get undelivered messages sent by current user
      const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
      const q = query(
        messagesRef,
        where('senderId', '==', user.uid),
        where('status', '==', MessageStatus.SENT)
      );
      
      const undeliveredMessages = await getDocs(q);
      
      if (!undeliveredMessages.empty) {
        // Check if recipient is online based on explicit isOnline flag
        const userStatusDoc = await getDoc(doc(firestore, 'userStatus', otherUser.id));
        const isOnline = userStatusDoc.exists() && userStatusDoc.data().isOnline === true;
        
        if (isOnline) {
          // Update to DELIVERED in batch
          const batch = writeBatch(firestore);
          undeliveredMessages.docs.forEach(doc => {
            batch.update(doc.ref, {
              status: MessageStatus.DELIVERED,
              deliveredAt: serverTimestamp()
            });
          });
          
          await batch.commit();
        }
      }
    } catch (error) {
      console.error('Error checking delivery status:', error);
    }
  };

  console.log("SENDING MESSAGE AS:", auth.currentUser?.uid, "User object UID:", user?.uid);

  // Send message
  const sendMessage = async () => {
    console.log("BREAKPOINT 3: SENDING MESSAGE DATA:", {
      currentUserId: user?.uid,
      otherUserId: otherUser.id,
      collectionPath,
      messageText: inputMessage.trim()
    });
    
    if (!inputMessage.trim() || !user?.uid || !matchId) return;
    
    console.log('SPEED DATING MESSAGE SEND DEBUG', {
      matchId,
      userId: user!.uid,
      otherUserId: otherUser.id,
      collectionPath: forcedCollectionPath || collectionPath,
      messageText: inputMessage.trim()
    });
   
    try {
      const currentUserId = user?.uid;
      const messageText = inputMessage.trim();
      setInputMessage('');
      
      const actualCollectionPath = collectionPath;
      
      if (editingMessageId) {
        await updateDoc(doc(firestore, actualCollectionPath, matchId, 'messages', editingMessageId), {
          text: messageText,
          isEdited: true,
          editedAt: serverTimestamp()
        });
        
        if (actualCollectionPath === 'matches') {
          const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
          const lastMessageQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
          const lastMessageSnapshot = await getDocs(lastMessageQuery);
          
          if (!lastMessageSnapshot.empty && lastMessageSnapshot.docs[0].id === editingMessageId) {
            await updateDoc(doc(firestore, 'matches', matchId), {
              lastMessage: messageText,
              lastMessageTime: serverTimestamp()
            });
          }
        }
        
        setEditingMessageId(null);
      } else {
        const messageData = {
          text: messageText,
          senderId: user!.uid,
          recipientId: otherUser.id,
          createdAt: serverTimestamp(),
          status: MessageStatus.SENT, // Set directly to SENT
          _source: actualCollectionPath
        };
        
        console.log('DETAILED MESSAGE CREATION', {
          messageData,
          matchPath: `${actualCollectionPath}/${matchId}/messages`
        });
        
        const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
        const messageDoc = await addDoc(messagesRef, messageData);
        
        await updateDoc(doc(firestore, actualCollectionPath, matchId, 'messages', messageDoc.id), {
          status: MessageStatus.SENT
        });
        
        if (actualCollectionPath === 'matches') {
          const otherUserId = otherUser.id;
          await updateDoc(doc(firestore, 'matches', matchId), {
            lastMessageTime: serverTimestamp(),
            lastMessage: messageText,
            [`unreadCount.${otherUserId}`]: messages.filter(m => 
              m.senderId === currentUserId && 
              (m.status === MessageStatus.SENT || m.status === MessageStatus.DELIVERED)
            ).length + 1
          });
        }
      }
      
      setTimeout(() => {
        if (appActive) {
          checkDeliveryStatus();
        }
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
    }
   };

  const deleteMessage = async (messageId) => {
    if (!matchId || !user) return;
    
    try {
      // Use the determined collection path
      const actualCollectionPath = collectionPath;
      
      // Delete the message
      await deleteDoc(doc(firestore, actualCollectionPath, matchId, 'messages', messageId));
      
      // Never navigate away from speed dating connections
      if (actualCollectionPath === 'speedDatingConnections') {
        return;
      }
      
      // For permanent chats, handle empty chats
      const messagesRef = collection(firestore, actualCollectionPath, matchId, 'messages');
      const remainingMessages = await getDocs(query(messagesRef, orderBy('createdAt', 'desc'), limit(1)));
      
      if (remainingMessages.empty) {
        try {
          await deleteDoc(doc(firestore, 'matches', matchId));
          router.replace('/(tabs)/matches');
        } catch (err) {
          console.error('Error deleting empty chat:', err);
        }
      } else {
        // Update last message if not empty
        const newLastMessage = remainingMessages.docs[0].data();
        await updateDoc(doc(firestore, 'matches', matchId), {
          lastMessage: newLastMessage.text,
          lastMessageTime: newLastMessage.createdAt
        });
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
    }
  };

  const editMessage = async (messageId, newText) => {
    if (!matchId || !user) return;
    
    try {
      await updateDoc(doc(firestore, 'matches', matchId, 'messages', messageId), {
        text: newText,
        isEdited: true,
        editedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: Timestamp | null) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toMillis());
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
    if (!message.createdAt) return groups;
    
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

  // Create a separate AnimatedEmojiMessage component outside your main component
  const AnimatedEmojiMessage = ({ message, isCurrentUser, formatMessageTime }) => {
    const scale = useSharedValue(1);
    const [animating, setAnimating] = useState(true);
    
    // Function to start animation
    const startAnimation = () => {
      setAnimating(true);
      // Very slow animation that lasts a long time
      if (message.text === "❤️") {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 2000 }), // 15 seconds to expand
            withTiming(1, { duration: 2000 })    // 15 seconds to contract
          ), 
          20 // Repeat 20 times = 10 minutes
        );
      } else if (message.text === "🌹") {
        scale.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1000 }),
            withTiming(1.2, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ), 
          2 // Repeat very shortly
        );
      }
    };
  
    // Start animation on first render
    useEffect(() => {
      startAnimation();
    }, []);
    
    const animatedStyle = useAnimatedStyle(() => {
      return { transform: [{ scale: scale.value }] };
    });
    
    return (
        <TouchableOpacity 
          onPress={startAnimation}
          onLongPress={() => {
            if (longPressedMessage === message.id) {
              setLongPressedMessage(null);
            } else if (isCurrentUser) {
              setLongPressedMessage(message.id);
            }
          }}
          style={[
            styles.messageContainer,
            isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
          ]}
        >
          <Animated.Text style={[
            { fontSize: message.emojiSize || 60, marginVertical: 10 },
            animatedStyle
          ]}>
            {message.text}
          </Animated.Text>
          
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>{formatMessageTime(message.createdAt)}</Text>
            
            {isCurrentUser && (
              <>
                {longPressedMessage === message.id ? (
                <View style={{flexDirection: 'row', marginLeft: 4}}>
                    <TouchableOpacity onPress={() => {
                    // Set the input message to the selected message for editing
                    setInputMessage(message.text);
                    // Save the message ID being edited
                    setEditingMessageId(message.id);
                    // Close the long press menu
                    setLongPressedMessage(null);
                    }} style={{marginHorizontal: 6}}>
                    <Ionicons name="pencil" size={16} color="#999" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                    deleteMessage(message.id);
                    setLongPressedMessage(null);
                    }} style={{marginHorizontal: 6}}>
                    <Ionicons name="trash" size={16} color="#999" />
                    </TouchableOpacity>
                </View>
                ) : (
                <MessageStatusIndicator status={message.status} />
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      );
  };

  // Add component mount effect to mark messages as read on entry
  useEffect(() => {
    // Make sure we mark messages as read immediately on component mount
    markMessagesAsRead();
    
    // On component unmount, make sure messages are marked as read
    return () => {
      markMessagesAsRead();
    };
  }, []);

  const handleGoBack = () => {
    // Important: Mark messages as read before navigating back
    markMessagesAsRead().then(() => {
      if (onGoBack) {
        onGoBack();
      } else {
        router.replace('/(tabs)/matches');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack} 
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.headerUserInfo}>
          <Image 
            source={{ uri: otherUser.photoURL || 'https://via.placeholder.com/40' }} 
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
          debugger;
            if ('type' in item && item.type === 'date') {
              return (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{item.text}</Text>
                </View>
              );
            }
            
            const message = item as Message;
            const isCurrentUser = !!user && message.senderId === user.uid;
            
            // Check if this is an animated emoji message
            if (message.messageType === 'animated-emoji') {
                return (
                  <AnimatedEmojiMessage
                    message={message}
                    isCurrentUser={isCurrentUser}
                    formatMessageTime={formatMessageTime}
                  />
                );
              }
            
            // Regular message rendering
            return (
                <View style={[
                  styles.messageContainer,
                  isCurrentUser ? styles.currentUserMessageContainer : styles.otherUserMessageContainer
                ]}>
                  <TouchableOpacity 
                    onLongPress={() => {
                        if (longPressedMessage === message.id) {
                          setLongPressedMessage(null);
                        } else if (isCurrentUser) {
                          setLongPressedMessage(message.id);
                        }
                      }}
                    activeOpacity={0.8}
                    style={[
                      styles.messageBubble, 
                      isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                    ]}
                  >
                    <Text style={[
                      styles.messageText, 
                      isCurrentUser ? styles.currentUserText : styles.otherUserText
                    ]}>
                      {message.text}
                    </Text>
                    
                    <View style={styles.messageFooter}>
                      <Text style={styles.messageTime}>
                        {formatMessageTime(message.createdAt)}
                      </Text>
                      
                      {isCurrentUser && (
                        <>
                          {longPressedMessage === message.id ? (
                            <View style={{flexDirection: 'row', marginLeft: 4}}>
                            <TouchableOpacity onPress={() => {
                            // Set the input message to the selected message for editing
                            setInputMessage(message.text);
                            // Save the message ID being edited
                            setEditingMessageId(message.id);
                            // Close the long press menu
                            setLongPressedMessage(null);
                            }} style={{marginHorizontal: 6}}>
                            <Ionicons name="pencil" size={16} color="#999" />
                            </TouchableOpacity>
                              <TouchableOpacity onPress={() => {
                                deleteMessage(message.id);
                                setLongPressedMessage(null);
                              }} style={{marginHorizontal: 6}}>
                                <Ionicons name="trash" size={16} color="#999" />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View style={styles.statusIndicator}>
                              <MessageStatusIndicator status={message.status} />
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
          }}
        contentContainerStyle={styles.messageList}
        onEndReached={() => {
          // Mark messages as read again when scrolling to the end
          markMessagesAsRead();
        }}
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
          
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={sendMessage}
            disabled={!inputMessage.trim()}
          >
            <Ionicons 
              name="send" 
              size={24} 
              color={inputMessage.trim() ? "#FF6B6B" : "#ccc"} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {editingMessageId && (
        <View style={styles.editingIndicator}>
            <Text style={styles.editingText}>Editing message</Text>
            <TouchableOpacity onPress={() => {
            setEditingMessageId(null);
            setInputMessage('');
            }}>
            <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
        </View>
        )}
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
    marginTop: 35,
  },
  backButton: {
    padding: 10,
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
    minWidth: 80,
  },
  currentUserBubble: {
    backgroundColor: '#FF6B6B',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 2,
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#000',
  },
  animatedEmoji: {
    fontSize: 60,
    padding: 10,
    alignSelf: 'center'
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.4)',
    marginRight: 4,
  },
  statusIndicator: {
    marginLeft: 2,
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
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    padding: 8,
  },
  editingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 5,
    backgroundColor: '#f5f5f5',
  },
  editingText: {
    fontSize: 12,
    color: '#666',
  }
});

export default ChatScreen;