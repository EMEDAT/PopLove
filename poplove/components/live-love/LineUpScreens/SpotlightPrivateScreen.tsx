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
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { useAuthContext } from '../../auth/AuthProvider';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { PrivateProfileDetailsModal } from '../../../components/shared/PrivateProfileDetailsModal';
import * as LineupService from '../../../services/lineupService';

// Import the ChatInputBar for fixed-height input
import ChatInputBar from './ChatInputBar';

// TESTING CONFIGURATION - CHANGE BEFORE PRODUCTION
const SPOTLIGHT_TIMER_SECONDS = 4 * 60 * 60; // 10 minutes for testing (should be 4 * 60 * 60)

// Create a logger function for this component
const logPrivate = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [SpotlightPrivateScreen] 👑 ${message}`, data ? data : '');
};

interface SpotlightPrivateScreenProps {
  onBack?: () => void;
}

export default function SpotlightPrivateScreen({ onBack }: SpotlightPrivateScreenProps = {}) {
  const { user } = useAuthContext();
  
  const { 
    goBack, 
    loading, 
    sessionId, 
    spotlightTimeLeft, 
    popCount, 
    likeCount, 
    setStep,
    messages,
    sendMessage,
    setSpotlightTimeLeft,
    setSelectedMatches,
    isCurrentUser,
  } = useLineUp();

  console.log(`[PRIVATE] Rendering private screen, isCurrentUser=${isCurrentUser}, userId=${user?.uid}`);

  logPrivate('Component rendering');

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  const [showCountdown, setShowCountdown] = useState(true);
  const [stats, setStats] = useState({
    likes: likeCount || 0,
    pops: popCount || 0,
    viewCount: 0
  });
  const [timerHandled, setTimerHandled] = useState(false);
  const [statSubscribed, setStatSubscribed] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const flatListRef = useRef<FlatList<any>>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const hasLoggedCompletionRef = useRef(false);

  // Format time left
  const formatTimeLeft = () => {
    const hours = Math.floor(spotlightTimeLeft / 3600);
    const minutes = Math.floor((spotlightTimeLeft % 3600) / 60);
    const seconds = spotlightTimeLeft % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Verify user is really the current contestant
  useEffect(() => {
    const verifyCurrentContestantStatus = async () => {
      if (!sessionId || !user) return;
      
      try {
        // Add delay to allow Firestore updates to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) return;
        
        const userGender = userDoc.data().gender || '';
        const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
        
        const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
        if (!sessionDoc.exists()) return;
        
        const currentContestantId = sessionDoc.data()[genderField];
        
        // Only redirect if we're DEFINITELY not the current contestant
        // and context also says we're not the current user
        if (currentContestantId !== user.uid && !isCurrentUser) {
          logPrivate('User is not the actual current contestant, redirecting to lineup screen');
          goBack(); // Return to lineup screen instead of showing private screen incorrectly
        }
      } catch (error) {
        logPrivate('Error verifying contestant status:', error);
      }
    };
    
    verifyCurrentContestantStatus();
  }, [sessionId, user, isCurrentUser]);

  // Add this useEffect to track and log completion:
    useEffect(() => {
      if (spotlightTimeLeft <= 0 && !hasLoggedCompletionRef.current) {
        hasLoggedCompletionRef.current = true;
        
        logPrivate(`Spotlight time reached zero for user ${user?.uid}`);
        
        // Log completion event
        if (sessionId && user) {
          try {
            // Record completed state for analytics
            const completionRef = doc(
              firestore, 
              'lineupSessions', 
              sessionId, 
              'completions', 
              user.uid
            );
            
            setDoc(completionRef, {
              userId: user.uid,
              timestamp: serverTimestamp(),
              timeExpired: true
            }, { merge: true });
            
            logPrivate('Logged completion event to Firestore');
          } catch (error) {
            logPrivate('Error logging completion event:', error);
          }
        }
      }
    }, [spotlightTimeLeft, sessionId, user]);

  useEffect(() => {
    if (spotlightTimeLeft <= 0 && timerHandled === false) {
      logPrivate('Timer reached zero, checking for matches');
      setTimerHandled(true);
      
      // Check for matches when timer expires
      const checkAndNavigate = async () => {
        try {
          // Get user matches
          const matchesList = await LineupService.getUserMatches(sessionId || '', user?.uid || '');
          logPrivate(`Found ${matchesList.length} matches on timer expiration`);
          
          if (matchesList.length > 0) {
            // User has matches, go to matches screen
            setSelectedMatches(matchesList);
            setStep('matches');
          } else {
            // No matches, go to no-matches screen
            setStep('no-matches');
          }
        } catch (error) {
          console.error('Error checking matches:', error);
          // Fallback to lineup screen on error
          setStep('lineup');
        }
      };
      
      // Execute with small delay to avoid race conditions
      setTimeout(() => {
        checkAndNavigate();
      }, 300);
    }
  }, [spotlightTimeLeft, timerHandled, setStep, sessionId, user]);

  // Add this useEffect right after the existing timer useEffect
  useEffect(() => {
    const calculateRemainingTime = async () => {
      if (!sessionId || !user) return;
      
      try {
        // Get user gender
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) return;
        
        const userGender = userDoc.data().gender || '';
        const rotationTimeField = `${userGender}LastRotationTime`;
        
        // Get session with proper gender field
        const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
        if (!sessionDoc.exists()) return;
        
        const lastRotationTime = sessionDoc.data()[rotationTimeField]?.toDate();
        if (!lastRotationTime) return;
        
        // Calculate time exactly
        const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
        const remainingTime = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
        
        // Update correct timer based on gender
        setSpotlightTimeLeft(remainingTime);
      } catch (error) {
        console.error('Error calculating remaining time:', error);
      }
    };
    
    calculateRemainingTime();
    
    // Force refresh timer every minute to prevent drift
    const refreshInterval = setInterval(calculateRemainingTime, 60000);
    return () => clearInterval(refreshInterval);
  }, [sessionId, user]);

  // Set up real-time stats updates
  useEffect(() => {
    if (!sessionId || !user || statSubscribed) {
      logPrivate('Cannot set up stats listener - missing sessionId, user, or already subscribed', {
        hasSessionId: !!sessionId,
        hasUser: !!user,
        statSubscribed
      });
      return;
    }
    
    logPrivate(`Setting up stats listener for user ${user.uid} in session ${sessionId}`);
    setStatSubscribed(true);
    
    const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', user.uid);
    
    const unsubscribe = onSnapshot(statsRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          logPrivate('Stats update received', {
            likeCount: data.likeCount || 0,
            popCount: data.popCount || 0,
            viewCount: data.viewCount || 0
          });
          
          setStats({
            likes: data.likeCount || 0,
            pops: data.popCount || 0,
            viewCount: data.viewCount || 0
          });
          
          // Check for elimination
          if (data.popCount >= 20) {
            logPrivate('User eliminated - pop count exceeded 20');
            Alert.alert(
              "You've been eliminated",
              "You received too many pops and have been eliminated from this lineup.",
              [{ 
                text: "OK",
                onPress: () => {
                  logPrivate('Elimination alert acknowledged, navigating to eliminated screen');
                  setStep('eliminated');
                }
              }]
            );
          }
        } else {
          logPrivate('Stats document does not exist');
        }
      },
      (error) => {
        logPrivate('Error in stats snapshot listener', { error });
      }
    );
    
    return () => {
      logPrivate('Removing stats listener');
      unsubscribe();
    };
  }, [sessionId, user, statSubscribed, setStep]);

  // Handle sending a message
  const handleSendMessage = async (text: string) => {
    try {
      await sendMessage(text);
      
      // Scroll to bottom after sending
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({animated: true});
        }
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Render message items
  const renderMessageItem = ({ item, index }: { item: any, index: number }) => {
    const isCurrentUser = item.senderId === user?.uid;
    
    return (
      <View 
        key={`${item.id || 'default'}_${index}_${Math.random().toString(36).substring(7)}`} 
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>In The Spotlight</Text>
          {showCountdown && (
            <TouchableOpacity 
              style={styles.countdownContainer}
              onPress={() => {
                logPrivate('Countdown container pressed, hiding countdown');
                setShowCountdown(false);
              }}
            >
              <Ionicons name="time-outline" size={16} color="#FF6B6B" />
              <Text style={styles.countdownText}>{formatTimeLeft()}</Text>
              <TouchableOpacity 
                onPress={() => {
                  logPrivate('Close countdown button pressed');
                  setShowCountdown(false);
                }}
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
        <View style={styles.profileContainer}>
          <Image 
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }} 
            style={styles.profileImage}
            onError={(e) => logPrivate('Error loading profile image', { error: e.nativeEvent })}
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
              <Text style={styles.statValue}>{stats.viewCount}</Text>
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
            logPrivate('Sample message container pressed, switching to chat view');
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
        </View>
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
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => `${item.id || 'default'}_${index}_${Math.random().toString(36).substring(7)}`}
                renderItem={renderMessageItem}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => {
                  if (flatListRef.current) {
                    flatListRef.current.scrollToEnd({animated: false});
                  }
                }}
              />
            )}
          </View>
          
          {/* Fixed-height ChatInputBar */}
          <ChatInputBar onSendMessage={handleSendMessage} />
        </View>
      )}
      
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      )}
          {showProfileModal && (
      <PrivateProfileDetailsModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={{
          id: user?.uid || '',
          displayName: user?.displayName || 'User',
          photoURL: user?.photoURL || ''
        }}
      />
    )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    marginLeft: -20,
    marginRight: -20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 30,
    paddingBottom: 20,
    marginTop: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
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
    padding: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#FF6B6B',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
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
    marginBottom: 94,
    marginTop: 60,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  messageSenderImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  sampleMessageContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 8,
  },
  sampleMessageText: {
    fontSize: 12,
    color: '#666',
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
    marginHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 10,
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