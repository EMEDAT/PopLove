// services/lineupService.ts
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  increment,
  onSnapshot,
  Timestamp,
  setDoc,
  orderBy,
  limit,
  writeBatch,
  runTransaction,
  deleteField
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { Contestant, ChatMessage, LineUpSessionData, MatchData } from '../components/live-love/LineUpScreens/types';
import { calculateMatchPercentage } from '../utils/matchCalculation';
import * as NotificationService from '../services/notificationService';

// CONSTANTS
const SPOTLIGHT_TIMER_SECONDS = 4 * 60 * 60; // 4 hours in seconds (14,400 seconds)
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 48 hours in seconds (172,800 seconds)

// Mutex implementation to prevent concurrent rotations
const rotationLocks = new Map<string, boolean>();

// Debug logging helper
const debugLog = (area: string, message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [LineupService:${area}] ${message}`, data ? data : '');
};

/**
 * Join or create a lineup session
 * @param userId User ID joining the session
 * @param categoryId Category ID to join
 * @returns Session data
 */
export const joinLineupSession = async (userId: string, categoryId: string): Promise<LineUpSessionData> => {
  debugLog('Join', `User ${userId} joining lineup for category ${categoryId}`);
  
  // Get user gender for proper field naming
  const userDoc = await getDoc(doc(firestore, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userGender = userDoc.data().gender || '';
  if (!userGender) {
    throw new Error('User gender not defined');
  }
  
  // Determine field names based on gender
  const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
  const rotationTimeField = `${userGender}LastRotationTime`;
  
  debugLog('Join', `User gender: ${userGender}, field: ${genderField}`);
  
  // Use transaction for atomic operations
  return await runTransaction(firestore, async (transaction) => {
    // Look for active session with same category
    const sessionsRef = collection(firestore, 'lineupSessions');
    const q = query(
      sessionsRef, 
      where('category', 'array-contains', categoryId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    let sessionDoc, sessionId;
    
    if (!snapshot.empty) {
      debugLog('Join', `Found existing active session for category ${categoryId}`);
      sessionDoc = snapshot.docs[0];
      sessionId = sessionDoc.id;
    } else {
      debugLog('Join', `Creating new session for category ${categoryId}`);
      // Create new session
      const newSessionRef = doc(collection(firestore, 'lineupSessions'));
      sessionId = newSessionRef.id;
      
      // Initialize with proper fields
      const initialSessionData = {
        category: [categoryId],
        status: 'active',
        contestants: [],
        currentContestantId: null,
        currentMaleContestantId: null,
        currentFemaleContestantId: null,
        lastRotationTime: null,
        maleLastRotationTime: null,
        femaleLastRotationTime: null,
        createdAt: serverTimestamp()
      };
      
      transaction.set(newSessionRef, initialSessionData);
      
      sessionDoc = {
        id: sessionId,
        data: () => initialSessionData
      };
    }
    
    const sessionData = sessionDoc.data();
    
    // Check if this is the first contestant of this gender
    const isFirstGenderContestant = !sessionData[genderField];
    
    debugLog('Join', `Is first ${userGender} contestant: ${isFirstGenderContestant}`);
    
    // Update contestant arrays and fields
    const updates: Record<string, any> = {
      contestants: [...(sessionData.contestants || []), userId]
    };
    
    // If first contestant of this gender, set as current
    if (isFirstGenderContestant) {
      updates[genderField] = userId;
      updates[rotationTimeField] = serverTimestamp();
      
      // If no current contestant set yet, set this one
      if (!sessionData.currentContestantId) {
        updates.currentContestantId = userId;
        updates.lastRotationTime = serverTimestamp();
      }
    }
    
    // Update session document
    transaction.update(doc(firestore, 'lineupSessions', sessionId), updates);
    
    // Add contestant join time record with gender
    transaction.set(
      doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', userId),
      {
        userId,
        gender: userGender,
        joinedAt: serverTimestamp(),
        completed: false
      }
    );
    
    // Initialize stats document
    transaction.set(
      doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', userId),
      {
        likeCount: 0,
        popCount: 0,
        viewCount: 0
      }
    );
    
    // If first contestant of gender, create notification
    if (isFirstGenderContestant) {
      transaction.set(
        doc(firestore, 'notifications', `turn_${userId}_${Date.now()}`),
        {
          userId,
          type: 'lineup_turn',
          message: "It's your turn in the Line-Up! You're now the featured contestant.",
          data: { sessionId },
          createdAt: serverTimestamp(),
          isRead: false
        }
      );
    }
    
    // Return enhanced session data
    return {
      ...sessionData,
      id: sessionId,
      isFirstGenderContestant,
      [genderField]: isFirstGenderContestant ? userId : sessionData[genderField]
    } as LineUpSessionData;
  });
};

/**
 * Get spotlights (contestants) with gender filtering
 * @param sessionId Session ID
 * @param userId Current user ID
 * @returns Array of contestants
 */
export const getSpotlights = async (sessionId: string, userId: string): Promise<Contestant[]> => {
  debugLog('GetSpotlights', `Getting spotlights for session ${sessionId}, user ${userId}`);
  
  try {
    // Get user gender for filtering
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    
    const userGender = userDoc.data().gender || '';
    if (!userGender) {
      throw new Error("User gender not defined");
    }
    
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    debugLog('GetSpotlights', `User gender: ${userGender}, looking for: ${oppositeGender}`);
    
    // Get session data
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      throw new Error("Session not found");
    }
    
    const sessionData = sessionDoc.data();
    
    // Check current contestant of opposite gender
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase()}${oppositeGender.slice(1)}ContestantId`;
    const currentOppositeGenderContestantId = sessionData[oppositeGenderField];
    
    debugLog('GetSpotlights', `Current ${oppositeGender} contestant ID: ${currentOppositeGenderContestantId || 'none'}`);
    
    // If no current contestant, try to auto-select one
    if (!currentOppositeGenderContestantId) {
      debugLog('GetSpotlights', `No current ${oppositeGender} contestant, attempting auto-selection`);
      
      const selectedId = await autoSelectContestantForGender(sessionId, oppositeGender);
      
      if (selectedId) {
        debugLog('GetSpotlights', `Auto-selected contestant: ${selectedId}`);
        // Re-fetch session data with new contestant
        return getSpotlights(sessionId, userId);
      } else {
        debugLog('GetSpotlights', `Could not auto-select a ${oppositeGender} contestant`);
        return [];
      }
    }
    
    // Get all contestants of opposite gender with active status
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef,
      where('gender', '==', oppositeGender),
      where('completed', '==', false),
      orderBy('joinedAt', 'asc')
    );
    
    const joinTimesSnapshot = await getDocs(joinTimesQuery);
    debugLog('GetSpotlights', `Found ${joinTimesSnapshot.size} active ${oppositeGender} contestants`);
    
    // Build spotlights array
    const spotlights: Contestant[] = [];
    const spotlightPromises: Promise<void>[] = [];
    
    // Process each contestant in join order
    for (const joinTimeDoc of joinTimesSnapshot.docs) {
      const contestantId = joinTimeDoc.id;
      
      // Skip current user
      if (contestantId === userId) continue;
      
      // Create promise to fetch user data
      const promise = getDoc(doc(firestore, 'users', contestantId))
        .then(async (contestantDoc) => {
          if (contestantDoc.exists()) {
            const contestantData = contestantDoc.data();
            
            // Double-check gender
            if (contestantData.gender === oppositeGender) {
              // Calculate match percentage
              const matchPercentage = await calculateMatchPercentage(userId, contestantId);
              
              // Create contestant object
              const spotlight: Contestant = {
                id: contestantId,
                displayName: contestantData.displayName || 'User',
                photoURL: contestantData.photoURL || '',
                ageRange: contestantData.ageRange || '??',
                bio: contestantData.bio || '',
                location: contestantData.location || '',
                interests: contestantData.interests || [],
                gender: contestantData.gender,
                matchPercentage,
                joinedAt: joinTimeDoc.data().joinedAt
              };
              
              spotlights.push(spotlight);
              debugLog('GetSpotlights', `Added spotlight: ${spotlight.displayName} (${matchPercentage}% match)`);
            }
          }
        })
        .catch(error => {
          debugLog('GetSpotlights', `Error processing contestant ${contestantId}`, error);
        });
      
      spotlightPromises.push(promise);
    }
    
    // Wait for all contestant data to be fetched
    await Promise.all(spotlightPromises);
    
    // Sort by join time (FIFO)
    spotlights.sort((a, b) => {
      // Handle undefined joinedAt
      if (!a.joinedAt && !b.joinedAt) return 0;
      if (!a.joinedAt) return 1;
      if (!b.joinedAt) return -1;
      
      // Convert to date if needed
      const timeA = a.joinedAt.toDate ? a.joinedAt.toDate().getTime() : a.joinedAt;
      const timeB = b.joinedAt.toDate ? b.joinedAt.toDate().getTime() : b.joinedAt;
      
      return timeA - timeB;
    });
    
    // Ensure current contestant is first in the list
    if (currentOppositeGenderContestantId) {
      // Check if current contestant is in our list
      const currentIndex = spotlights.findIndex(s => s.id === currentOppositeGenderContestantId);
      
      if (currentIndex === -1) {
        // Current contestant not in list, fetch directly
        debugLog('GetSpotlights', `Current contestant ${currentOppositeGenderContestantId} not in list, fetching directly`);
        
        try {
          const currentDoc = await getDoc(doc(firestore, 'users', currentOppositeGenderContestantId));
          
          if (currentDoc.exists()) {
            const data = currentDoc.data();
            
            if (data.gender === oppositeGender) {
              const matchPercentage = await calculateMatchPercentage(userId, currentOppositeGenderContestantId);
              
              const currentSpotlight: Contestant = {
                id: currentOppositeGenderContestantId,
                displayName: data.displayName || 'User',
                photoURL: data.photoURL || '',
                ageRange: data.ageRange || '',
                bio: data.bio || '',
                location: data.location || '',
                interests: data.interests || [],
                gender: data.gender,
                matchPercentage
              };
              
              // Add at beginning
              spotlights.unshift(currentSpotlight);
              debugLog('GetSpotlights', `Added current contestant to beginning: ${currentSpotlight.displayName}`);
            }
          }
        } catch (error) {
          debugLog('GetSpotlights', `Error fetching current contestant`, error);
        }
      } else if (currentIndex > 0) {
        // Move current contestant to the beginning
        const current = spotlights.splice(currentIndex, 1)[0];
        spotlights.unshift(current);
        debugLog('GetSpotlights', `Moved current contestant to beginning: ${current.displayName}`);
      }
    }
    
    debugLog('GetSpotlights', `Returning ${spotlights.length} spotlights`);
    return spotlights;
  } catch (error) {
    debugLog('GetSpotlights', 'Error getting spotlights', error);
    return [];
  }
};

/**
 * Auto-select a contestant for a gender if none exists
 * @param sessionId Session ID
 * @param gender Gender to select for
 * @returns Selected contestant ID or null
 */
export const autoSelectContestantForGender = async (
  sessionId: string, 
  gender: string
): Promise<string | null> => {
  debugLog('AutoSelect', `Auto-selecting ${gender} contestant for session ${sessionId}`);
  
  try {
    // Get ordered array of contestants for this gender
    const orderedContestants = await getOrderedSpotlightsByGender(sessionId, gender);
    
    if (orderedContestants.length === 0) {
      debugLog('AutoSelect', `No ${gender} contestants available`);
      return null;
    }
    
    // Select the first one
    const selectedId = orderedContestants[0];
    debugLog('AutoSelect', `Selected contestant: ${selectedId}`);
    
    // Update session with the selected contestant
    const genderField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}ContestantId`;
    const rotationTimeField = `${gender}LastRotationTime`;
    
    await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
      [genderField]: selectedId,
      [rotationTimeField]: serverTimestamp()
    });
    
    // Add turn notification
    await NotificationService.addLineupTurnNotification(selectedId, sessionId);
    
    // Create rotation event
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
      timestamp: serverTimestamp(),
      rotationId: Date.now().toString(),
      previousContestantId: null,
      newContestantId: selectedId,
      gender
    });
    
    return selectedId;
  } catch (error) {
    debugLog('AutoSelect', 'Error auto-selecting contestant', error);
    return null;
  }
};

/**
 * Get ordered contestants by gender, strictly by join time
 * @param sessionId Session ID
 * @param gender Gender to filter by
 * @returns Array of contestant IDs
 */
export const getOrderedSpotlightsByGender = async (sessionId: string, gender: string): Promise<string[]> => {
  debugLog('GetOrdered', `Getting ordered ${gender} contestants for session ${sessionId}`);
  
  try {
    // Query for active contestants of specified gender
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef,
      where('gender', '==', gender),
      where('completed', '==', false),
      orderBy('joinedAt', 'asc')
    );
    
    const snapshot = await getDocs(joinTimesQuery);
    
    // Extract contestant IDs in join order
    const contestantIds = snapshot.docs.map(doc => doc.id);
    debugLog('GetOrdered', `Found ${contestantIds.length} ordered ${gender} contestants`);
    
    // If no active contestants, try to find any (even completed ones)
    if (contestantIds.length === 0) {
      debugLog('GetOrdered', `No active ${gender} contestants, checking for completed ones`);
      
      const allGenderQuery = query(
        joinTimesRef,
        where('gender', '==', gender)
      );
      
      const allGenderSnapshot = await getDocs(allGenderQuery);
      const allIds = allGenderSnapshot.docs.map(doc => doc.id);
      
      if (allIds.length > 0) {
        // Reset one contestant to active
        const firstId = allIds[0];
        await updateDoc(doc(joinTimesRef, firstId), {
          completed: false,
          resetAt: serverTimestamp()
        });
        
        debugLog('GetOrdered', `Reset contestant ${firstId} to active status`);
        return [firstId];
      }
    }
    
    return contestantIds;
  } catch (error) {
    debugLog('GetOrdered', 'Error getting ordered contestants', error);
    return [];
  }
};

/**
 * Record user action (like/pop)
 * @param sessionId Session ID
 * @param userId User performing the action
 * @param contestantId Contestant receiving the action
 * @param action Type of action (like/pop)
 */
export const recordAction = async (
  sessionId: string, 
  userId: string, 
  contestantId: string, 
  action: 'like' | 'pop'
): Promise<void> => {
  debugLog('Action', `Recording ${action} from ${userId} to ${contestantId} in session ${sessionId}`);
  
  try {
    // Record action in the session actions
    await addDoc(collection(firestore, 'lineupSessions', sessionId, 'actions'), {
      fromUserId: userId,
      toUserId: contestantId,
      action,
      timestamp: serverTimestamp()
    });
    
    // Update stats count
    const countField = action === 'like' ? 'likeCount' : 'popCount';
    const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', contestantId);
    
    // Create stats document if it doesn't exist
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      await updateDoc(statsRef, {
        [countField]: increment(1)
      });
    } else {
      await setDoc(statsRef, {
        [countField]: 1,
        [`${action === 'like' ? 'popCount' : 'likeCount'}`]: 0,
        viewCount: 0
      });
    }
    
    // If like action, record in likes collection for matching
    if (action === 'like') {
      await setDoc(doc(firestore, 'likes', `${userId}_${contestantId}`), {
        fromUserId: userId,
        toUserId: contestantId,
        createdAt: serverTimestamp(),
        status: 'pending',
        source: 'lineup'
      });
    }
    
    // If pop action, check for elimination threshold
    if (action === 'pop') {
      const updatedStatsDoc = await getDoc(statsRef);
      
      if (updatedStatsDoc.exists() && (updatedStatsDoc.data().popCount || 0) >= 20) {
        debugLog('Action', `Contestant ${contestantId} reached elimination threshold (20+ pops)`);
        await eliminateUser(sessionId, contestantId);
      }
    }
  } catch (error) {
    debugLog('Action', 'Error recording action', error);
    throw error;
  }
};

/**
 * Check if users mutually liked each other
 * @param userId1 First user ID
 * @param userId2 Second user ID
 * @returns Boolean indicating if it's a match
 */
export const checkForMatch = async (userId1: string, userId2: string): Promise<boolean> => {
  debugLog('Match', `Checking for match between ${userId1} and ${userId2}`);
  
  try {
    // Check if the other user has liked this user
    const likeDoc = await getDoc(doc(firestore, 'likes', `${userId2}_${userId1}`));
    const isMatch = likeDoc.exists();
    
    debugLog('Match', `Match check result: ${isMatch}`);
    return isMatch;
  } catch (error) {
    debugLog('Match', 'Error checking for match', error);
    return false;
  }
};

/**
 * Get user's pop count
 * @param sessionId Session ID
 * @param userId User ID
 * @returns Pop count
 */
export const getUserPopCount = async (sessionId: string, userId: string): Promise<number> => {
  debugLog('Stats', `Getting pop count for user ${userId} in session ${sessionId}`);
  
  try {
    const statsDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', userId));
    
    if (statsDoc.exists()) {
      const popCount = statsDoc.data().popCount || 0;
      debugLog('Stats', `Pop count: ${popCount}`);
      return popCount;
    }
    
    return 0;
  } catch (error) {
    debugLog('Stats', 'Error getting pop count', error);
    return 0;
  }
};

/**
 * Eliminate user from lineup
 * @param sessionId Session ID
 * @param userId User ID to eliminate
 */
export const eliminateUser = async (sessionId: string | null, userId: string): Promise<void> => {
  if (!sessionId) return;
  debugLog('Elimination', `Eliminating user ${userId} from session ${sessionId}`);
  
  try {
    // Get user's gender for proper field updates
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      debugLog('Elimination', 'User document not found');
      return;
    }
    
    const userGender = userDoc.data().gender || '';
    
    // Using runTransaction for atomic updates
    await runTransaction(firestore, async (transaction) => {
      const sessionRef = doc(firestore, 'lineupSessions', sessionId);
      const sessionSnap = await transaction.get(sessionRef);
      
      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }
      
      const sessionData = sessionSnap.data();
      
      // Check if user is currently the spotlight
      const isCurrentContestant = (
        sessionData.currentContestantId === userId ||
        sessionData[`current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`] === userId
      );
      
      debugLog('Elimination', `Is current contestant: ${isCurrentContestant}`);
      
      if (isCurrentContestant) {
        // Get next contestant of same gender
        const orderedContestants = await getOrderedSpotlightsByGender(sessionId, userGender);
        const filteredContestants = orderedContestants.filter(id => id !== userId);
        
        const nextContestantId = filteredContestants.length > 0 ? filteredContestants[0] : null;
        
        // Update gender-specific field
        const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
        const rotationTimeField = `${userGender}LastRotationTime`;
        
        const updates: Record<string, any> = {
          [genderField]: nextContestantId,
          [rotationTimeField]: serverTimestamp()
        };
        
        // If this was also the current general contestant, update that too
        if (sessionData.currentContestantId === userId) {
          updates.currentContestantId = nextContestantId;
          updates.lastRotationTime = serverTimestamp();
        }
        
        transaction.update(sessionRef, updates);
        
        // Create rotation event for UI updates
        transaction.set(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
          timestamp: serverTimestamp(),
          rotationId: Date.now().toString(),
          previousContestantId: userId,
          newContestantId: nextContestantId,
          gender: userGender
        });
        
        // Send notification to next contestant
        if (nextContestantId) {
          const notificationId = `turn_${nextContestantId}_${Date.now()}`;
          transaction.set(doc(firestore, 'notifications', notificationId), {
            userId: nextContestantId,
            type: 'lineup_turn',
            message: "It's your turn in the Line-Up! You're now the featured contestant.",
            data: { sessionId },
            createdAt: serverTimestamp(),
            isRead: false
          });
        }
      }
      
      // Mark contestant as completed
      transaction.update(doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', userId), {
        completed: true,
        eliminatedAt: serverTimestamp()
      });
      
      // Remove from contestants array
      const updatedContestants = sessionData.contestants.filter((id: string) => id !== userId);
      transaction.update(sessionRef, {
        contestants: updatedContestants,
        eliminatedUsers: increment(1)
      });
    });
    
    // Create elimination record with timer
    await setDoc(doc(firestore, 'userEliminations', userId), {
      eliminatedAt: serverTimestamp(),
      eligibleAt: Timestamp.fromDate(new Date(Date.now() + ELIMINATION_TIMER_SECONDS * 1000)),
      sessionId,
      reason: 'pop_threshold'
    });
    
    // Create elimination notification
    await setDoc(doc(firestore, 'notifications', `elimination_${userId}_${Date.now()}`), {
      userId,
      type: 'lineup_elimination',
      message: "You've been eliminated from the Line-Up due to receiving too many pops.",
      data: { 
        sessionId,
        cooldownHours: ELIMINATION_TIMER_SECONDS / 3600
      },
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    debugLog('Elimination', `Successfully eliminated user ${userId}`);
  } catch (error) {
    debugLog('Elimination', 'Error eliminating user', error);
    throw error;
  }
};

/**
 * Get user's matches from lineup
 * @param sessionId Session ID
 * @param userId User ID
 * @returns Array of matches
 */
export const getUserMatches = async (sessionId: string, userId: string): Promise<MatchData[]> => {
  debugLog('Matches', `Getting matches for user ${userId} in session ${sessionId}`);
  
  try {
    // Get all likes TO this user (incoming likes)
    const incomingLikesRef = collection(firestore, 'likes');
    const incomingQuery = query(
      incomingLikesRef, 
      where('toUserId', '==', userId), 
      where('status', '==', 'pending')
    );
    
    const incomingSnapshot = await getDocs(incomingQuery);
    debugLog('Matches', `Found ${incomingSnapshot.size} incoming likes`);
    
    if (incomingSnapshot.empty) {
      return [];
    }
    
    // Process each like to build match data
    const matches: MatchData[] = [];
    const matchPromises: Promise<void>[] = [];
    
    for (const likeDoc of incomingSnapshot.docs) {
      const likeData = likeDoc.data();
      const fromUserId = likeData.fromUserId;
      
      // Check if this is mutual (user also liked them)
      const mutualLikeCheck = await getDoc(doc(firestore, 'likes', `${userId}_${fromUserId}`));
      const isMutualMatch = mutualLikeCheck.exists();
      
      // Create promise to fetch user data and build match object
      const promise = getDoc(doc(firestore, 'users', fromUserId))
        .then(async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Calculate match percentage
            const matchPercentage = await calculateMatchPercentage(userId, fromUserId);
            
            // Create match data
            const match: MatchData = {
              userId: fromUserId,
              displayName: userData.displayName || 'User',
              photoURL: userData.photoURL || '',
              ageRange: userData.ageRange || '',
              gender: userData.gender || '',
              bio: userData.bio || '',
              matchPercentage,
              timestamp: likeData.createdAt,
              isMutualMatch
            };
            
            matches.push(match);
          }
        })
        .catch(error => {
          debugLog('Matches', `Error processing match for user ${fromUserId}`, error);
        });
      
      matchPromises.push(promise);
    }
    
    // Wait for all match data to be fetched
    await Promise.all(matchPromises);
    
    // Sort by match percentage (highest first)
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    // Put mutual matches first
    const mutualMatches = matches.filter(m => m.isMutualMatch);
    const pendingMatches = matches.filter(m => !m.isMutualMatch);
    
    const sortedMatches = [...mutualMatches, ...pendingMatches];
    debugLog('Matches', `Returning ${sortedMatches.length} matches (${mutualMatches.length} mutual)`);
    
    return sortedMatches;
  } catch (error) {
    debugLog('Matches', 'Error getting user matches', error);
    return [];
  }
};

/**
 * Check for existing chat between users
 * @param userId1 First user ID
 * @param userId2 Second user ID
 * @returns Chat ID if exists, null otherwise
 */
export const checkExistingChat = async (userId1: string, userId2: string): Promise<string | null> => {
  debugLog('Chat', `Checking for existing chat between ${userId1} and ${userId2}`);
  
  try {
    // Query all chats containing first user
    const matchesRef = collection(firestore, 'matches');
    const q = query(matchesRef, where('users', 'array-contains', userId1));
    
    const snapshot = await getDocs(q);
    
    // Check each chat to see if second user is included
    for (const docSnapshot of snapshot.docs) {
      const matchData = docSnapshot.data();
      
      if (matchData.users && matchData.users.includes(userId2)) {
        debugLog('Chat', `Found existing chat: ${docSnapshot.id}`);
        return docSnapshot.id;
      }
    }
    
    debugLog('Chat', 'No existing chat found');
    return null;
  } catch (error) {
    debugLog('Chat', 'Error checking for existing chat', error);
    return null;
  }
};

/**
 * Create a new chat between users
 * @param userId1 First user ID
 * @param userId2 Second user ID
 * @param source Source of the match (e.g., 'lineup')
 * @returns New chat ID
 */
export const createChat = async (userId1: string, userId2: string, source: string): Promise<string> => {
  debugLog('Chat', `Creating new chat between ${userId1} and ${userId2}`);
  
  try {
    // Get user profiles
    const [user1Doc, user2Doc] = await Promise.all([
      getDoc(doc(firestore, 'users', userId1)),
      getDoc(doc(firestore, 'users', userId2))
    ]);
    
    if (!user1Doc.exists() || !user2Doc.exists()) {
      throw new Error('One or both users not found');
    }
    
    const user1Data = user1Doc.data();
    const user2Data = user2Doc.data();
    
    // Create chat document
    const matchRef = await addDoc(collection(firestore, 'matches'), {
      users: [userId1, userId2],
      userProfiles: {
        [userId1]: {
          displayName: user1Data.displayName || 'User',
          photoURL: user1Data.photoURL || '',
          gender: user1Data.gender || ''
        },
        [userId2]: {
          displayName: user2Data.displayName || 'User',
          photoURL: user2Data.photoURL || '',
          gender: user2Data.gender || ''
        }
      },
      createdAt: serverTimestamp(),
      lastMessageTime: serverTimestamp(),
      source,
      unreadCount: {
        [userId1]: 0,
        [userId2]: 0
      }
    });
    
    debugLog('Chat', `Created new chat with ID: ${matchRef.id}`);
    
    // Add welcome message
    await addDoc(collection(firestore, 'matches', matchRef.id, 'messages'), {
      text: `You've been matched from the Line-Up! Say hello to start the conversation.`,
      senderId: 'system',
      createdAt: serverTimestamp(),
      status: 'sent'
    });
    
    // Add match notifications for both users
    await Promise.all([
      NotificationService.addLineupMatchNotification(
        userId1, 
        userId2, 
        user2Data.displayName || 'User'
      ),
      NotificationService.addLineupMatchNotification(
        userId2, 
        userId1, 
        user1Data.displayName || 'User'
      )
    ]);
    
    return matchRef.id;
  } catch (error) {
    debugLog('Chat', 'Error creating chat', error);
    throw error;
  }
};

/**
 * Subscribe to gender-filtered messages
 * @param sessionId Session ID
 * @param userId User ID
 * @param currentSpotlightId Current spotlight ID
 * @param callback Function to call with messages
 * @returns Unsubscribe function
 */
export const subscribeToGenderFilteredMessages = (
  sessionId: string | null,
  userId: string | null,
  currentSpotlightId: string | null,
  callback: (messages: ChatMessage[]) => void
): () => void => {
  if (!sessionId || !userId) {
    console.error('CRITICAL: Missing sessionId or userId');
    callback([]);
    return () => {};
  }

  const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, async (snapshot) => {
    const rawMessages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      senderGender: doc.data().senderGender || '' // Add fallback for senderGender
    })) as ChatMessage[];

    console.log('DEBUG: Raw Messages Received', {
      count: rawMessages.length,
      messageDetails: rawMessages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderGender: m.senderGender,
        text: m.text
      }))
    });

    const [userDoc, spotlightDoc] = await Promise.all([
      getDoc(doc(firestore, 'users', userId)),
      currentSpotlightId ? getDoc(doc(firestore, 'users', currentSpotlightId)) : Promise.resolve(null)
    ]);

    const userGender = userDoc.exists() ? userDoc.data().gender || '' : '';
    const spotlightGender = spotlightDoc?.exists() ? spotlightDoc.data().gender || '' : '';

    // Fallback: Try to determine spotlight from session if not provided
    let resolvedCurrentSpotlightId = currentSpotlightId;
    if (!resolvedCurrentSpotlightId) {
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
      if (sessionDoc.exists()) {
        const sessionData = sessionDoc.data();
        const oppositeGender = userGender === 'male' ? 'female' : 'male';
        const spotlightField = `current${oppositeGender.charAt(0).toUpperCase()}${oppositeGender.slice(1)}ContestantId`;
        resolvedCurrentSpotlightId = sessionData[spotlightField];
      }
    }

    console.log('DEBUG: Gender & Spotlight Information', {
      userId,
      userGender,
      currentSpotlightId: resolvedCurrentSpotlightId,
      spotlightGender
    });

    // Filtering Logic
    const filteredMessages = rawMessages.filter(message => {
      // Always show own and system messages
      if (message.senderId === userId || message.senderId === 'system') return true;
    
      // In Waiting Room
      if (userId !== resolvedCurrentSpotlightId) {
        // ONLY show messages from CURRENT SPOTLIGHT of OPPOSITE GENDER
        return message.senderId === resolvedCurrentSpotlightId;
      }
    
      // In Private Screen
      if (userId === resolvedCurrentSpotlightId) {
        // Show:
        // 1. System messages
        // 2. Messages from OPPOSITE gender waiters
        // 3. Own messages
        return (
          message.senderId === 'system' ||
          message.senderGender !== userGender ||
          message.senderId === userId
        );
      }
    
      return false;
    });

    // Sort and return filtered messages
    callback(filteredMessages.sort((a, b) => 
      (a.timestamp?.toDate?.().getTime() || 0) - (b.timestamp?.toDate?.().getTime() || 0)
    ));
  });
};

/**
 * Send message to lineup chat
 * @param sessionId Session ID
 * @param message Message data
 */
export const sendMessage = async (sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<void> => {
  console.log('DEBUG: Sending Message', {
    sessionId,
    senderId: message.senderId,
    text: message.text
  });
  
  try {
    // Fetch sender's gender
    const senderDoc = await getDoc(doc(firestore, 'users', message.senderId));
    const senderGender = senderDoc.exists() ? senderDoc.data().gender || '' : '';

    console.log('DEBUG: Sender Gender', {
      senderId: message.senderId,
      senderGender
    });

    // Add message with gender
    await addDoc(collection(firestore, 'lineupSessions', sessionId, 'messages'), {
      ...message,
      senderGender,  // Add sender's gender
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Message Send Error', error);
    throw error;
  }
};


/**
 * Mark user as active in session
 * @param sessionId Session ID
 * @param userId User ID
 */
export const markUserActive = async (sessionId: string, userId: string): Promise<void> => {
  try {
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'activeUsers', userId), {
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    debugLog('Activity', 'Error marking user as active', error);
    // Non-critical error, don't throw
  }
};

/**
 * Rotate to next contestant
 * @param sessionId Session ID
 * @param gender Gender to rotate
 * @returns Success indicator
 */
export const rotateNextSpotlight = async (sessionId: string, gender: string): Promise<boolean> => {
  debugLog('Rotation', `Rotating to next ${gender} spotlight in session ${sessionId}`);
  
  // Lock key combines session and gender
  const lockKey = `${sessionId}_${gender}`;
  
  // Check if already locked
  if (rotationLocks.get(lockKey)) {
    debugLog('Rotation', `Rotation already in progress for ${gender} in session ${sessionId}`);
    return false;
  }
  
  // Set lock
  rotationLocks.set(lockKey, true);
  
  try {
    // Get session data
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('Rotation', 'Session not found');
      rotationLocks.set(lockKey, false);
      return false;
    }
    
    const sessionData = sessionDoc.data();
    
    // Get field names
    const genderField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}ContestantId`;
    const rotationTimeField = `${gender}LastRotationTime`;
    
    // Get current contestant
    const currentContestantId = sessionData[genderField];
    
    // Get ordered list of contestants
    const orderedContestants = await getOrderedSpotlightsByGender(sessionId, gender);
    
    // Find current index
    const currentIndex = orderedContestants.indexOf(currentContestantId);
    let nextIndex = 0;
    
    if (currentIndex !== -1 && currentIndex < orderedContestants.length - 1) {
      nextIndex = currentIndex + 1;
    }
    
    // Get next contestant
    const nextContestantId = orderedContestants[nextIndex];
    
    // Verify we're not rotating to the same person
    if (nextContestantId === currentContestantId) {
      debugLog('Rotation', `No other ${gender} contestants available for rotation`);
      rotationLocks.set(lockKey, false);
      return false;
    }
    
    debugLog('Rotation', `Rotating from ${currentContestantId} to ${nextContestantId}`);
    
    // Update session with transaction
    await runTransaction(firestore, async (transaction) => {
      // Update session
      const sessionRef = doc(firestore, 'lineupSessions', sessionId);
      
      const updates: Record<string, any> = {
        [genderField]: nextContestantId,
        [rotationTimeField]: serverTimestamp()
      };
      
      // Update general fields if primary gender
      const isPrimaryGender = (
        sessionData.primaryGender === gender || 
        (!sessionData.primaryGender && gender === 'female')
      );
      
      if (isPrimaryGender || sessionData.currentContestantId === currentContestantId) {
        updates.currentContestantId = nextContestantId;
        updates.lastRotationTime = serverTimestamp();
      }
      
      transaction.update(sessionRef, updates);
      
      // Mark previous contestant as completed
      if (currentContestantId) {
        transaction.update(doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', currentContestantId), {
          completed: true,
          completedAt: serverTimestamp()
        });
      }
      
      // Create notification for next contestant
      if (nextContestantId) {
        transaction.set(doc(firestore, 'notifications', `turn_${nextContestantId}_${Date.now()}`), {
          userId: nextContestantId,
          type: 'lineup_turn',
          message: "It's your turn in the Line-Up! You're now the featured contestant.",
          data: { sessionId },
          createdAt: serverTimestamp(),
          isRead: false
        });
      }
      
      // Create rotation event
      transaction.set(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
        timestamp: serverTimestamp(),
        rotationId: Date.now().toString(),
        previousContestantId: currentContestantId,
        newContestantId: nextContestantId,
        gender
      });
    });
    
    debugLog('Rotation', `Successfully rotated to ${nextContestantId}`);
    return true;
  } catch (error) {
    debugLog('Rotation', 'Error during rotation', error);
    return false;
  } finally {
    // Release lock
    rotationLocks.set(lockKey, false);
  }
};

/**
 * Request forced rotation (client-side emergency request)
 * @param sessionId Session ID
 * @param userId User ID
 * @param gender User gender
 */
export const requestForcedRotation = async (
  sessionId: string, 
  userId: string,
  gender?: string
): Promise<void> => {
  debugLog('ForcedRotation', `User ${userId} requesting forced rotation in session ${sessionId}`);
  
  try {
    // Get user gender if not provided
    let userGender = gender;
    
    if (!userGender) {
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (userDoc.exists()) {
        userGender = userDoc.data().gender;
      }
    }
    
    if (!userGender) {
      debugLog('ForcedRotation', 'Cannot request rotation - missing gender');
      return;
    }
    
    // Create rotation request
    await setDoc(doc(firestore, 'rotationRequests', `${sessionId}_${userId}_${Date.now()}`), {
      sessionId,
      userId,
      gender: userGender,
      requestTime: serverTimestamp(),
      status: 'pending'
    });
    
    debugLog('ForcedRotation', `Rotation request created for ${userGender} contestant`);
    
    // Try to directly rotate
    await rotateNextSpotlight(sessionId, userGender);
  } catch (error) {
    debugLog('ForcedRotation', 'Error requesting forced rotation', error);
    // Non-critical, don't throw
  }
};

// Add these functions to your existing services/lineupService.ts file

/**
 * Get remaining time for a contestant's spotlight
 * @param sessionId Session ID
 * @param gender Gender to check
 * @returns Remaining seconds in the spotlight
 */
export const getRemainingTime = async (sessionId: string, gender: string): Promise<number> => {
  debugLog('Timer', `Getting remaining time for ${gender} contestant in session ${sessionId}`);
  
  try {
    const sessionRef = doc(firestore, 'lineupSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      debugLog('Timer', `Session ${sessionId} does not exist`);
      return SPOTLIGHT_TIMER_SECONDS; // Default to full time if session doesn't exist
    }
    
    const sessionData = sessionDoc.data();
    const rotationTimeField = `${gender}LastRotationTime`;
    
    // Get last rotation time
    const lastRotationTime = sessionData[rotationTimeField]?.toDate();
    if (!lastRotationTime) {
      debugLog('Timer', `No rotation time found for ${gender} in session ${sessionId}`);
      return SPOTLIGHT_TIMER_SECONDS; // Default to full time if no rotation time
    }
    
    // Calculate remaining time
    const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
    
    debugLog('Timer', `Remaining time for ${gender} in session ${sessionId}: ${remainingSeconds}s`);
    return remainingSeconds;
  } catch (error) {
    debugLog('Timer', `Error getting remaining time: ${error}`);
    return SPOTLIGHT_TIMER_SECONDS; // Default to full time on error
  }
};

/**
 * Track profile view for analytics
 * @param sessionId Session ID
 * @param viewerId Viewer user ID
 * @param viewedProfileId Viewed profile user ID
 */
export const trackProfileView = async (
  sessionId: string,
  viewerId: string,
  viewedProfileId: string
): Promise<void> => {
  if (!sessionId || !viewerId || !viewedProfileId) {
    debugLog('View', 'Missing required parameters for trackProfileView');
    return;
  }
  
  // Don't track self-views
  if (viewerId === viewedProfileId) {
    return;
  }
  
  debugLog('View', `Tracking view from ${viewerId} to ${viewedProfileId} in session ${sessionId}`);
  
  try {
    // Create a unique ID for this view
    const viewId = `${viewerId}_${viewedProfileId}`;
    const viewRef = doc(firestore, 'lineupSessions', sessionId, 'views', viewId);
    
    // Check if view already exists
    const viewDoc = await getDoc(viewRef);
    
    if (!viewDoc.exists()) {
      // Record view
      await setDoc(viewRef, {
        viewerId,
        viewedProfileId,
        timestamp: serverTimestamp()
      });
      
      // Increment view count in stats
      const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', viewedProfileId);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        await updateDoc(statsRef, {
          viewCount: increment(1)
        });
      } else {
        // Create stats document if it doesn't exist
        await setDoc(statsRef, {
          viewCount: 1,
          likeCount: 0,
          popCount: 0
        });
      }
      
      debugLog('View', `Tracked new view and incremented count`);
    } else {
      // View already exists, update timestamp
      await updateDoc(viewRef, {
        timestamp: serverTimestamp()
      });
      
      debugLog('View', `View already recorded, updated timestamp only`);
    }
  } catch (error) {
    debugLog('View', `Error tracking profile view: ${error}`);
  }
};

export default {
  joinLineupSession,
  getSpotlights,
  recordAction,
  checkForMatch,
  getUserPopCount,
  eliminateUser,
  getUserMatches,
  checkExistingChat,
  createChat,
  subscribeToGenderFilteredMessages,
  sendMessage,
  markUserActive,
  rotateNextSpotlight,
  requestForcedRotation,
  getOrderedSpotlightsByGender,
  autoSelectContestantForGender
};