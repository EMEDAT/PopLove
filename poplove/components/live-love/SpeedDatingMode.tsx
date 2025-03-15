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
  doc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  writeBatch
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

  const handleOverlayDismiss = () => {
    console.log("Overlay auto-dismissed");
    setNoUsersAvailable(false);
    // Navigate back to LiveLove
    handleBackNavigation();
  };

  // Handler to navigate back to LiveLove screen
  const handleBackNavigation = () => {
    // Clear all timers before navigating
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
    
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
      
      // Create a speed dating session entry
      await addDoc(collection(firestore, 'speedDatingSessions'), {
        userId: user.uid,
        status: 'searching',
        createdAt: serverTimestamp(),
        preferences: {
          ageMin: 18,
          ageMax: 50,
        }
      });
      
      // Set timer for 100 seconds (visual countdown)
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
      
      // Start finding matches in the background
      // Use a shorter timeout for demo purposes (25 seconds)
      setTimeout(() => {
        findMatches();
      }, 25000);
      
      setLoading(false);
    } catch (error) {
      console.error('Error starting speed dating search:', error);
      Alert.alert('Error', 'Failed to start speed dating. Please try again.');
      handleBackNavigation();
    }
  };
  
// Advanced matching algorithm with comprehensive compatibility analysis
const findMatches = async () => {
  if (!user) return;
  
  try {
    setLoading(true);
    
    // Extend search time to 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));
    
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
    
    // Broader, more inclusive active users query
    const speedDatingSessionsRef = collection(firestore, 'speedDatingSessions');
    const activeUsersQuery = query(
      speedDatingSessionsRef,
      where('status', '==', 'searching'),
      where('userId', '!=', user.uid),
      where('createdAt', '>', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
    );

    const activeUsersSnapshot = await getDocs(activeUsersQuery);

    console.log(`Total active speed dating sessions: ${activeUsersSnapshot.size}`);
    console.log(`Current user gender: ${userGender}`);

    // If no active users after extended search, show no users overlay
    if (activeUsersSnapshot.empty) {
      setNoUsersAvailable(true);
      return;
    }

    // Fetch potential matches of opposite gender
    const matchesRef = collection(firestore, 'users');
    const matchQuery = query(
      matchesRef,
      where('gender', '!=', userGender),
      where('hasCompletedOnboarding', '==', true)
    );
    
    const snapshot = await getDocs(matchQuery);
    
    // BOOSTING FUNCTION FOR HIGHER PERCENTAGES
    const boostScore = (score, factor = 1.4) => {
      return Math.min(100, Math.round(score * factor));
    };
    
    // Comprehensive compatibility analysis
    const potentialMatches = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data();
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
      const interestWeights = {
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
      const lifestyleCategories = {
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
        displayName: data.displayName || 'User',
        ageRange: data.ageRange || '??',
        photoURL: data.photoURL || '',
        matchPercentage,
        scores: {
          interests: Math.round(interestScore),
          lifestyle: Math.round(lifestyleScore),
          age: Math.round(ageScore),
          location: Math.round(locationScore)
        }
      };
    }));
    
    // Filter and sort matches
    const validMatches = potentialMatches
      .filter(match => match && match.id !== user.uid)
      .sort((a, b) => b.matchPercentage - a.matchPercentage)
      .slice(0, 3);

    // If matches found, proceed with normal flow
    if (validMatches.length > 0) {
      console.log('Found compatible matches:', validMatches);
      setMatches(validMatches);
      setMatchesFoundVisible(true);
      
      setTimeout(() => {
        setMatchesFoundVisible(false);
        setCurrentStep('results');
      }, 3000);
    } else {
      // If no matches, show no users available
      setNoUsersAvailable(true);
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
    
    // If we had a chat room, update its status
    if (chatRoomId) {
      await updateDoc(doc(firestore, 'speedDatingConnections', chatRoomId), {
        status: 'rejected',
        rejectionReason: reason,
        rejectionFeedback: feedbackData || null,
        rejectedAt: serverTimestamp(),
        rejectedBy: user.uid
      });
    }
    
    // After storing the rejection, navigate back
    handleBackNavigation();
  } catch (error) {
    console.error('Error submitting rejection:', error);
    // Still navigate back even if there was an error
    handleBackNavigation();
  } finally {
    setLoading(false);
  }
};
  
  // Connect with a match
  const handleConnectWithMatch = async (match: Match) => {
    if (!user || !match) return;
    
    try {
      setLoading(true);
      
      // Create a temporary speed dating connection instead of a match
      const connectionRef = await addDoc(collection(firestore, 'speedDatingConnections'), {
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
        createdAt: serverTimestamp(),
        status: 'temporary',
        sessionType: 'speed-dating',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      });
      
      // Store the temporary connection ID
      setChatRoomId(connectionRef.id);
      
      // Add initial system message to the temporary connection's messages
      await addDoc(collection(firestore, 'speedDatingConnections', connectionRef.id, 'messages'), {
        text: "You are now connected through Speed Dating! You have 4 hours to chat.",
        senderId: "system",
        createdAt: serverTimestamp()
      });
      
      // Set up 4-hour timer for chat expiration
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
      
      // Set up first reminder timer (1 hour)
      reminderTimerRef.current = setTimeout(() => {
        setMiniOverlayVisible(true);
        // Hide after 10 seconds
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
  const handleEndChatSession = () => {
    // Instead of immediately navigating back, save the current match for the rejection screen
    if (selectedMatch) {
      // Set the step to the rejection screen
      setCurrentStep('rejection');
    } else {
      // Fallback if no match exists (should never happen)
      handleBackNavigation();
    }
    
    // Clear timers
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    if (reminderTimerRef.current) clearTimeout(reminderTimerRef.current);
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
        if (matchData.users && matchData.users.includes(selectedMatch.id)) {
          existingMatchId = docSnapshot.id;
          break;
        }
      }
      
      if (existingMatchId) {
        // If a permanent match already exists, just navigate to it
        console.log(`Found existing permanent chat: ${existingMatchId}`);
        setChatRoomId(existingMatchId);
        setCurrentStep('congratulations');
        return;
      }
      
      // Get the current connection document
      const connectionRef = doc(firestore, 'speedDatingConnections', chatRoomId);
      const connectionSnap = await getDoc(connectionRef);
      
      if (connectionSnap.exists()) {
        const connectionData = connectionSnap.data();
        if (!connectionData) {
          throw new Error("Connection data is missing");
        }
        
        const userProfiles = connectionData.userProfiles || {};
        

      // Find the other user ID - MOVED THIS UP
      const otherUserId = connectionData.users.find((id: string) => id !== user.uid);
      if (!otherUserId) {
        throw new Error("Other user ID not found in connection");
      }
        
        // // First, update the user's preference in Firestore directly
        await updateDoc(connectionRef, { 
          [`userProfiles.${user.uid}.continuePermanently`]: true,
          updatedAt: serverTimestamp()
        });

        // TESTING ONLY: Set both users to want to continue permanently
        // // Remove this in production!
        // await updateDoc(connectionRef, { 
        //   [`userProfiles.${user.uid}.continuePermanently`]: true,
        //   [`userProfiles.${otherUserId}.continuePermanently`]: true,
        //   updatedAt: serverTimestamp()
        // });
        
        // Get the fresh data after the update
        const updatedConnectionSnap = await getDoc(connectionRef);
        if (!updatedConnectionSnap.exists()) {
          throw new Error("Connection document no longer exists");
        }
        
        const updatedData = updatedConnectionSnap.data();
        if (!updatedData) {
          throw new Error("Updated connection data is missing");
        }
        
        const updatedProfiles = updatedData.userProfiles || {};
        
        // // Find the other user ID
        // const otherUserId = updatedData.users.find((id: string) => id !== user.uid);
        // if (!otherUserId) {
        //   throw new Error("Other user ID not found in connection");
        // }
        
        // Check if both users want to continue
        const bothWantToContinue = 
          updatedProfiles[user.uid]?.continuePermanently === true && 
          updatedProfiles[otherUserId]?.continuePermanently === true;
        
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
          setChatRoomId(matchRef.id);
          
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