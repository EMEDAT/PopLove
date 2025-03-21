// components/live-love/SpeedDating/SpeedDatingContainer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  QueryDocumentSnapshot,
  doc, 
  limit,
  setDoc,
  getDoc, 
  updateDoc,
  deleteDoc,
  writeBatch,
  DocumentData,
  DocumentSnapshot,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { router } from 'expo-router';

// Import child components
import SearchingScreen from './SpeedDatingScreens/SearchingScreen';
import MatchesFoundOverlay from './SpeedDatingScreens/MatchesFoundOverlay';
import NoUsersAvailableOverlay from './SpeedDatingScreens/NoUsersAvailableOverlay';
import ResultsScreen from './SpeedDatingScreens/ResultsScreen';
import DetailScreen from './SpeedDatingScreens/DetailScreen';
import RejectionScreen from './SpeedDatingScreens/RejectionScreen';
import SpeedDatingChatRoom from './SpeedDatingScreens/SpeedDatingChatRoom';
import CongratulationsScreen from './SpeedDatingScreens/CongratulationsScreen';

// Types
export interface Match {
  id: string;
  displayName: string;
  ageRange: string;
  photoURL: string;
  matchPercentage: number;
  // Add the scores property to match your data structure
  scores: {
    interests: number;
    lifestyle: number;
    age: number;
    location: number;
  };
}

type SpeedDatingStep = 'searching' | 'results' | 'detail' | 'rejection' | 'chat' | 'congratulations';

interface SpeedDatingContainerProps {
  onBack: () => void;
}

export default function SpeedDatingContainer({ onBack }: SpeedDatingContainerProps) {
  const { user } = useAuthContext();
  const [currentStep, setCurrentStep] = useState<SpeedDatingStep>('searching');
  const [timeLeft, setTimeLeft] = useState(300); // in seconds
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchesFoundVisible, setMatchesFoundVisible] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [chatTimeLeft, setChatTimeLeft] = useState(4 * 60 * 60); // 4 hours in seconds
  const [miniOverlayVisible, setMiniOverlayVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [noUsersAvailable, setNoUsersAvailable] = useState(false);
  
  // Timer refs
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reminderTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (currentStep === 'results') {
      setMatchesFoundVisible(false);
    }
  }, [currentStep]);

  const getOppositeGender = (gender: string): string => {
    return gender === 'male' ? 'female' : 'male';
  };

  // Add at beginning of SpeedDatingContainer function for session persistence
  useEffect(() => {
    const restoreSpeedDatingSession = async () => {
      if (!user) return;
      
      try {
        // Check for active speed dating session created very recently
        const sessionsRef = collection(firestore, 'speedDatingSessions');
        const q = query(
          sessionsRef,
          where('userId', '==', user.uid),
          where('status', '==', 'searching'),
          where('createdAt', '>', new Date(Date.now() - 5 * 60 * 1000)) // Only consider sessions from last 5 minutes
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          findMatches(); // Skip search timer, immediately find matches
        }
      } catch (error) {
        console.error('Error restoring speed dating session:', error);
        // Ensure you reset to selection mode if restoration fails
        setCurrentStep('searching');
      }
    };
    
    restoreSpeedDatingSession();
  }, [user]);

// Add this after your other useEffect hooks
useEffect(() => {
  // Only set up listener in chat mode with a valid room ID
  if (currentStep === 'chat' && chatRoomId) {
    console.log(`Setting up rejection listener for room: ${chatRoomId}`);
    
    // Listen for changes to the room document
    const unsub = onSnapshot(doc(firestore, 'speedDatingConnections', chatRoomId), (snapshot) => {
      // If the document was deleted or marked as rejected
      if (!snapshot.exists() || (snapshot.exists() && snapshot.data()?.status === 'rejected')) {
        console.log('Other user rejected or deleted the chat - returning to selection');
        
        // The other user has popped the balloon
        Alert.alert(
          'Chat Ended',
          'The other user has ended this chat session.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear timers
                if (chatTimerRef.current) clearInterval(chatTimerRef.current);
                if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
                
                // Go back to selection screen IMMEDIATELY
                handleBackNavigation();
              }
            }
          ]
        );
      }
    }, 
    // Add error handling for the listener
    (error) => {
      console.error("Error in chat room listener:", error);
      // If listening fails (e.g., document deleted), go back to selection
      handleBackNavigation();
    });
    
    // Cleanup listener on unmount or mode change
    return () => unsub();
  }
}, [currentStep, chatRoomId, user]);
  const handleOverlayDismiss = () => {
    console.log("Overlay auto-dismissed");
    setNoUsersAvailable(false);
    // Try finding matches again instead of navigating back
    findMatches();
  };

  // Handler to navigate back to LiveLove screen
  const handleBackNavigation = () => {
    // Stop all timers
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    
    // Reset all state
    setMatches([]);
    setChatRoomId(null);
    setSelectedMatch(null);
    setMatchesFoundVisible(false);
    setNoUsersAvailable(false);
    setChatTimeLeft(4 * 60 * 60);
    setMiniOverlayVisible(false);
    setTimeLeft(300);
    
    // IMPORTANT: Clean up speed dating session in Firestore
    // to prevent it from appearing in future searches
    if (user) {
      try {
        // Find and delete the user's active speed dating sessions
        const cleanupSessions = async () => {
          const sessionsRef = collection(firestore, 'speedDatingSessions');
          const q = query(
            sessionsRef,
            where('userId', '==', user.uid),
            where('status', '==', 'searching')
          );
          
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            // Create a batch to delete all sessions
            const batch = writeBatch(firestore);
            
            snapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`Cleaned up ${snapshot.size} speed dating sessions`);
          }
        };
        
        // Execute cleanup, but don't wait for it to navigate back
        cleanupSessions().catch(err => 
          console.error('Error cleaning up speed dating sessions:', err)
        );
      } catch (error) {
        console.error('Error in session cleanup:', error);
      }
    }
    
    // Call the parent's onBack to return to the selection screen
    onBack();
  };

  // Clear up resources on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (chatTimerRef.current) clearInterval(chatTimerRef.current);
      if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    };
  }, []);
  
  // Start search immediately when component mounts
  useEffect(() => {
    startSearch();
  }, []);

// Start the speed dating search
const startSearch = async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    
    // FIXED: Use coarser granularity for sync groups (2-minute windows)
    const syncGroup = Math.floor(Date.now() / (2 * 60 * 1000)); 
    
    // Create a speed dating session entry with the sync group
    await addDoc(collection(firestore, 'speedDatingSessions'), {
      userId: user.uid,
      status: 'searching',
      createdAt: serverTimestamp(),
      syncGroup: syncGroup,
      preferences: {
        ageMin: 18,
        ageMax: 50,
      }
    });
    
    // Set timer for visual countdown
    setTimeLeft(300);
    
    // Set up the visual countdown timer
    searchTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (searchTimerRef.current) clearInterval(searchTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Calculate when to find matches based on sync group
    // This ensures all users in the same group run findMatches at approximately the same time
    const syncTimeOffset = (syncGroup + 1) * 30000 - Date.now() + 5000; // Add 5 seconds buffer
    
    console.log(`Will find matches in ${syncTimeOffset/1000} seconds (sync group: ${syncGroup})`);
    
    // Start finding matches at the synchronized time
    setTimeout(() => {
      findMatches();
    }, syncTimeOffset);
    
    setLoading(false);
  } catch (error) {
    console.error('Error starting speed dating search:', error);
    Alert.alert('Error', 'Failed to start speed dating. Please try again.');
    handleBackNavigation();
  }
};
  
// Advanced matching algorithm with comprehensive compatibility analysis
const findMatches = async () => {
  // Prevent running if already in results or other non-searching states
  if (!user || currentStep !== 'searching') return;
  
  // Prevent multiple simultaneous executions
  if (loading) return;
  
  try {
    setLoading(true);
    
    // First, get the user's sync group instead of just waiting
    const userSessionsRef = collection(firestore, 'speedDatingSessions');
    const userSessionQuery = query(
      userSessionsRef,
      where('userId', '==', user.uid),
      where('status', '==', 'searching'),
      limit(1)
    );
    
    const userSessionSnapshot = await getDocs(userSessionQuery);
    if (userSessionSnapshot.empty) {
      console.error('User session not found');
      return;
    }
    
    const syncGroup = userSessionSnapshot.docs[0].data().syncGroup;
    console.log(`User is in sync group: ${syncGroup}`);
    
    // The rest of your existing code continues here...
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Extract user data with defaults
    const userGender = userData.gender || '';
    const userInterests = userData.interests || [];
    const userLifestyle = userData.lifestyle || [];
    const userLocation = userData.location || '';
    const userAgeRange = userData.ageRange || '25 to 30';
    
    // Calculate user age midpoint
    const userAgeMatch = userAgeRange.match(/(\d+).*?(\d+)/);
    const userAgeMin = userAgeMatch ? parseInt(userAgeMatch[1]) : 25;
    const userAgeMax = userAgeMatch ? parseInt(userAgeMatch[2]) : 30;
    const userAgeMid = Math.floor((userAgeMin + userAgeMax) / 2);
    
    // FIXED: Query ALL active sessions without sync group filter
    const activeUsersQuery = query(
      collection(firestore, 'speedDatingSessions'),
      where('status', '==', 'searching'),
      where('userId', '!=', user.uid),
      where('createdAt', '>', new Date(Date.now() - 5 * 60 * 1000))
    );
    
    const activeUsersSnapshot = await getDocs(activeUsersQuery);
    console.log(`Total active speed dating sessions: ${activeUsersSnapshot.size}`);
    console.log(`Current user gender: ${userGender}`);
    
    // FIXED: Don't trigger overlay or return early here
    // Extract the user IDs from active sessions
    const activeUserIds = activeUsersSnapshot.docs.map(doc => doc.data().userId);
    console.log(`Found ${activeUserIds.length} active users in speed dating`);
    
    // Only fetch profiles for users with active speed dating sessions
    let snapshot: DocumentSnapshot<DocumentData>[] = [];
    if (activeUserIds.length > 0) {
      const userDocs = await Promise.all(
        activeUserIds.map(userId => getDoc(doc(firestore, 'users', userId)))
      );
      
      // Filter for completed profiles of opposite gender
      snapshot = userDocs.filter(doc => {
        if (!doc.exists()) return false;
        const data = doc.data();
        return data.gender !== userGender && data.hasCompletedOnboarding === true;
      });
      
      // FIXED: Log how many profiles match gender filter
      console.log(`Found ${snapshot.length} opposite gender profiles`);
    }
    
    // Rest of compatibility analysis remains unchanged...
    const boostScore = (score: number, factor = 1.4) => {
      return Math.min(100, Math.round(score * factor));
    };
    
    const potentialMatches = await Promise.all(snapshot.map(async (doc) => {
      // Existing match calculation code...
      const data = doc.data();
      if (!data) {
        return null; // Return null for invalid data, will be filtered out later
      }
      const matchInterests = data.interests || [];
      const matchLifestyle = data.lifestyle || [];
      const matchAgeRange = data.ageRange || '';
      const matchLocation = data.location || '';
      
      // Parse match's age range
      const matchAgeMatch = matchAgeRange.match(/(\d+).*?(\d+)/);
      const matchAgeMin = matchAgeMatch ? parseInt(matchAgeMatch[1]) : 25;
      const matchAgeMax = matchAgeMatch ? parseInt(matchAgeMatch[2]) : 30;
      const matchAgeMid = Math.floor((matchAgeMin + matchAgeMax) / 2);
      
      // AGE COMPATIBILITY
      let ageScore = 100;
      if (userGender === 'female') {
        if (matchAgeMid < userAgeMid) {
          const ageDiff = userAgeMid - matchAgeMid;
          ageScore = Math.max(70, 100 - (ageDiff * 5));
        }
      } else if (userGender === 'male') {
        if (matchAgeMid > userAgeMid + 5) {
          const ageDiff = matchAgeMid - (userAgeMid + 5);
          ageScore = Math.max(75, 100 - (ageDiff * 4));
        }
      }
      
      // INTERESTS COMPATIBILITY
      const interestWeights: {[key: string]: number} = {
        'Travel': 2.0, 'Cooking': 1.8, 'Photography': 1.7,
        'Art': 1.9, 'Musics': 1.8, 'K-Pop': 1.9,
        'Video games': 1.7, 'Sports': 1.8, 'Running': 1.7,
        'Gym': 1.8, 'Yoga': 1.7, 'Table-Tennis': 1.8,
        'Extreme sports': 1.9, 'Skin-care': 1.7, 
        'Shopping': 1.6, 'Karaoke': 1.8, 'Drinks': 1.7,
        'House parties': 1.8, 'Travels': 1.9, 'Swimming': 1.7
      };
      
      let interestScoreTotal = 0;
      let interestWeightTotal = 0;

      for (const interest of userInterests) {
        const weight = interestWeights[interest] || 1.0;
        interestWeightTotal += weight;
        
        if (matchInterests.includes(interest)) {
          interestScoreTotal += weight;
        }
      }

      const interestScore = interestWeightTotal > 0 ?
        boostScore((interestScoreTotal / interestWeightTotal) * 100) : 65;

      const sharedInterests = matchInterests.filter(interest => userInterests.includes(interest));
      
      // LIFESTYLE COMPATIBILITY
      const lifestyleCategories: {[key: string]: string[]} = {
        family: ['Family', 'Start a family', 'Marriage', 'Longterm', 'Long term relationship'],
        casual: ['Casual dating', 'Connects', 'Chat', 'House parties', 'Friendsplus'],
        romance: ['Romance', 'Vacation'],
        active: ['Active', 'Active partner', 'Touring', 'Surfing', 'Extreme sports', 'Running', 'Gym'],
        creative: ['Art', 'Photography', 'Cooking', 'Skin-care']
      };
      
      let lifestyleCategoryMatches = 0;
      let lifestyleCategoryTotal = 0;
      
      for (const category in lifestyleCategories) {
        const userHasCategory = lifestyleCategories[category].some(item => 
          userLifestyle.includes(item)
        );
        
        const matchHasCategory = lifestyleCategories[category].some(item => 
          matchLifestyle.includes(item)
        );
        
        if (userHasCategory) {
          lifestyleCategoryTotal++;
          
          if (matchHasCategory) {
            lifestyleCategoryMatches++;
          }
        }
      }
      
      const sharedLifestyle = matchLifestyle.filter(item => 
        userLifestyle.includes(item)
      );
      
      const categoricalScore = lifestyleCategoryTotal > 0 ? 
        (lifestyleCategoryMatches / lifestyleCategoryTotal) * 100 : 60;
      
      const directScore = userLifestyle.length > 0 ?
        (sharedLifestyle.length / userLifestyle.length) * 100 : 60;
      
      const lifestyleScore = boostScore((categoricalScore * 0.6) + (directScore * 0.4));
      
      // LOCATION COMPATIBILITY
      let locationScore = 75;
      
      if (userLocation && matchLocation) {
        const userCity = userLocation.split(',')[0].trim().toLowerCase();
        const matchCity = matchLocation.split(',')[0].trim().toLowerCase();
        
        if (userCity === matchCity) {
          locationScore = 100;
        } else {
          const userRegion = userLocation.split(',')[1]?.trim().toLowerCase() || '';
          const matchRegion = matchLocation.split(',')[1]?.trim().toLowerCase() || '';
          
          if (userRegion && matchRegion && userRegion === matchRegion) {
            locationScore = 90;
          }
        }
      }
      
      // FINAL COMPATIBILITY CALCULATION
      const randomBoost = Math.floor(Math.random() * 5);
      
      const matchPercentage = Math.min(100, Math.round(
        (interestScore * 0.30) +
        (lifestyleScore * 0.35) +
        (ageScore * 0.15) +
        (locationScore * 0.10) +
        (65 * 0.10) +
        (sharedInterests.length >= 3 ? 5 : 0) +
        (sharedLifestyle.length >= 2 ? 5 : 0) +
        (lifestyleCategoryMatches === lifestyleCategoryTotal && lifestyleCategoryTotal > 1 ? 5 : 0) +
        randomBoost
      ));
      
      return {
        id: doc.id,
        displayName: data?.displayName || 'User', // Use optional chaining
        ageRange: data?.ageRange || '??',
        photoURL: data?.photoURL || '',
        matchPercentage,
        scores: {
          interests: Math.round(interestScore),
          lifestyle: Math.round(lifestyleScore),
          age: Math.round(ageScore),
          location: Math.round(locationScore)
        }
      };
    }));
    
    // After calculating all potential matches, deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueMatches = potentialMatches
      .filter(match => {
        // Skip this match if we've seen this ID before or if it's the current user or if it's null
        if (!match || match.id === user.uid || seenIds.has(match.id)) return false;
        
        // Add to seen IDs and keep this match
        seenIds.add(match.id);
        return true;
      })
      .sort((a, b) => {
        // Handle potential null values during sort
        if (a === null && b === null) return 0;
        if (a === null) return 1; // Null values go last
        if (b === null) return -1;
        return b.matchPercentage - a.matchPercentage;
      })
      .slice(0, 3); // Top 3 matches

    // FIXED: Improved logic for showing "No users available"
    if (uniqueMatches.length > 0) {
      console.log('Found compatible matches:', uniqueMatches);
      
      // EXPLICITLY reset no users available state
      setNoUsersAvailable(false);
      
      // Only update UI if we're still in searching state
      if (currentStep === 'searching') {
        setMatches(uniqueMatches.filter((match): match is Match => match !== null));
        setMatchesFoundVisible(true);
        
        // Use a timeout to transition to results
        setTimeout(() => {
          if (currentStep === 'searching') {
            setMatchesFoundVisible(false);
            setCurrentStep('results');
          }
        }, 3000);
      }
    } else {
      // Only show no users if we really checked everything and found no matches
      console.log('No compatible matches found after checking all users');
      setNoUsersAvailable(true);
      
      // FIXED: Add auto-recovery if no matches found
      setTimeout(() => {
        if (noUsersAvailable && currentStep === 'searching') {
          console.log('Auto-recovery triggered - trying to find matches again');
          findMatches(); // Try again after 5 seconds
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Matching process error:', error);
    Alert.alert('Error', 'Failed to find matches. Please try again.');
    onBack();
  } finally {
    setLoading(false);
  }
};
  
  // View match details
  const handleViewMatchDetails = (match: Match) => {
    setSelectedMatch(match);
    setCurrentStep('detail');
  };
  
  // Handle match rejection
  const handleRejectMatch = (match: Match) => {
    setSelectedMatch(match);
    setCurrentStep('rejection');
  };
  
  // Submit rejection reason
// In SpeedDatingMode.tsx

const handleSubmitRejection = async (reason: string, feedbackData?: any) => {
  if (!user || !selectedMatch) return;
  
  try {
    setLoading(true);
    setRejectionReason(reason);
    
    // Create a structured rejection review document
    const rejectionReview = {
      reviewerId: user.uid,
      reviewerName: user.displayName || 'Anonymous User',
      reason: reason,
      sourceType: 'speedDating',
      createdAt: serverTimestamp(),
      matchPercentage: selectedMatch.matchPercentage || 0,
      // Add the detailed feedback data
      feedbackData: feedbackData || null,
      // Session details
      sessionDetails: {
        chatDuration: chatRoomId ? (4 * 60 * 60 - chatTimeLeft) : 0, // How long they chatted (if they did)
        rejectedAt: serverTimestamp()
      }
    };
    
    // Store in a new "rejectionReviews" collection for the rejected user
    const rejectionRef = collection(firestore, 'users', selectedMatch.id, 'rejectionReviews');
    await addDoc(rejectionRef, rejectionReview);
    
    // Also store in a global "speedDatingFeedback" collection for analysis
    await addDoc(collection(firestore, 'speedDatingFeedback'), {
      ...rejectionReview,
      rejectedUserId: selectedMatch.id
    });
    
    // If we had a chat room, update its status and clean up the messages
    if (chatRoomId) {
      // First update the room with final rejection details
      await updateDoc(doc(firestore, 'speedDatingConnections', chatRoomId), {
        status: 'rejected_final',
        rejectionReason: reason,
        rejectionFeedback: feedbackData || null,
        finalizedAt: serverTimestamp(),
        // Keep track of who submitted feedback
        feedbackSubmitter: user.uid
      });
      
      // Add a timer to clean up the room and messages in 5 minutes
      // We delay this to allow the other user to see what happened
      setTimeout(async () => {
        try {
          // Delete all messages
          const messagesRef = collection(firestore, 'speedDatingConnections', chatRoomId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          
          if (!messagesSnapshot.empty) {
            const batch = writeBatch(firestore);
            messagesSnapshot.docs.forEach(messageDoc => {
              batch.delete(messageDoc.ref);
            });
            await batch.commit();
          }
          
          // Finally delete the room itself
          await deleteDoc(doc(firestore, 'speedDatingConnections', chatRoomId));
          console.log(`Cleaned up rejected chat room: ${chatRoomId}`);
        } catch (err) {
          console.error('Error cleaning up rejected chat room:', err);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    // After storing the rejection, navigate back
    handleBackNavigation();
  } catch (error) {
    console.error('Error submitting rejection:', error);
    // Still navigate back even if there's an error
    handleBackNavigation();
  } finally {
    setLoading(false);
  }
};

  
  // Connect with a match
// Connect with a match - FIX FOR CHAT ROOM SYNC ISSUE
const handleConnectWithMatch = async (match: Match) => {
  if (!user || !match) return;
  
  try {
    setLoading(true);
    
    // CREATE A CONSISTENT ROOM ID BASED ON USER IDs
    // Sort user IDs to ensure the same room ID regardless of who initiates
    const userIds = [user.uid, match.id].sort();
    const consistentRoomId = `speed_${userIds[0]}_${userIds[1]}`;
    
    console.log(`Checking for room with consistent ID: ${consistentRoomId}`);
    
    // Check if the room already exists using the consistent ID
    const roomRef = doc(firestore, 'speedDatingConnections', consistentRoomId);
    const roomSnapshot = await getDoc(roomRef);
    
    let connectionId;
    
    if (roomSnapshot.exists()) {
      // Room already exists, use it
      connectionId = consistentRoomId;
      console.log(`Using existing connection with consistent ID: ${connectionId}`);
    } else {
      // As a fallback, check if there's a connection in a different format
      const connectionsRef = collection(firestore, 'speedDatingConnections');
      
      // Single query that can find the connection regardless of who created it
      // Use a compound query with two array-contains clauses
      const possibleRooms = await getDocs(query(connectionsRef));
      
      // Filter rooms manually to find one containing both users
      let existingRoom: QueryDocumentSnapshot<DocumentData> | null = null;
      for (const roomDoc of possibleRooms.docs) {
        const data = roomDoc.data();
        if (data.users && 
            data.users.includes(user.uid) && 
            data.users.includes(match.id)) {
          existingRoom = roomDoc;
          break;
        }
      }
      
      if (existingRoom) {
        // Use existing room found through fallback
        connectionId = existingRoom.id;
        console.log(`Found existing connection through fallback: ${connectionId}`);
      } else {
        // Create a new connection with the consistent ID
        console.log('Creating new speed dating connection with consistent ID');
        
        // Create with setDoc instead of addDoc to use our consistent ID
        await setDoc(doc(firestore, 'speedDatingConnections', consistentRoomId), {
          users: [user.uid, match.id],
          userProfiles: {
            [user.uid]: {
              displayName: user.displayName || 'You',
              photoURL: user.photoURL || '',
              continuePermanently: false
            },
            [match.id]: {
              displayName: match.displayName,
              photoURL: match.photoURL,
              continuePermanently: false
            }
          },
          // Explicit sender-recipient mapping
          senderUserId: user.uid,
          recipientUserId: match.id,
          createdAt: serverTimestamp(),
          status: 'temporary',
          sessionType: 'speed-dating',
          startedAt: serverTimestamp(),
          // Add room creation info for debugging
          createdBy: user.uid,
          createdFor: match.id
        });
        
        connectionId = consistentRoomId;
        
        // Add initial system message
        await addDoc(collection(firestore, 'speedDatingConnections', connectionId, 'messages'), {
          text: "You are now connected through Speed Dating! You have 4 hours to chat.",
          senderId: "system",
          createdAt: serverTimestamp()
        });
      }
    }
    
    // Log the final connection ID for debugging
    console.log(`FINAL CONNECTION ID: ${connectionId} (User: ${user.uid}, Match: ${match.id})`);
    
    // Store the connection ID
    setChatRoomId(connectionId);
    
    // Rest of your existing timer code remains the same...
    const connectionSnapshot = await getDoc(doc(firestore, 'speedDatingConnections', connectionId));
    const connectionData = connectionSnapshot.data();
    
    if (connectionData && connectionData.startedAt) {
      // Sync timer with server timestamp
      const serverStartTime = connectionData.startedAt.toDate().getTime();
      const initialElapsed = (Date.now() - serverStartTime) / 1000;
      const initialRemaining = Math.max(0, 4 * 60 * 60 - initialElapsed);
      
      setChatTimeLeft(initialRemaining);
      
      // Update timer interval to use server time reference
      chatTimerRef.current = setInterval(() => {
        const currentElapsed = (Date.now() - serverStartTime) / 1000;
        const remaining = Math.max(0, 4 * 60 * 60 - currentElapsed);
        
        setChatTimeLeft(remaining);
        
        if (remaining <= 1) {
          if (chatTimerRef.current) clearInterval(chatTimerRef.current);
          handleEndChatSession();
        }
      }, 1000);
    } else {
      // Fallback to client-side timer if server timestamp isn't available
      setChatTimeLeft(4 * 60 * 60);
      chatTimerRef.current = setInterval(() => {
        setChatTimeLeft(prev => {
          if (prev <= 1) {
            if (chatTimerRef.current) clearInterval(chatTimerRef.current);
            handleEndChatSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    // Set up reminder timer (1 hour)
    reminderTimerRef.current = setTimeout(() => {
      setMiniOverlayVisible(true);
      setTimeout(() => setMiniOverlayVisible(false), 10000);
    }, 60 * 60 * 1000);
    
    // Move to chat screen
    setCurrentStep('chat');
    
  } catch (error) {
    console.error('Error connecting with match:', error);
    Alert.alert('Error', 'Failed to connect with match. Please try again.');
  } finally {
    setLoading(false);
  }
};
  
  
  // End the current chat session
// Update handleEndChatSession to immediately clean up the room
const handleEndChatSession = async () => {
  if (!chatRoomId || !user || !selectedMatch) return;
  
  try {
    setLoading(true);
    
    // First, update the room status to rejected
    await updateDoc(doc(firestore, 'speedDatingConnections', chatRoomId), {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: user.uid,
      // Store rejection metadata
      rejectionData: {
        rejectorId: user.uid,
        rejectorName: user.displayName || 'User',
        rejectedUserId: selectedMatch.id,
        rejectedUserName: selectedMatch.displayName
      }
    });
    
    // Immediately cleanup the room messages (don't wait)
    try {
      // Delete all messages
      const messagesRef = collection(firestore, 'speedDatingConnections', chatRoomId, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      if (!messagesSnapshot.empty) {
        const batch = writeBatch(firestore);
        messagesSnapshot.docs.forEach(messageDoc => {
          batch.delete(messageDoc.ref);
        });
        await batch.commit();
        console.log(`Cleared ${messagesSnapshot.size} messages`);
      }
      
      // Also delete the room document itself - NOT waiting for feedback
      await deleteDoc(doc(firestore, 'speedDatingConnections', chatRoomId));
      console.log(`Deleted chat room: ${chatRoomId}`);
    } catch (err) {
      console.error('Error cleaning up chat room:', err);
      // Continue even if cleanup fails
    }
    
    // The rejector goes to the rejection screen
    setCurrentStep('rejection');
    
    // Clear timers
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
  } catch (error) {
    console.error('Error ending chat session:', error);
    // Still go to rejection screen even if there's an error
    setCurrentStep('rejection');
  } finally {
    setLoading(false);
  }
};
  
// Continue to permanent chat
const handleContinueToPermanentChat = async () => {
  if (!user || !selectedMatch || !chatRoomId) return;

  try {
    setLoading(true);

    const matchesRef = collection(firestore, 'matches');
    const q = query(
      matchesRef, 
      where('users', 'array-contains', user.uid)
    );

    const matchesSnapshot = await getDocs(q);
    let existingMatchId: string | null = null;

    // Check each document to see if the selectedMatch.id is in the users array
    for (const docSnapshot of matchesSnapshot.docs) {
      const matchData = docSnapshot.data();
      if (matchData.users && Array.isArray(matchData.users) && matchData.users.includes(selectedMatch.id)) {
        existingMatchId = docSnapshot.id;
        break;
      }
    }

    if (existingMatchId) {
      // If a permanent match already exists, just navigate to it
      console.log(`Found existing permanent chat: ${existingMatchId}`);
      setChatRoomId(existingMatchId as string);
      setCurrentStep('congratulations');
      return;
    }

    // Get the current connection document
    const connectionRef = doc(firestore, 'speedDatingConnections', chatRoomId);
    const connectionSnap = await getDoc(connectionRef);

    if (connectionSnap.exists()) {
      const connectionData = connectionSnap.data();
      // Add type guard to handle potentially undefined data
      if (!connectionData) {
        throw new Error("Connection data is missing");
      }

      const userProfiles = connectionData.userProfiles || {};

      // Find the other user ID
      const otherUserId = connectionData.users.find((id: string) => id !== user.uid);
      if (!otherUserId) {
        throw new Error("Other user ID not found in connection");
      }

      // First, update the user's preference in Firestore directly
      await updateDoc(connectionRef, { 
        [`userProfiles.${user.uid}.continuePermanently`]: true,
        updatedAt: serverTimestamp()
      });

      // Wait a moment to ensure Firestore updates are propagated
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the fresh data after the update
      const updatedConnectionSnap = await getDoc(connectionRef);
      const updatedData = updatedConnectionSnap.data();
      if (!updatedData) throw new Error("Updated connection data is missing");

      const updatedProfiles = updatedData.userProfiles || {};

      // Check if both users want to continue permanently
      const userWantsToContinue = updatedProfiles[user.uid]?.continuePermanently === true;
      const otherUserWantsToContinue = updatedProfiles[otherUserId]?.continuePermanently === true;
      const bothWantToContinue = userWantsToContinue && otherUserWantsToContinue;

      console.log(`User wants to continue: ${userWantsToContinue}`);
      console.log(`Other user wants to continue: ${otherUserWantsToContinue}`);
      console.log(`Both want to continue: ${bothWantToContinue}`);

      if (bothWantToContinue) {
        // Create a permanent match
        const matchRef = await addDoc(collection(firestore, 'matches'), {
          users: updatedData.users,
          userProfiles: updatedProfiles,
          createdAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
          status: 'permanent',
          matchType: 'speed-dating-match'
        });

        // Copy messages from temporary connection to permanent match
        const tempMessagesRef = collection(firestore, 'speedDatingConnections', chatRoomId, 'messages');
        const tempMessagesSnap = await getDocs(tempMessagesRef);

        // Batch write messages to new match
        const batch = writeBatch(firestore);
        tempMessagesSnap.docs.forEach(tempMessageDoc => {
          const newMessageRef = doc(collection(firestore, 'matches', matchRef.id, 'messages'));
          batch.set(newMessageRef, tempMessageDoc.data());
        });

        // Add a match success message
        const successMessageRef = doc(collection(firestore, 'matches', matchRef.id, 'messages'));
        batch.set(successMessageRef, {
          text: "Congratulations! You've been matched from Speed Dating. Your chat is now permanent.",
          senderId: "system",
          createdAt: serverTimestamp()
        });

        await batch.commit();

        // Delete the temporary connection
        await deleteDoc(connectionRef);

        // Update chat room ID to new permanent match
        setChatRoomId(matchRef.id as string);

        // Navigate to congratulations screen
        setCurrentStep('congratulations');
      } else {
        // Display notification to wait for match
        Alert.alert(
          'Wait for Match',
          'Your match needs to also press Continue to make this permanent.'
        );
      }
    }
  } catch (error) {
    console.error('Error creating permanent chat:', error);
    Alert.alert('Error', 'Failed to create permanent chat. Please try again.');
  } finally {
    setLoading(false);
  }
};
  
  // Navigate to permanent chat screen
  const handleGoToPermanentChat = () => {
    if (chatRoomId) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: chatRoomId }
      });
    } else {
      handleBackNavigation();
    }
  };
  
  // Format time for display
  const formatTime = (seconds: number): string => {
    // Handle hours, minutes, and seconds
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Pad with leading zeros
    const paddedHours = hours.toString().padStart(2, '0');
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = secs.toString().padStart(2, '0');
    
    // If hours exist, return HH:MM:SS, otherwise return MM:SS
    return hours > 0 
      ? `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
      : `${paddedMinutes}:${paddedSeconds}`;
  };

  // Add this after your other useEffect hooks
useEffect(() => {
  // Only set up listener in chat mode with a valid room ID
  if (currentStep === 'chat' && chatRoomId) {
    console.log(`Setting up rejection listener for room: ${chatRoomId}`);
    
    // Listen for changes to the room document
    const unsub = onSnapshot(doc(firestore, 'speedDatingConnections', chatRoomId), (snapshot) => {
      // If the document was deleted or marked as rejected
      if (!snapshot.exists() || (snapshot.exists() && snapshot.data()?.status === 'rejected')) {
        console.log('Other user rejected or deleted the chat - returning to selection');
        
        // The other user has popped the balloon
        Alert.alert(
          'Chat Ended',
          'The other user has ended this chat session.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear timers
                if (chatTimerRef.current) clearInterval(chatTimerRef.current);
                if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
                
                // Go back to selection screen IMMEDIATELY
                handleBackNavigation();
              }
            }
          ]
        );
      }
    }, 
    // Add error handling for the listener
    (error) => {
      console.error("Error in chat room listener:", error);
      // If listening fails (e.g., document deleted), go back to selection
      handleBackNavigation();
    });
    
    // Cleanup listener on unmount or mode change
    return () => unsub();
  }
}, [currentStep, chatRoomId, user]);
  
  // Render based on current step
  return (
    <View style={styles.container}>
      {/* Searching screen */}
      {currentStep === 'searching' && (
        <SearchingScreen 
          timeLeft={timeLeft}
          formatTime={formatTime}
          onBack={handleBackNavigation}
        />
      )}
      
      {/* Results screen */}
      {currentStep === 'results' && (
        <ResultsScreen 
          matches={matches}
          onViewDetails={handleViewMatchDetails}
          onBack={handleBackNavigation}
        />
      )}
      
      {/* Detail screen */}
      {currentStep === 'detail' && selectedMatch && (
        <DetailScreen 
          match={selectedMatch}
          onConnect={handleConnectWithMatch}
          onReject={handleRejectMatch}
          onBack={() => setCurrentStep('results')}
        />
      )}
      
      {/* Rejection screen */}
      {currentStep === 'rejection' && selectedMatch && (
        <RejectionScreen 
          match={selectedMatch}
          onSubmitReason={handleSubmitRejection}
          onBack={() => {
            // If we're coming from a chat, go back to the chat, otherwise go to detail
            if (chatRoomId) {
              setCurrentStep('chat');
            } else {
              setCurrentStep('detail');
            }
          }}
        />
      )}
      
      {/* Chat screen */}
      {currentStep === 'chat' && chatRoomId && selectedMatch && (
        <SpeedDatingChatRoom 
          matchId={chatRoomId}
          match={selectedMatch}
          timeLeft={chatTimeLeft}
          miniOverlayVisible={miniOverlayVisible}
          onEndChat={() => {
            // Now this will trigger the rejection flow instead of just ending the chat
            setCurrentStep('rejection');
          }}
          onContinueChat={handleContinueToPermanentChat}
          onBack={handleBackNavigation}
        />
      )}
      
      {/* Congratulations screen */}
      {currentStep === 'congratulations' && selectedMatch && (
        <CongratulationsScreen 
          match={selectedMatch}
          onGoToChat={handleGoToPermanentChat}
          onSkip={handleBackNavigation}
        />
      )}
      
      {/* Matches found overlay */}
      <MatchesFoundOverlay 
        visible={matchesFoundVisible}
        matchCount={matches.length}
        onClose={() => setMatchesFoundVisible(false)}
      />

      {/* No users available overlay */}
      <NoUsersAvailableOverlay 
        visible={noUsersAvailable}
        onDismiss={handleOverlayDismiss}
        autoDismissTime={4000} // 4 seconds
      />
      
      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});
