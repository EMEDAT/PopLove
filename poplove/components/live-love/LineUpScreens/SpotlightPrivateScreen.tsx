// components/live-love/LineUpScreens/SpotlightPrivateScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  SafeAreaView,
  FlatList,
  AppState,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { useAuthContext } from '../../auth/AuthProvider';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { debugLog } from './utils';
import ChatInputBar from './ChatInputBar';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default function SpotlightPrivateScreen() {
  debugLog('PrivateScreen', 'Rendering SpotlightPrivateScreen');

  const { user } = useAuthContext();
  
  const { 
    sessionId, 
    spotlightTimeLeft, 
    popCount, 
    likeCount, 
    setStep,
    messages,
    sendMessage,
    syncWithServerTime,
    markUserActivity,
    checkUserMatches,
    setSessionId, 
  } = useLineUp();

  // Component state
  const [showCountdown, setShowCountdown] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [stats, setStats] = useState({
    likes: likeCount || 0,
    pops: popCount || 0,
    viewCount: 0
  });
  const [timerHandled, setTimerHandled] = useState(false);
  const messageListRef = useRef<FlatList<any>>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const [viewCount, setViewCount] = useState<number>(0);
  const [exitConfirmVisible, setExitConfirmVisible] = useState(false);

  // Log component lifecycle
  useEffect(() => {
    debugLog('PrivateScreen', 'Component mounted', { 
      userId: user?.uid,
      sessionId,
      timeLeft: spotlightTimeLeft
    });
    
    // Verify current user is actually current contestant
    verifyCurrentContestantStatus();
    
    // Initial server sync
    syncWithServerTime();
    markUserActivity();
    
    // Continuous time sync - we need precise timing for the contestant
    const syncInterval = setInterval(() => {
      const now = Date.now();
      // Only sync every 30 seconds to avoid excessive calls
      if (now - lastSyncTimeRef.current >= 30000) {
        lastSyncTimeRef.current = now;
        syncWithServerTime();
        markUserActivity();
      }
    }, 30000);
    
    // Setup app state monitoring
    const subscription = AppState.addEventListener('change', nextAppState => {
      debugLog('PrivateScreen', `App state changed: ${appStateRef.current} -> ${nextAppState}`);
      appStateRef.current = nextAppState;
      
      // When returning to active state, sync immediately
      if (nextAppState === 'active') {
        syncWithServerTime();
        markUserActivity();
      }
    });
    
    return () => {
      debugLog('PrivateScreen', 'Component unmounted');
      clearInterval(syncInterval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!sessionId || !user) return;
    
    const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', user.uid);
    
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.viewCount !== undefined) {
          setViewCount(data.viewCount);
        }
      }
    });
    
    return () => unsubscribe();
  }, [sessionId, user?.uid]);

  // Update stats when props change
  useEffect(() => {
    setStats({
      likes: likeCount || 0,
      pops: popCount || 0,
      viewCount: stats.viewCount
    });
    
    debugLog('PrivateScreen', 'Stats updated', { likes: likeCount, pops: popCount });
  }, [likeCount, popCount]);

  // Auto-scroll to bottom of message list when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && messageListRef.current) {
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Handle timer expiration
  useEffect(() => {
    if (spotlightTimeLeft <= 0 && !timerHandled) {
      debugLog('PrivateScreen', 'Timer reached zero, checking for matches');
      setTimerHandled(true);
      
      // Check for matches when timer expires
      const checkAndNavigate = async () => {
        try {
          await checkUserMatches();
        } catch (error) {
          debugLog('PrivateScreen', 'Error checking matches on timer expiration', error);
          // Fallback to lineup screen on error
          setStep('lineup');
        }
      };
      
      // Execute after brief delay to avoid race conditions
      setTimeout(checkAndNavigate, 300);
    }
  }, [spotlightTimeLeft, timerHandled]);

  // Verify current user is actually the current contestant
  const verifyCurrentContestantStatus = async () => {
    if (!sessionId || !user) return;
    
    try {
      debugLog('PrivateScreen', 'Verifying current contestant status');
      
      // Get user gender
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (!userDoc.exists()) return;
      
      const userGender = userDoc.data().gender || '';
      const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
      
      // Get session data
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
      if (!sessionDoc.exists()) return;
      
      const currentContestantId = sessionDoc.data()[genderField];
      
      // If user is not actually the current contestant, go back to lineup screen
      if (currentContestantId !== user.uid) {
        debugLog('PrivateScreen', 'User is not the current contestant, redirecting', {
          userId: user.uid,
          currentContestantId
        });
        
        Alert.alert(
          'Session Update',
          'You are no longer the featured contestant.',
          [{ text: 'OK', onPress: () => setStep('lineup') }]
        );
      } else {
        debugLog('PrivateScreen', 'Verified user is current contestant');
      }
    } catch (error) {
      debugLog('PrivateScreen', 'Error verifying contestant status', error);
    }
  };

  // Format timer display
  const formatTimeLeft = () => {
    const hours = Math.floor(spotlightTimeLeft / 3600);
    const minutes = Math.floor((spotlightTimeLeft % 3600) / 60);
    const seconds = spotlightTimeLeft % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    try {
      debugLog('PrivateScreen', 'Sending message');
      await sendMessage(text);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        messageListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      debugLog('PrivateScreen', 'Error sending message', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  // Handle exit/cancel spotlight
  const handleExitSpotlight = () => {
    Alert.alert(
      'Exit Spotlight?',
      'Are you sure you want to exit the spotlight? Your current session will end and any potential matches will be lost.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Exit Spotlight',
          style: 'destructive',
          onPress: () => {
            debugLog('PrivateScreen', 'User chose to exit spotlight');
            // Return to selection screen
            setStep('selection');
          }
        }
      ]
    );
  };

  // Render message items
  const renderMessageItem = ({ item, index }: { item: any, index: number }) => {
    const isCurrentUser = item.senderId === user?.uid;
    
    return (
      <View 
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
        ]}
      >
        {!isCurrentUser && (
          <Image 
            source={{ uri: item.senderPhoto || 'https://via.placeholder.com/40' }} 
            style={styles.senderAvatar} 
          />
        )}
        
        <View style={[
          styles.messageBubble,
          isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
        ]}>
          {!isCurrentUser && (
            <Text style={styles.senderName}>{item.senderName}</Text>
          )}
          
          <Text style={styles.messageText}>
            {item.text}
          </Text>
          
          <Text style={styles.messageTime}>
            {item.timestamp?.toDate 
              ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <TouchableOpacity 
              style={styles.exitButton}
              onPress={handleExitSpotlight}
            >
              <Ionicons name="close-circle" size={24} color="#FF6B6B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>In The Spotlight</Text>
            {showCountdown && (
              <TouchableOpacity 
                style={styles.countdownContainer}
                onPress={() => setShowCountdown(false)}
              >
                <Ionicons name="time-outline" size={16} color="#FF6B6B" />
                <Text style={styles.countdownText}>{formatTimeLeft()}</Text>
                <TouchableOpacity 
                  onPress={() => setShowCountdown(false)}
                >
                  <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.headerSubtitle}>
            You are in the spotlight! Others can see and interact with your profile.
          </Text>
        </View>
        
        {!showChat ? (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.profileContainer}>
              <Image 
                source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }} 
                style={styles.profileImage}
                onError={(e) => debugLog('PrivateScreen', 'Error loading profile image', e.nativeEvent)}
              />
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Image 
                    source={require('../../../assets/images/main/LoveSuccess.png')} 
                    style={styles.actionIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.statValue}>{stats.likes}</Text>
                  <Text style={styles.statLabel}>Likes</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Image 
                    source={require('../../../assets/images/main/LoveError.png')} 
                    style={styles.actionIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.statValue}>{stats.pops}</Text>
                  <Text style={styles.statLabel}>Pops</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Ionicons name="eye" size={30} color="#0A84FF" />
                  <Text style={styles.statValue}>{viewCount}</Text>
                  <Text style={styles.statLabel}>Views</Text>
                </View>
              </View>
              
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Countdown timer</Text>
                <View style={styles.timerDigits}>
                  <View style={styles.timerDigit}>
                    <Text style={styles.digit}>{Math.floor(spotlightTimeLeft / 3600).toString().padStart(2, '0')}</Text>
                    <Text style={styles.digitLabel}>hr</Text>
                  </View>
                  <View style={styles.timerDigit}>
                    <Text style={styles.digit}>{Math.floor((spotlightTimeLeft % 3600) / 60).toString().padStart(2, '0')}</Text>
                    <Text style={styles.digitLabel}>min</Text>
                  </View>
                  <View style={styles.timerDigit}>
                    <Text style={styles.digit}>{(spotlightTimeLeft % 60).toString().padStart(2, '0')}</Text>
                    <Text style={styles.digitLabel}>sec</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.sampleMessageContainer}
                onPress={() => {
                  debugLog('PrivateScreen', 'Opening chat view');
                  setShowChat(true);
                }}
              >
                <Image 
                  source={{ uri: user?.photoURL || 'https://via.placeholder.com/30' }} 
                  style={styles.messageSenderImage} 
                />
                <View style={styles.sampleMessageContent}>
                  <Text style={styles.sampleMessageText}>Tap to open the live chat...</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleExitSpotlight}
              >
                <Text style={styles.cancelButtonText}>Exit Spotlight</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.chatWrapper}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderText}>Live Chat</Text>
              <TouchableOpacity 
                onPress={() => setShowChat(false)}
                style={styles.closeChat}
              >
           <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.messagesContainer}>
              {messages.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={50} color="#ddd" />
                  <Text style={styles.emptyText}>No messages yet</Text>
                </View>
              ) : (
                <FlatList
                  ref={messageListRef}
                  data={messages}
                  keyExtractor={(item, index) => `${item.id || 'msg'}_${index}_${Math.random().toString(36).substring(7)}`}
                  renderItem={renderMessageItem}
                  contentContainerStyle={styles.messagesList}
                  onContentSizeChange={() => {
                    messageListRef.current?.scrollToEnd({ animated: false });
                  }}
                />
              )}
            </View>
            
            <ChatInputBar onSendMessage={handleSendMessage} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exitButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    flex: 1,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  actionIcon: {
    width: 30,
    height: 30,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E4',
    padding: 8,
    borderRadius: 20,
    gap: 5,
  },
  countdownText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 12,
  },
  profileContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  profileImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  aboutMeButton: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 50,
    alignItems: 'center',
    width: '90%',
  },
  aboutMeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    padding: 10,
  },
  bioPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 24,
    paddingVertical: 16,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  timerDigits: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timerDigit: {
    marginHorizontal: 5,
    alignItems: 'center',
  },
  digit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  digitLabel: {
    fontSize: 12,
    color: '#999',
  },
  liveChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  liveChatIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE4E4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  liveChatText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  sampleMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageSenderImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  sampleMessageContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
  },
  sampleMessageText: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
    marginBottom: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  // Chat view styles
  chatWrapper: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    padding: 15,
    position: 'relative',
  },
  chatHeaderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeChat: {
    position: 'absolute',
    right: 10,
    top: 12,
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messagesList: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '80%',
  },
  currentUserContainer: {
    alignSelf: 'flex-end',
  },
  otherUserContainer: {
    alignSelf: 'flex-start',
  },
  senderAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: '#FFE4E4',
  },
  otherUserBubble: {
    backgroundColor: '#f0f0f0',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
});