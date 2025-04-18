// components/live-love/SpeedDating/SpeedDatingChatRoom.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Animated, 
  Easing,
  TouchableWithoutFeedback,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../SpeedDatingMode';
import ChatScreen from '../../chat/ChatScreen';
import { useAuthContext } from '../../../components/auth/AuthProvider';
import { 
  doc, 
  onSnapshot, 
  deleteDoc,
  collection, 
  getDocs, 
  writeBatch,
  query,  // Add this
  where   // Add this
} from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';

const { width, height } = Dimensions.get('window');

interface SpeedDatingChatRoomProps {
  matchId: string;
  match: Match;
  timeLeft: number;
  miniOverlayVisible: boolean;
  onEndChat: () => void;
  onContinueChat: () => void;
  onBack: () => void;
}

export default function SpeedDatingChatRoom({ 
  matchId, 
  match, 
  timeLeft, 
  miniOverlayVisible,
  onEndChat, 
  onContinueChat, 
  onBack 
}: SpeedDatingChatRoomProps) {
  const [isOverlayMinimized, setIsOverlayMinimized] = useState(false);
  const overlayPosition = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const overlayScale = React.useRef(new Animated.Value(1)).current;
  const { user } = useAuthContext();
  const currentUserId = user?.uid;
  const isCurrentUserSender = true;
  const [isBeingRejected, setIsBeingRejected] = useState(false);

  // Add enhanced rejection detection with multiple methods
  useEffect(() => {
    if (!matchId || !user) return;
    
    const unsubscribe = onSnapshot(
      doc(firestore, 'speedDatingConnections', matchId),
      { includeMetadataChanges: true },
      async (snapshot) => {
        if (!snapshot.exists()) {
          // Check match creation events
          const matchEventsRef = collection(firestore, 'speedDatingConnections', matchId, 'matchEvents');
          const matchEventsQuery = query(
            matchEventsRef, 
            where('status', '==', 'permanent_match_created'),
            where('preventAutoExit', '==', true)
          );
          
          const matchEventsSnapshot = await getDocs(matchEventsQuery);
          
          // Verify current user is part of the match
          const shouldPreventExit = matchEventsSnapshot.docs.some(doc => {
            const eventData = doc.data();
            return eventData.users?.includes(user.uid);
          });
          
          if (!shouldPreventExit) {
            console.log("Room deleted, exiting immediately");
            onBack();
          }
          return;
        }
        
        // Existing rejection detection
        const data = snapshot.data();
        if (data?.status === 'rejected' || data?.rejectedBy) {
          console.log("Room rejection detected, exiting immediately");
          onBack();
        }
      },
      (error) => {
        console.error("Error in room listener:", error);
        onBack();
      }
    );
    
    return () => unsubscribe();
  }, [matchId, user]);

  console.log("BREAKPOINT 4: CHAT ROOM MAPPING:", {
    matchId,
    isCurrentUserSender,
    currentUserId,
    matchUserId: match.id
  });

  // Debug in ChatScreen.tsx 
  console.log(`DEBUG CHATSCREEN: matchId=${matchId}, collection path determined later`);
  
  // Format the time remaining
  const formatTimeLeft = () => {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    // Add Math.floor here to fix the decimals:
    const seconds = Math.floor(timeLeft % 60);
    
    if (hours > 0) {
      return `${hours}h : ${minutes}m : ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m : ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  // Minimize overlay animation
  const minimizeOverlay = () => {
    Animated.parallel([
      Animated.timing(overlayPosition, {
        toValue: { x: -width / 2 + 70, y: -height / 2 + 70 },
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(overlayScale, {
        toValue: 0.4,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOverlayMinimized(true);
    });
  };
  
  // Maximize overlay animation
  const maximizeOverlay = () => {
    setIsOverlayMinimized(false);
    Animated.parallel([
      Animated.timing(overlayPosition, {
        toValue: { x: 0, y: 0 },
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(overlayScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // Handle background press
  const handleBackgroundPress = () => {
    if (!isOverlayMinimized) {
      minimizeOverlay();
    }
  };

  const handleImmediateRoomDeletion = async () => {
    // Store the match ID first for cleanup
    const roomIdToDelete = matchId;
    
    // Call parent's onEndChat to trigger rejection screen navigation
    onEndChat();
    
    // Delete in background without waiting
    setTimeout(async () => {
      try {
        // 1. Delete all messages first
        const messagesRef = collection(firestore, 'speedDatingConnections', roomIdToDelete, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        if (!messagesSnapshot.empty) {
          const batch = writeBatch(firestore);
          messagesSnapshot.docs.forEach(messageDoc => {
            batch.delete(messageDoc.ref);
          });
          await batch.commit();
          console.log(`Deleted ${messagesSnapshot.size} messages from room ${roomIdToDelete}`);
        }
        
        // 2. Delete any subcollections (like rejectionEvents)
        const eventsRef = collection(firestore, 'speedDatingConnections', roomIdToDelete, 'rejectionEvents');
        const eventsSnapshot = await getDocs(eventsRef);
        
        if (!eventsSnapshot.empty) {
          const batch = writeBatch(firestore);
          eventsSnapshot.docs.forEach(eventDoc => {
            batch.delete(eventDoc.ref);
          });
          await batch.commit();
        }
        
        // 3. Delete the room document itself
        await deleteDoc(doc(firestore, 'speedDatingConnections', roomIdToDelete));
        console.log(`Room ${roomIdToDelete} deleted immediately`);
      } catch (error) {
        console.error('Room deletion error:', error);
      }
    }, 100);
  };
  
  
  // Render the mini reminder overlay
  const renderMiniReminder = () => (
    <TouchableOpacity 
      style={styles.miniReminderContainer}
      onPress={maximizeOverlay}
    >
      <Text style={styles.miniReminderText}>
        {formatTimeLeft()} left
      </Text>
    </TouchableOpacity>
  );

  const matchUserId = match.id;

  // Add debug output:
  console.log('SpeedDatingChatRoom: Checking message visibility for:', {
    currentUserId: user?.uid,
    matchUserId: match.id,
    matchId
  });
  
  return (
    <View style={styles.container}>
      {/* Main chat content */}
      <TouchableWithoutFeedback onPress={handleBackgroundPress}>
        <View style={styles.chatContainer}>
        <ChatScreen 
          matchId={matchId}
          otherUser={{
            id: match.id,
            displayName: match.displayName,
            photoURL: match.photoURL,
            status: 'Online'
          }}
          speedDatingMode={true}
          forcedCollectionPath="speedDatingConnections"
          onGoBack={onBack}
        />
        </View>
      </TouchableWithoutFeedback>
      
      {/* Floating timer overlay */}
      {isOverlayMinimized ? (
        renderMiniReminder()
      ) : (
        <Animated.View 
          style={[
            styles.timerOverlay,
            {
              transform: [
                { translateX: overlayPosition.x },
                { translateY: overlayPosition.y },
                { scale: overlayScale }
              ]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.closeOverlay}
            onPress={minimizeOverlay}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.timerTitle}>Time Remaining</Text>
          <Text style={styles.timerText}>{formatTimeLeft()}</Text>
          
          <Text style={styles.timerDescription}>
          Your conversation with {match.displayName.split(' ')[0]} is ticking away! Keep the sparks alive and make every moment count. 💫💕
          </Text>
          
          {/* Action buttons at bottom */}
          <View style={styles.chatActionButtons}>
          <TouchableOpacity 
          style={styles.endChatButton}
          onPress={handleImmediateRoomDeletion}
        >
          <Image source={require('../../../assets/images/main/LoveError.png')} 
            style={styles.actionIcon}
            resizeMode="contain"
          />
          <Text style={styles.endChatText}>Pop Balloon</Text>
        </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.continueChatButton}
              onPress={onContinueChat}
            >
              <Image 
                source={require('../../../assets/images/main/LoveSuccess.png')} 
                style={styles.actionIcon}
                resizeMode="contain"
              />
              <Text style={styles.continueChatText}>Continue Permanently</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
      
      {/* Mini reminder */}
      {miniOverlayVisible && !isOverlayMinimized && renderMiniReminder()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    marginLeft: -20,
    marginRight: -20,
  },
  backButton: {
    marginRight: 10,
  },
  chatHeaderText: {
    color: '#F2F1ED',
    fontWeight: 'bold',
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  chatActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 40,
    width: '80%',
  },
  endChatButton: {
    alignItems: 'center',
  },
  continueChatButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 35,
    height: 35,
    marginHorizontal: 25,
  },
  endChatText: {
    fontSize: 8,
    color: '#FF3B30',
    marginTop: 5,
  },
  continueChatText: {
    fontSize: 8,
    color: '#FF6B6B',
    marginTop: 5,
  },
  timerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: width * 0.8,
    marginLeft: -(width * 0.8 / 2),
    marginTop: -(width * 0.8 / 2),
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  closeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  timerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  timerText: {
    color: '#FF6B6B',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  timerDescription: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  continueButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  continueGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  miniReminderContainer: {
    position: 'absolute',
    top: 60,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 20,
    zIndex: 100,
  },
  miniReminderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});