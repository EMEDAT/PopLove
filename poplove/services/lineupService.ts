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
  writeBatch
} from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { Contestant, ChatMessage, LineUpSessionData, MatchData } from '../components/live-love/LineUpScreens/types';
import { calculateMatchPercentage } from '../utils/matchCalculation';
import * as NotificationService from '../services/notificationService';
import { addLineupTurnNotification } from '../services/notificationService';


// Simple mutex implementation
const rotationLocks = new Map<string, boolean>();

// TESTING CONFIGURATION - CHANGE BEFORE PRODUCTION
const SPOTLIGHT_TIMER_SECONDS = 4 * 60 * 60; // 10 minutes for testing (should be 4 * 60 * 60)
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 1 hour for testing (should be 48 * 60 * 60)

// Debug helper
const debugLog = (area: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [LineupService:${area}] ${message}`, data ? data : '');
};

// Handle automatic session rotation on timeout
export const handleSessionTimeouts = async () => {
  debugLog('Timeouts', 'Checking for expired session rotations');
  const sessionsRef = collection(firestore, 'lineupSessions');
  const activeSessionsQuery = query(
    sessionsRef,
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(activeSessionsQuery);
  debugLog('Timeouts', `Found ${snapshot.size} active sessions to check`);
  
  for (const sessionDoc of snapshot.docs) {
    const sessionData = sessionDoc.data();
    
    // Check both male and female spotlight timers
    await checkGenderTimeout(sessionDoc.id, sessionData, 'male');
    await checkGenderTimeout(sessionDoc.id, sessionData, 'female');
  }
};

// Check if a gender-specific spotlight user has timed out
async function checkGenderTimeout(sessionId: string, sessionData: any, gender: 'male' | 'female') {
  const field = `${gender}LastRotationTime`;
  const currentField = `current${gender.charAt(0).toUpperCase() + gender.slice(1)}SpotlightId`;
  
  // Use gender-specific rotation time if exists, fallback to general one
  const lastRotationTime = sessionData[field]?.toDate() || 
                          sessionData.lastRotationTime?.toDate() ||
                          new Date(Date.now() - 5 * 60 * 60 * 1000);
  
  const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
  
  debugLog('Timeouts', `${gender} spotlight time elapsed: ${elapsedSeconds}s`, {
    sessionId,
    currentSpotlightId: sessionData[currentField],
    lastRotationTime
  });
  
  // If more than 4 hours have passed since last rotation
  if (elapsedSeconds > SPOTLIGHT_TIMER_SECONDS) {
    debugLog('Timeouts', `${gender} spotlight timed out, rotating`, {
      sessionId, 
      spotlight: sessionData[currentField]
    });
    await rotateNextSpotlight(sessionId, gender);
  }
}

/**
 * Join or create a lineup session with improved gender awareness
 */
export const joinLineupSession = async (userId: string, categoryId: string): Promise<LineUpSessionData> => {
  debugLog('Join', `Attempting to join lineup session for user ${userId} in category ${categoryId}`);
  const MAX_RETRIES = 3;
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      debugLog('Join', `Attempt ${attempt+1} to join session`);
      
      // Get user's gender for proper session assignment
      debugLog('Join', `Getting gender for user ${userId}`);
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      const userGender = userDoc.data().gender || 'unknown';
      debugLog('Join', `User gender: ${userGender}`);
      
      // First check if there's an active session for this category
      const sessionsRef = collection(firestore, 'lineupSessions');
      const q = query(
        sessionsRef,
        where('category', 'array-contains', categoryId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      debugLog('Join', `Found ${snapshot.size} active sessions for category ${categoryId}`);
      
      if (!snapshot.empty) {
        // Join existing session using transaction to avoid race conditions
        const sessionDoc = snapshot.docs[0];
        const sessionId = sessionDoc.id;
        
        return await runTransaction(firestore, async (transaction) => {
          const freshSessionDoc = await transaction.get(doc(firestore, 'lineupSessions', sessionId));
          if (!freshSessionDoc.exists()) {
            throw new Error('Session disappeared during join');
          }
          
          const sessionData = freshSessionDoc.data();
          const spotlights = sessionData.spotlights || [];
          const userGenderField = `current${userGender.charAt(0).toUpperCase() + userGender.slice(1)}ContestantId`;
          
          // CRITICAL: Check if there's already someone of this gender in the spotlight
          const currentGenderContestant = sessionData[userGenderField];
          
          // If user is already in the session, just return the data
          if (spotlights.includes(userId)) {
            return { 
              ...sessionData, 
              id: sessionId,
              contestants: sessionData.spotlights || [],
              category: sessionData.category || [categoryId],
              currentSpotlightId: sessionData.currentSpotlightId || null,
              startTime: sessionData.startTime || serverTimestamp(),
              endTime: sessionData.endTime || null,
              status: sessionData.status || 'active'
            } as LineUpSessionData;
          }
          
          // Add user to spotlights if not already there
          if (!spotlights.includes(userId)) {
            const updatedSpotlights = [...spotlights, userId];
            transaction.update(doc(firestore, 'lineupSessions', sessionId), {
              spotlights: updatedSpotlights
            });
            
            // Add user to spotlight timestamps for proper ordering
            transaction.set(doc(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes', userId), {
              joinedAt: serverTimestamp(),
              gender: userGender,
              categoryId: categoryId,
              completed: false
            });
          }
          
          return { 
            ...sessionData, 
            id: sessionId, 
            spotlights: [...spotlights, userId],
            contestants: [...(sessionData.contestants || []), userId],
            category: sessionData.category || [categoryId],
            currentSpotlightId: sessionData.currentSpotlightId || null,
            startTime: sessionData.startTime || serverTimestamp(),
            endTime: sessionData.endTime || null,
            status: sessionData.status || 'active'
          } as LineUpSessionData;
        });
      } else {
        // Create new session
        debugLog('Join', `No existing session found, creating new session`);
        const now = new Date();
        const fourHoursLater = new Date(now.getTime() + SPOTLIGHT_TIMER_SECONDS * 1000);
        
        const maleField = userGender === 'male' ? userId : '';
        const femaleField = userGender === 'female' ? userId : '';
        
        // NEW SESSION - Create with proper gender fields
        const newSession = {
          category: [categoryId],
          primaryGender: userGender, // Set primary gender based on first user
          currentMaleSpotlightId: maleField,
          currentFemaleSpotlightId: femaleField,
          maleLastRotationTime: userGender === 'male' ? serverTimestamp() : null,
          femaleLastRotationTime: userGender === 'female' ? serverTimestamp() : null,
          spotlights: [userId],
          startTime: serverTimestamp(),
          endTime: Timestamp.fromDate(fourHoursLater),
          status: 'active',
          
          // Legacy fields for backward compatibility 
          currentSpotlightId: userId,
          lastRotationTime: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(firestore, 'lineupSessions'), newSession);
        debugLog('Join', `Created new session: ${docRef.id}`);
        
        // Add initial user to timestamps collection
        await setDoc(doc(firestore, 'lineupSessions', docRef.id, 'spotlightJoinTimes', userId), {
          joinedAt: serverTimestamp(),
          gender: userGender,
          categoryId,
          completed: false
        });
        
        return { 
          ...newSession, 
          id: docRef.id,
          contestants: [userId] // Add this line
        } as LineUpSessionData;
      }
    } catch (error) {
      debugLog('Join', `Error joining lineup session (attempt ${attempt + 1}):`, error);
      
      if (attempt === MAX_RETRIES - 1) {
        throw error; // Re-throw on last attempt
      }
      
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer between retries
    }
  }
  
  throw new Error('Failed to join lineup session after multiple attempts');
};

// Count spotlights of the same gender
export const getSpotlightsOfSameGender = async (sessionId: string, gender: string): Promise<number> => {
  debugLog('GenderCount', `Counting ${gender} spotlights for session ${sessionId}`);
  const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes');
  const joinTimesQuery = query(joinTimesRef, where('gender', '==', gender));
  const result = (await getDocs(joinTimesQuery)).size;
  debugLog('GenderCount', `Found ${result} ${gender} spotlights`);
  return result;
};

// Get current spotlight data with gender filtering
export const getCurrentSpotlightData = async (sessionId: string, userId: string): Promise<Contestant | null> => {
  try {
    debugLog('CurrentSpotlight', `Getting current spotlight for user ${userId} in session ${sessionId}`);
    
    // Get user gender
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      debugLog('CurrentSpotlight', "User document not found");
      return null;
    }
    
    const userGender = userDoc.data().gender || '';
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    debugLog('CurrentSpotlight', `User gender: ${userGender}, looking for opposite gender: ${oppositeGender}`);
    
    // Get session data with gender-specific fields
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('CurrentSpotlight', "Session document not found");
      return null;
    }
    
    // Get the spotlight ID from the appropriate gender field
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase() + oppositeGender.slice(1)}SpotlightId`;
    const currentSpotlightId = sessionDoc.data()[oppositeGenderField];
    debugLog('CurrentSpotlight', `Current ${oppositeGender} spotlight ID: ${currentSpotlightId}`);
    
    if (!currentSpotlightId) {
      debugLog('CurrentSpotlight', `No ${oppositeGender} spotlight found in session`);
      return null;
    }
    
    // Get current spotlight data
    const spotlightDoc = await getDoc(doc(firestore, 'users', currentSpotlightId));
    if (!spotlightDoc.exists()) {
      debugLog('CurrentSpotlight', "Spotlight document not found");
      return null;
    }
    
    const spotlightData = spotlightDoc.data();
    
    // Build and return spotlight object
    return {
      id: currentSpotlightId,
      displayName: spotlightData.displayName || 'User',
      photoURL: spotlightData.photoURL || '',
      ageRange: spotlightData.ageRange || '',
      bio: spotlightData.bio || '',
      location: spotlightData.location || '',
      interests: spotlightData.interests || [],
      gender: spotlightData.gender || ''
    };
  } catch (error) {
    debugLog('CurrentSpotlight', 'Error getting current spotlight:', error);
    return null;
  }
};

/**
 * Get spotlights from service with better gender-specific filtering
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
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    debugLog('GetSpotlights', `User gender: ${userGender}, looking for opposite gender: ${oppositeGender}`);
    
    // Get session data
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      throw new Error("Session not found");
    }
    const sessionData = sessionDoc.data();
    const sessionCategory = sessionData.category || [];
    debugLog('GetSpotlights', `Session category: ${sessionCategory.join(', ')}`);
    
    // CRITICAL FIX: Check if there's a current spotlight for the opposite gender
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase() + oppositeGender.slice(1)}SpotlightId`;
    const currentOppositeGenderSpotlightId = sessionData[oppositeGenderField];
    
    // If there's no current spotlight of opposite gender, return empty array
    if (!currentOppositeGenderSpotlightId) {
      debugLog('GetSpotlights', `No current ${oppositeGender} spotlight - returning empty array`);
      return [];
    }
    
    // Get all spotlights by checking join times collection - CRITICAL: Filter out completed spotlights
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef, 
      where('gender', '==', oppositeGender),
      where('completed', '==', false), // CRITICAL: Only get active spotlights
      orderBy('joinedAt', 'asc') // Critical FIFO order by join time
    );

    const joinTimesSnapshot = await getDocs(joinTimesQuery);
    // Log raw profiles for debugging
    debugLog('GetSpotlights', `Raw profiles count: ${joinTimesSnapshot.size}`);
    
    // Create a spotlights array with proper typing
    const allSpotlights: Contestant[] = [];
    
    // Get user data for all spotlights of opposite gender
    for (const timeDoc of joinTimesSnapshot.docs) {
      const spotlightId = timeDoc.id;
      
      // Skip current user
      if (spotlightId === userId) {
        continue;
      }
      
      const spotlightDoc = await getDoc(doc(firestore, 'users', spotlightId));
      if (spotlightDoc.exists()) {
        const spotlightData = spotlightDoc.data();
        debugLog('GetSpotlights', `Profile: ${spotlightData.displayName}, Gender: ${spotlightData.gender}, ID: ${spotlightId}`);
        
        // Double check gender to be safe
        if (spotlightData.gender === oppositeGender) {
          // Create a Contestant object
          const spotlight: Contestant = {
            id: spotlightId,
            displayName: spotlightData.displayName || 'User',
            photoURL: spotlightData.photoURL || '',
            ageRange: spotlightData.ageRange || '??',
            bio: spotlightData.bio || '',
            location: spotlightData.location || '',
            interests: spotlightData.interests || [],
            gender: spotlightData.gender
          };
          
          allSpotlights.push(spotlight);
          debugLog('GetSpotlights', `Including profile ${spotlight.displayName} (Gender: ${spotlight.gender})`);
        } else {
          debugLog('GetSpotlights', `Excluding profile ${spotlightData.displayName} - wrong gender: ${spotlightData.gender}`);
        }
      }
    }
    
    debugLog('GetSpotlights', `Filtered to ${allSpotlights.length} profiles of gender ${oppositeGender}`);
    
    // Make sure current spotlight is included and first in the list
    let currentSpotlightIncluded = false;
    if (currentOppositeGenderSpotlightId) {
      // Check if current spotlight is already in our list
      currentSpotlightIncluded = allSpotlights.some(c => c.id === currentOppositeGenderSpotlightId);
      
      // If not included, try to fetch and add them
      if (!currentSpotlightIncluded) {
        debugLog('GetSpotlights', `Current spotlight ${currentOppositeGenderSpotlightId} not in list, fetching separately`);
        const spotlightDoc = await getDoc(doc(firestore, 'users', currentOppositeGenderSpotlightId));
        
        if (spotlightDoc.exists()) {
          const data = spotlightDoc.data();
          if (data.gender === oppositeGender) {
            const currentSpotlight: Contestant = {
              id: currentOppositeGenderSpotlightId,
              displayName: data.displayName || 'User',
              photoURL: data.photoURL || '',
              ageRange: data.ageRange || '',
              bio: data.bio || '',
              location: data.location || '',
              interests: data.interests || [],
              gender: data.gender || oppositeGender
            };
            
            // Add to beginning of array
            allSpotlights.unshift(currentSpotlight);
            currentSpotlightIncluded = true;
            debugLog('GetSpotlights', `Added current spotlight ${currentSpotlight.displayName} to beginning of list`);
          }
        }
      } else {
        // Move current spotlight to the beginning of the array
        const currentIndex = allSpotlights.findIndex(c => c.id === currentOppositeGenderSpotlightId);
        if (currentIndex > 0) {
          const currentSpotlight = allSpotlights.splice(currentIndex, 1)[0];
          allSpotlights.unshift(currentSpotlight);
          debugLog('GetSpotlights', `Moved current spotlight ${currentSpotlight.displayName} to beginning of list`);
        }
      }
    }
    
    // Calculate match percentages for each spotlight
    const spotlightsWithMatchPercentage = await Promise.all(
      allSpotlights.map(async (spotlight) => {
        const matchPercentage = await calculateMatchPercentage(userId, spotlight.id);
        return {
          ...spotlight,
          matchPercentage
        };
      })
    );
    
    return spotlightsWithMatchPercentage;
  } catch (error) {
    debugLog('GetSpotlights', 'Error getting spotlights:', error);
    return [];
  }
};

// Record user action (like/pop)
export const recordAction = async (sessionId: string, userId: string, spotlightId: string, action: 'like' | 'pop') => {
  debugLog('Action', `Recording ${action} from user ${userId} to spotlight ${spotlightId}`);
  
  // Record action in the session actions
  await addDoc(collection(firestore, 'lineupSessions', sessionId, 'actions'), {
    fromUserId: userId,
    toUserId: spotlightId,
    action,
    timestamp: serverTimestamp()
  });
  
  // Update spotlight's like/pop count
  const countField = action === 'like' ? 'likeCount' : 'popCount';
  
  // Check if stats document exists, if not create it
  const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', spotlightId);
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
  
  // If it's a like, also record in likes collection for matching
  if (action === 'like') {
    await setDoc(doc(firestore, 'likes', `${userId}_${spotlightId}`), {
      fromUserId: userId,
      toUserId: spotlightId,
      createdAt: serverTimestamp(),
      status: 'pending',
      source: 'lineup'
    });
  }
  
  // If spotlight has >= 20 pop counts, eliminate them
  if (action === 'pop') {
    const updatedStatsDoc = await getDoc(statsRef);
    if (updatedStatsDoc.exists() && (updatedStatsDoc.data().popCount || 0) >= 20) {
      await eliminateUser(sessionId, spotlightId);
    }
  }
};

// Check for a match after like
export const checkForMatch = async (userId: string, likedUserId: string): Promise<boolean> => {
  // Check if the other user has liked this user
  const likeDoc = await getDoc(doc(firestore, 'likes', `${likedUserId}_${userId}`));
  return likeDoc.exists();
};

// Get user's pop count
export const getUserPopCount = async (sessionId: string, userId: string): Promise<number> => {
  const statsDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', userId));
  
  if (statsDoc.exists()) {
    return statsDoc.data().popCount || 0;
  }
  
  return 0;
};

// Eliminate user
export const eliminateUser = async (sessionId: string, userId: string) => {
  debugLog('Eliminate', `Eliminating user ${userId} from session ${sessionId}`);
  
  // Add user to eliminated list
  await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
    eliminatedUsers: increment(1)
  });
  
  // Record elimination with timestamp
  await setDoc(doc(firestore, 'userEliminations', userId), {
    eliminatedAt: serverTimestamp(),
    eligibleAt: Timestamp.fromDate(new Date(Date.now() + ELIMINATION_TIMER_SECONDS * 1000)),
    sessionId
  });
  
  // Update the lineup session to remove this user from spotlights array
  const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
  if (sessionDoc.exists()) {
    const sessionData = sessionDoc.data();
    const spotlights = sessionData.spotlights || [];
    const updatedSpotlights = spotlights.filter(id => id !== userId);
    
    await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
      spotlights: updatedSpotlights
    });
    
    // If this was the current spotlight, move to the next one
    if (sessionData.currentSpotlightId === userId) {
      if (updatedSpotlights.length > 0) {
        await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
          currentSpotlightId: updatedSpotlights[0]
        });
      }
    }
    
    // Check gender-specific fields
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const userGender = userDoc.data().gender || '';
      if (userGender === 'male' && sessionData.currentMaleSpotlightId === userId) {
        // Rotate to next male
        await rotateNextSpotlight(sessionId, 'male');
      } else if (userGender === 'female' && sessionData.currentFemaleSpotlightId === userId) {
        // Rotate to next female
        await rotateNextSpotlight(sessionId, 'female');
      }
    }
  }
};

// Subscribe to messages
export const subscribeToMessages = (sessionId: string, callback: (messages: ChatMessage[]) => void) => {
  const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    
    callback(messages);
  });
};

// Send a message
export const sendMessage = async (sessionId: string, message: Omit<ChatMessage, 'id'>) => {
  await addDoc(collection(firestore, 'lineupSessions', sessionId, 'messages'), {
    ...message,
    timestamp: serverTimestamp()
  });
};

// Track profile views
export const trackProfileView = async (sessionId: string, viewerId: string, profileId: string): Promise<void> => {
  if (viewerId === profileId) return; // Don't count self-views
  
  try {
    debugLog('ProfileView', `Tracking view from ${viewerId} for profile ${profileId}`);
    
    // Get viewer gender to validate opposite gender view
    const viewerDoc = await getDoc(doc(firestore, 'users', viewerId));
    const profileDoc = await getDoc(doc(firestore, 'users', profileId));
    
    if (!viewerDoc.exists() || !profileDoc.exists()) {
      debugLog('ProfileView', "User documents not found, skipping view tracking");
      return;
    }
    
    const viewerGender = viewerDoc.data().gender || '';
    const profileGender = profileDoc.data().gender || '';
    
    // Only count if opposite gender
    if (viewerGender !== profileGender) {
      debugLog('ProfileView', `Valid view - opposite genders: ${viewerGender} viewing ${profileGender}`);
      
      // Check if view already exists
      const viewId = `${viewerId}_${profileId}`;
      const viewRef = doc(firestore, 'lineupSessions', sessionId, 'profileViews', viewId);
      const viewDoc = await getDoc(viewRef);
      
      // Only update stats if first time viewing
      if (!viewDoc.exists()) {
        debugLog('ProfileView', "First-time view, incrementing view count");
        
        // Record the view
        await setDoc(viewRef, {
          viewerId,
          profileId,
          timestamp: serverTimestamp()
        });
        
        // Update view count in stats
        const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', profileId);
        const statsDoc = await getDoc(statsRef);
        
        if (statsDoc.exists()) {
          await updateDoc(statsRef, {
            viewCount: increment(1)
          });
        } else {
          await setDoc(statsRef, {
            viewCount: 1,
            likeCount: 0,
            popCount: 0
          });
        }
      } else {
        debugLog('ProfileView', "Repeat view, not incrementing view count");
      }
    } else {
      debugLog('ProfileView', `Skipping view count - same gender: ${viewerGender}`);
    }
  } catch (error) {
    debugLog('ProfileView', 'Error tracking profile view:', error);
  }
};

// Get user's matches
export const getUserMatches = async (sessionId: string, userId: string): Promise<MatchData[]> => {
  debugLog('Matches', `Getting matches for user ${userId} in session ${sessionId}`);
  
  // Get all likes TO this user (incoming likes)
  const incomingLikesRef = collection(firestore, 'likes');
  const incomingQuery = query(incomingLikesRef, where('toUserId', '==', userId), where('status', '==', 'pending'));
  
  const incomingSnapshot = await getDocs(incomingQuery);
  debugLog('Matches', `Found ${incomingSnapshot.size} incoming likes`);
  
  if (incomingSnapshot.empty) {
    return [];
  }
  
  // Process all likes
  const matches: MatchData[] = [];
  
  for (const likeDoc of incomingSnapshot.docs) {
    const likeData = likeDoc.data();
    const fromUserId = likeData.fromUserId;
    
    // Check if this is a mutual match (both users liked each other)
    const mutualLikeCheck = await getDoc(doc(firestore, 'likes', `${userId}_${fromUserId}`));
    const isMutualMatch = mutualLikeCheck.exists();
    
    // Get user info for the person who liked current user
    const userDoc = await getDoc(doc(firestore, 'users', fromUserId));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // Calculate match percentage
      const matchPercentage = await calculateMatchPercentage(userId, fromUserId);
      
      matches.push({
        userId: fromUserId,
        displayName: userData.displayName || 'User',
        photoURL: userData.photoURL || '',
        matchPercentage,
        timestamp: likeData.createdAt,
        isMutualMatch // Add this flag to differentiate mutual matches
      });
    }
  }
  
  // Sort by match percentage (highest first)
  matches.sort((a, b) => b.matchPercentage - a.matchPercentage);
  debugLog('Matches', `Returning ${matches.length} matches (both mutual and pending)`);
  
  return matches;
}

// Check for existing chat
export const checkExistingChat = async (userId1: string, userId2: string): Promise<string | null> => {
  debugLog('Chat', `Checking for existing chat between ${userId1} and ${userId2}`);
  
  const matchesRef = collection(firestore, 'matches');
  const q = query(matchesRef, where('users', 'array-contains', userId1));
  
  const snapshot = await getDocs(q);
  
  for (const docSnapshot of snapshot.docs) {
    const matchData = docSnapshot.data();
    
    if (matchData.users && matchData.users.includes(userId2)) {
      debugLog('Chat', `Found existing chat: ${docSnapshot.id}`);
      return docSnapshot.id;
    }
  }
  
  debugLog('Chat', `No existing chat found`);
  return null;
};

// Create a new chat
export const createChat = async (userId1: string, userId2: string, source: string): Promise<string> => {
  debugLog('Chat', `Creating new chat between ${userId1} and ${userId2}`);
  
  // Get user profiles
  const user1Doc = await getDoc(doc(firestore, 'users', userId1));
  const user2Doc = await getDoc(doc(firestore, 'users', userId2));
  
  if (!user1Doc.exists() || !user2Doc.exists()) {
    debugLog('Chat', 'Error: One or both users not found', { 
      user1Exists: user1Doc.exists(), 
      user2Exists: user2Doc.exists() 
    });
    throw new Error('One or both users not found');
  }
  
  const user1Data = user1Doc.data();
  const user2Data = user2Doc.data();
  
  debugLog('Chat', 'Retrieved user profiles', {
    user1: user1Data.displayName,
    user2: user2Data.displayName
  });
  
  // Create match document
  try {
    const matchRef = await addDoc(collection(firestore, 'matches'), {
      users: [userId1, userId2],
      userProfiles: {
        [userId1]: {
          displayName: user1Data?.displayName || 'User',
          photoURL: user1Data?.photoURL || '',
          gender: user1Data?.gender || ''
        },
        [userId2]: {
          displayName: user2Data?.displayName || 'User',
          photoURL: user2Data?.photoURL || '',
          gender: user2Data?.gender || ''
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
    
    debugLog('Chat', `Chat created successfully with ID: ${matchRef.id}`);
    
    // Add welcome message
    await addDoc(collection(firestore, 'matches', matchRef.id, 'messages'), {
      text: `You've been matched from the Line-Up! Say hello to start the conversation.`,
      senderId: 'system',
      createdAt: serverTimestamp(),
      status: 'sent'
    });
    
    // Add notifications for both users
    try {
      await NotificationService.addLineupMatchNotification(
        userId1, 
        userId2, 
        user2Data?.displayName || 'User'
      );
      
      await NotificationService.addLineupMatchNotification(
        userId2, 
        userId1, 
        user1Data?.displayName || 'User'
      );
      
      debugLog('Chat', 'Match notifications sent to both users');
    } catch (error) {
      debugLog('Chat', 'Failed to send match notifications', { error });
      // Continue despite notification error
    }
    
    return matchRef.id;
  } catch (error) {
    debugLog('Chat', 'Error creating chat', { error });
    throw new Error('Failed to create chat');
  }
};

// Subscribe to user turn
export const subscribeToUserTurn = (
  sessionId: string, 
  userId: string, 
  callback: (isUserTurn: boolean) => void
) => {
  debugLog('Turn', `Setting up turn subscription for user ${userId} in session ${sessionId}`);
  
  if (!sessionId || !userId) {
    debugLog('Turn', 'Invalid parameters for turn subscription');
    return () => {}; // No-op unsubscribe
  }
  
  const sessionRef = doc(firestore, 'lineupSessions', sessionId);
  
  // Create subscription
  return onSnapshot(sessionRef, async (snapshot) => {
    if (snapshot.exists()) {
      const sessionData = snapshot.data();
      
      // Check user gender to detect correct turn
      try {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (!userDoc.exists()) {
          debugLog('Turn', 'User document not found');
          callback(false);
          return;
        }
        
        const userGender = userDoc.data().gender || '';
        const userGenderField = `current${userGender.charAt(0).toUpperCase() + userGender.slice(1)}SpotlightId`;
        
        // Check if this user is current spotlight for their gender
        const isUserTurn = sessionData[userGenderField] === userId;
        
        // Add a local throttle to prevent rapid fire notifications
        const lastCallTime = Date.now();
        const THROTTLE_MS = 1000; // 1 second minimum between callbacks
        
        debugLog('Turn', `Turn subscription update: isUserTurn=${isUserTurn}`, {
          userGender,
          userGenderField,
          currentValue: sessionData[userGenderField],
          userId
        });
        
        if (Date.now() - lastCallTime >= THROTTLE_MS) {
          callback(isUserTurn);
        }
      } catch (error) {
        debugLog('Turn', 'Error in turn subscription:', error);
        callback(false);
      }
    } else {
      debugLog('Turn', 'Session no longer exists');
      callback(false);
    }
  });
};

// Check if user is eligible for lineup (not eliminated in the past 48 hours)
export const checkUserEligibility = async (userId: string): Promise<boolean> => {
  debugLog('Eligibility', `Checking eligibility for user ${userId}`);
  
  const eliminationDoc = await getDoc(doc(firestore, 'userEliminations', userId));
  
  if (!eliminationDoc.exists()) {
    debugLog('Eligibility', 'No elimination record found, user is eligible');
    return true; // No elimination record
  }
  
  const eliminationData = eliminationDoc.data();
  const eligibleAt = eliminationData.eligibleAt.toDate();
  const now = new Date();
  
  const isEligible = now >= eligibleAt;
  debugLog('Eligibility', `User eligibility result: ${isEligible}`, {
    eligibleAt: eligibleAt.toISOString(),
    now: now.toISOString(),
    timeRemaining: Math.max(0, eligibleAt.getTime() - now.getTime()) / 1000
  });
  
  return isEligible;
};

// Helper to determine gender
const determineGender = async (sessionId: string, specifiedGender?: string): Promise<string | null> => {
  // Use specified gender if provided
  if (specifiedGender) return specifiedGender;
  
  try {
    // Otherwise determine from current spotlight
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) return null;
    
    const currentSpotlightId = sessionDoc.data().currentSpotlightId;
    if (!currentSpotlightId) return null;
    
    const spotlightDoc = await getDoc(doc(firestore, 'users', currentSpotlightId));
    return spotlightDoc.exists() ? (spotlightDoc.data().gender || 'male') : 'male';
  } catch (error) {
    debugLog('Gender', 'Error determining gender:', error);
    return 'male'; // Default fallback
  }
};

/**
 * Rotate to next spotlight with gender specific handling
 * This addresses the issue of maintaining proper rotation order based on join time
 */
export const rotateNextSpotlight = async (sessionId: string, gender?: string): Promise<void> => {
  // Get gender information consistently 
  const spotlightGender = await determineGender(sessionId, gender);
  if (!spotlightGender) return;
  
  // Lock key combines session and gender
  const lockKey = `${sessionId}_${spotlightGender}`;
  
  // Check if already locked
  if (rotationLocks.get(lockKey)) {
    debugLog('Rotation', `Rotation already in progress for ${spotlightGender} in session ${sessionId}`);
    return;
  }
  
  // Set lock
  rotationLocks.set(lockKey, true);
  
  // Store ID outside transaction scope
  let currentContestId;
  
  try {
    // Use proper field names consistently
    const genderField = `current${spotlightGender.charAt(0).toUpperCase()}${spotlightGender.slice(1)}ContestantId`;
    const rotationTimeField = `${spotlightGender}LastRotationTime`;
    
    // Use transaction for atomic update
    await runTransaction(firestore, async (transaction) => {
      // Get latest session data
      const sessionRef = doc(firestore, 'lineupSessions', sessionId);
      const sessionSnapshot = await transaction.get(sessionRef);
      
      if (!sessionSnapshot.exists()) {
        throw new Error('Session not found during rotation');
      }
      
      const sessionData = sessionSnapshot.data();
      const currentContestantId = sessionData[genderField];
      
      // Save to outer scope
      currentContestId = currentContestantId;
      
      // Get ordered spotlight list by join time (FIFO)
      const orderedSpotlights = await getOrderedSpotlightsByGender(sessionId, spotlightGender);
      if (orderedSpotlights.length === 0) {
        debugLog('Rotation', `No ${spotlightGender} spotlights available for rotation`);
        return;
      }
      
      // Find next spotlight index
      const currentIndex = orderedSpotlights.indexOf(currentContestantId);
      let nextIndex = 0;
      if (currentIndex !== -1 && currentIndex < orderedSpotlights.length - 1) {
        nextIndex = currentIndex + 1;
      }
      
      const nextContestantId = orderedSpotlights[nextIndex];
      
      // Verify we're not rotating to the same person
      if (nextContestantId === currentContestantId) {
        debugLog('Rotation', `No other ${spotlightGender} spotlights available to rotate to`);
        return;
      }
      
      // Update the session
      const updates: Record<string, any> = {
        [genderField]: nextContestantId,
        [rotationTimeField]: serverTimestamp()
      };
      
      // Update general fields if needed
      const isPrimaryGender = isPrimaryGenderForSession(sessionData, spotlightGender);
      if (isPrimaryGender || sessionData.currentContestantId === currentContestantId) {
        updates.currentContestantId = nextContestantId;
        updates.lastRotationTime = serverTimestamp();
      }
      
      transaction.update(sessionRef, updates);
      
      // Add notification and rotation event
      if (nextContestantId) {
        transaction.set(doc(firestore, 'notifications', `turn_${nextContestantId}_${Date.now()}`), {
          userId: nextContestantId,
          type: 'lineup_turn',
          message: "It's your turn in the Line-Up! You're now in the spotlight.",
          data: { sessionId },
          createdAt: serverTimestamp(),
          isRead: false
        });
        
        transaction.set(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
          timestamp: serverTimestamp(),
          rotationId: Date.now().toString(),
          previousContestantId: currentContestantId,
          newContestantId: nextContestantId,
          gender: spotlightGender
        });
      }
    });
    
    // Mark previous spotlight as completed (outside transaction)
    if (currentContestId) {
      await markSpotlightAsCompleted(sessionId, currentContestId);
    }
    
  } catch (error) {
    debugLog('Rotation', `Error rotating ${spotlightGender} spotlight:`, error);
  } finally {
    // Release lock
    rotationLocks.set(lockKey, false);
  }
};

/**
 * Mark a spotlight as completed - critical for proper rotation
 */
async function markSpotlightAsCompleted(sessionId: string, userId: string): Promise<void> {
  if (!userId) return;
  
  try {
    // Get current user info for logging
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    const userGender = userDoc.exists() ? userDoc.data().gender || 'unknown' : 'unknown';
    
    debugLog('Rotation', `Marking ${userGender} spotlight ${userId} as completed`);
    
    // Set completed flag and timestamp
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes', userId), {
      completed: true,
      completedAt: serverTimestamp()
    }, { merge: true }); // Important: merge to preserve join time
    
    // Also remove from spotlights array in session
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      const spotlights = sessionData.spotlights || [];
      
      // Create updated array without this user
      const updatedSpotlights = spotlights.filter(id => id !== userId);
      
      await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
        spotlights: updatedSpotlights
      });
      
      debugLog('Rotation', `Removed ${userId} from spotlights array, new count: ${updatedSpotlights.length}`);
    }
    
    debugLog('Rotation', `Successfully marked spotlight ${userId} as completed`);
  } catch (error) {
    debugLog('Rotation', `Error marking spotlight as completed:`, error);
  }
}

/**
 * Get ordered spotlights by gender, strictly enforcing completed status
 */
export const getOrderedSpotlightsByGender = async (sessionId: string, gender: string): Promise<string[]> => {
  try {
    // FIX #3: Improved query with better error handling
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef, 
      where('gender', '==', gender),
      where('completed', '==', false), // Only include active spotlights
      orderBy('joinedAt', 'asc') // FIFO order by join time
    );
    
    const snapshot = await getDocs(joinTimesQuery);
    
    // Double verify - remove any spotlights with completed=true (backup check)
    const filteredIds = snapshot.docs
      .filter(doc => doc.data().completed !== true)
      .map(doc => doc.id);
      
    debugLog('Spotlights', `Found ${filteredIds.length} active ${gender} spotlights: ${filteredIds.join(', ')}`);
    
    // FIX #4: Ensure we actually have valid spotlight IDs
    if (filteredIds.length === 0) {
      // Check if we can find ANY spotlights of this gender, even if marked completed
      const allGenderQuery = query(
        joinTimesRef,
        where('gender', '==', gender)
      );
      
      const allGenderSnapshot = await getDocs(allGenderQuery);
      const allIds = allGenderSnapshot.docs.map(doc => doc.id);
      
      if (allIds.length > 0) {
        // Reset one spotlight to be active again to ensure we always have someone
        const firstId = allIds[0];
        await updateDoc(doc(joinTimesRef, firstId), {
          completed: false,
          resetAt: serverTimestamp()
        });
        
        debugLog('Spotlights', `Reset spotlight ${firstId} to active state`);
        return [firstId];
      }
    }
    
    return filteredIds;
  } catch (error) {
    debugLog('Spotlights', 'Error getting ordered spotlights:', error);
    return [];
  }
};

/**
 * Function to check if a gender is the primary gender for a session
 * This helps determine which field to update
 */
function isPrimaryGenderForSession(sessionData: any, gender: string): boolean {
  // If explicitly configured in session data, use that
  if (sessionData.primaryGender) {
    return sessionData.primaryGender === gender;
  }
  
  // Implicit gender detection based on category
  const category = sessionData.category?.[0];
  switch (category) {
    case 'professionals':
      return gender === 'male';
    // Add more category-specific logic as needed
    default:
      return gender === 'female'; // Default to female as primary for most categories
  }
}



// Add turn notification
export const addTurnNotification = async (sessionId: string, userId: string): Promise<void> => {
  debugLog('Notification', `Adding turn notification for user ${userId} in session ${sessionId}`);
  
  // Add notification record
  try {
    await addDoc(collection(firestore, 'notifications'), {
      userId,
      type: 'lineup_turn',
      message: "It's your turn in the Line-Up! You're now in the spotlight.",
      data: { sessionId },
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    debugLog('Notification', 'Turn notification added successfully');
  } catch (error) {
    debugLog('Notification', 'Error adding turn notification:', error);
    throw error;
  }
};

// Mark user as active in session (for online status tracking)
export const markUserActive = async (sessionId: string, userId: string): Promise<void> => {
  debugLog('Activity', `Marking user ${userId} as active in session ${sessionId}`);
  
  try {
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'activeUsers', userId), {
      lastActive: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    debugLog('Activity', 'Error marking user as active:', error);
    // Don't throw - this is a non-critical operation
  }
};

// Get remaining time for a specific gender spotlight
export const getRemainingTime = async (sessionId: string, gender: 'male' | 'female'): Promise<number> => {
  debugLog('Timer', `Getting remaining time for ${gender} spotlight in session ${sessionId}`);
  
  try {
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('Timer', 'Session not found');
      return 0;
    }
    
    const sessionData = sessionDoc.data();
    
    // Get the proper rotation time field for the specified gender
    const rotationTimeField = `${gender}LastRotationTime`;
    const lastRotationTime = sessionData[rotationTimeField]?.toDate();
    
    if (!lastRotationTime) {
      debugLog('Timer', `No specific rotation time found for ${gender}, checking general field`);
      // Fall back to general rotation time if gender-specific not available
      const generalLastRotationTime = sessionData.lastRotationTime?.toDate();
      
      if (!generalLastRotationTime) {
        debugLog('Timer', 'No rotation time found at all, returning default time');
        return SPOTLIGHT_TIMER_SECONDS; // Use constant instead of hardcoded value
      }
      
      const elapsedSeconds = Math.floor((Date.now() - generalLastRotationTime.getTime()) / 1000);
      const remainingSeconds = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
      
      debugLog('Timer', `${gender} spotlight remaining time (from general field): ${remainingSeconds}s`);
      return remainingSeconds;
    }
    
    // Calculate time normally using gender-specific field
    const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
    
    debugLog('Timer', `${gender} spotlight remaining time: ${remainingSeconds}s`, {
      lastRotationTime: lastRotationTime.toISOString(),
      now: new Date().toISOString(),
      elapsedSeconds,
      maxTime: SPOTLIGHT_TIMER_SECONDS
    });
    
    return remainingSeconds;
  } catch (error) {
    debugLog('Timer', 'Error getting remaining time:', error);
    return 0; // Default to zero on error
  }
};

// Calculate and return gender-specific spotlight times
export const getSpotlightTimes = async (sessionId: string): Promise<{male: number, female: number}> => {
  try {
    const maleTime = await getRemainingTime(sessionId, 'male');
    const femaleTime = await getRemainingTime(sessionId, 'female');
    
    return { male: maleTime, female: femaleTime };
  } catch (error) {
    debugLog('Timer', 'Error getting spotlight times:', error);
    return { male: 0, female: 0 };
  }
};

// Helper to get primary gender for a session (based on category)
async function getPrimaryGender(sessionId: string): Promise<'male' | 'female'> {
  try {
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) return 'male'; // Default
    
    const category = sessionDoc.data().category?.[0];
    
    // You can customize this based on your app's logic
    // For example, certain categories might prioritize one gender
    switch (category) {
      case 'professionals':
        return 'male';
      default:
        return 'female';
    }
  } catch (error) {
    debugLog('Gender', 'Error determining primary gender:', error);
    return 'male'; // Default
  }
}

// Request forced rotation (client-side rotation request mechanism)
export const requestForcedRotation = async (sessionId: string, userId: string): Promise<void> => {
  debugLog('ForcedRotation', `User ${userId} is requesting forced rotation for session ${sessionId}`);
  
  try {
    // Create rotation request document
    const requestRef = doc(firestore, 'lineupSessions', sessionId, 'rotationRequests', userId);
    await setDoc(requestRef, {
      userId,
      requestedAt: serverTimestamp(),
      processed: false
    });
    
    debugLog('ForcedRotation', `Rotation request added successfully`);
    
    // Try to directly trigger rotation for faster response
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const userGender = userDoc.data().gender || '';
      await rotateNextSpotlight(sessionId, userGender);
    }
  } catch (error) {
    debugLog('ForcedRotation', 'Error requesting forced rotation:', error);
    // Don't throw - this is a backup mechanism
  }
};

// GENDER FILTERING FOR CHAT MESSAGES

/**
* Get user gender from Firestore
* @param userId User ID to get gender for
* @returns User's gender or null if not found
*/
export const getUserGender = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data().gender || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user gender:', error);
    return null;
  }
};

/**
* Get gender-filtered messages for chat display
* @param sessionId Session ID
* @param userId Current user ID
* @param isSpotlight Whether current user is the spotlight
* @returns Filtered chat messages for display
*/
export const getGenderFilteredMessages = async (
  sessionId: string,
  userId: string,
  currentSpotlightId: string | null
): Promise<ChatMessage[]> => {
  const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  const snapshot = await getDocs(q);
  const allMessages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as ChatMessage[];
  
  // If user is current spotlight, they only need to see messages from the opposite gender
  const isUserSpotlight = userId === currentSpotlightId;
  
  if (!isUserSpotlight) {
    // User is in waiting room, only see messages from current spotlight
    return allMessages.filter(msg => 
      msg.senderId === userId ||      // User's own messages
      msg.senderId === 'system' ||    // System messages
      msg.senderId === currentSpotlightId // Current spotlight's messages
    );
  }
  
  // Current spotlight needs to see messages from opposite gender users
  const userGender = await getUserGender(userId);
  
  if (!userGender) return allMessages; // Fallback to show all if we can't determine gender
  
  // Create a cache of user genders to avoid fetching repeatedly
  const genderCache = new Map<string, string>();
  genderCache.set(userId, userGender);
  
  // Filter messages
  const filteredMessages: ChatMessage[] = [];
  
  for (const message of allMessages) {
    // Always include user's own messages
    if (message.senderId === userId || message.senderId === 'system') {
      filteredMessages.push(message);
      continue;
    }
    
    // Get sender gender if not in cache
    if (!genderCache.has(message.senderId)) {
      const senderGender = await getUserGender(message.senderId);
      if (senderGender) {
        genderCache.set(message.senderId, senderGender);
      }
    }
    
    const senderGender = genderCache.get(message.senderId);
    
    // Include message if sender's gender is opposite of user's gender
    if (senderGender && senderGender !== userGender) {
      filteredMessages.push(message);
    }
  }
  
  return filteredMessages;
};

/**
* Subscribe to gender-filtered messages
* @param sessionId Session ID
* @param userId Current user ID
* @param currentSpotlightId Current spotlight ID
* @param callback Function to call with filtered messages
* @returns Unsubscribe function
*/
export const subscribeToGenderFilteredMessages = (
  sessionId: string, 
  userId: string,
  currentSpotlightId: string | null,
  callback: (messages: ChatMessage[]) => void
) => {
  if (!sessionId || !userId) {
    console.log("Missing parameters for message subscription");
    callback([]); 
    return () => {};
  }
  
  const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  
  // Determine if user is the current spotlight
  const isCurrentSpotlight = userId === currentSpotlightId;
  
  // Gender cache to minimize database calls
  const genderCache = new Map<string, string>();
  
  // Initial load of user gender
  let userGender: string | null = null;
  getUserGender(userId).then(gender => {
    userGender = gender;
    if (userGender) genderCache.set(userId, userGender);
  });
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    
    const processMessages = async () => {
      // Ensure we have user's gender
      if (!userGender) {
        userGender = await getUserGender(userId);
        if (userGender) genderCache.set(userId, userGender);
      }
      
      const filteredMessages: ChatMessage[] = [];
      
      for (const message of messages) {
        // Always include user's own messages and system messages
        if (message.senderId === userId || message.senderId === 'system') {
          filteredMessages.push(message);
          continue;
        }
        
        // Get sender gender (from message, cache, or database)
        let senderGender = message.senderGender || null;
        if (!senderGender) {
          if (genderCache.has(message.senderId)) {
            senderGender = genderCache.get(message.senderId) || null;
          } else {
            senderGender = await getUserGender(message.senderId);
            if (senderGender) genderCache.set(message.senderId, senderGender);
          }
        }
        
        if (!senderGender) continue; // Skip if we can't determine gender
        
        // For spotlights (in private screen)
        if (isCurrentSpotlight) {
          // Include ALL messages from opposite gender users
          if (senderGender !== userGender) {
            filteredMessages.push(message);
          }
        } 
        // For waiting room users (in lineup screen)
        else {
          // Include current spotlight's messages regardless of gender
          if (message.senderId === currentSpotlightId) {
            filteredMessages.push(message);
          }
          
          // Also include messages from any user with the SAME gender as current spotlight
          const spotlightGender = genderCache.get(currentSpotlightId || '') || 
            await getUserGender(currentSpotlightId || '');
            
          if (spotlightGender && senderGender === spotlightGender) {
            filteredMessages.push(message);
          }
        }
      }
      
      callback(filteredMessages);
    };
    
    processMessages();
  });
};

/**
* Subscribe to spotlight changes in a session
* @param sessionId Session ID
* @param callback Function to call when spotlights change
* @returns Unsubscribe function
*/
export const subscribeToSpotlights = (
  sessionId: string,
  callback: (spotlightId: string | null) => void
): () => void => {
  const sessionRef = doc(firestore, 'lineupSessions', sessionId);
  
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback(data.currentSpotlightId || null);
    } else {
      callback(null);
    }
  });
};

// After successful rotation, notify all clients via a special document
export const notifySpotlightRotation = async (sessionId: string): Promise<void> => {
  try {
    // Create or update a rotation notification document
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
      timestamp: serverTimestamp(),
      rotationId: Date.now().toString()
    });
    
    debugLog('Rotation', 'Successfully notified all clients of rotation');
  } catch (error) {
    debugLog('Rotation', 'Error notifying rotation:', error);
  }
};


/**
 * Auto-select a spotlight for a gender if none exists
 * This is a critical failsafe to prevent empty lineup screens
 */
export const autoSelectSpotlightForGender = async (sessionId: string, gender: string, userId?: string): Promise<string | null> => {
  try {
    debugLog('AutoSelect', `Attempting to auto-select a ${gender} spotlight for session ${sessionId}`);
    
    // First check if there's already a current spotlight
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('AutoSelect', 'Session not found');
      return null;
    }
    
    const genderField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}SpotlightId`;
    const currentSpotlight = sessionDoc.data()[genderField];
    
    // If there's already a spotlight, don't replace them
    if (currentSpotlight) {
      debugLog('AutoSelect', `There's already a ${gender} spotlight: ${currentSpotlight}`);
      
      // CRITICAL FIX: If this user isn't the current spotlight, notify via return value
      if (userId && userId !== currentSpotlight && typeof window !== 'undefined' && window.lineupContextRef?.current) {
        window.lineupContextRef.current.setStep('lineup');
        debugLog('AutoSelect', `User ${userId} not current spotlight, moving to lineup`);
      }
      
      return currentSpotlight;
    }
    
    // Get available spotlights that haven't completed
    const orderedSpotlights = await getOrderedSpotlightsByGender(sessionId, gender);
    
    if (orderedSpotlights.length > 0) {
      const selectedSpotlight = orderedSpotlights[0];
      debugLog('AutoSelect', `Selected spotlight ${selectedSpotlight} from active list`);
      
      // Update session with new spotlight
      const rotationTimeField = `${gender}LastRotationTime`;
      await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
        [genderField]: selectedSpotlight,
        [rotationTimeField]: serverTimestamp()
      });
      
      // Add notification
      await addTurnNotification(sessionId, selectedSpotlight);
      
      // Add rotation event
      await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
        timestamp: serverTimestamp(),
        rotationId: Date.now().toString(),
        previousSpotlightId: null,
        newSpotlightId: selectedSpotlight,
        gender
      });
      
      return selectedSpotlight;
    }
    
    // If no active spotlights, try to find any spotlight of this gender (even completed ones)
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'spotlightJoinTimes');
    const anyGenderQuery = query(
      joinTimesRef,
      where('gender', '==', gender)
    );
    
    const snapshot = await getDocs(anyGenderQuery);
    
    if (snapshot.empty) {
      debugLog('AutoSelect', `No ${gender} spotlights found at all`);
      return null;
    }
    
    // Select the first one and reset its completed status
    const spotlightId = snapshot.docs[0].id;
    await updateDoc(doc(joinTimesRef, spotlightId), {
      completed: false,
      resetAt: serverTimestamp()
    });
    
    // Update session with recycled spotlight
    const rotationTimeField = `${gender}LastRotationTime`;
    await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
      [genderField]: spotlightId,
      [rotationTimeField]: serverTimestamp()
    });
    
    // Send notification to recycled spotlight
    await addLineupTurnNotification(spotlightId, sessionId);
    
    // Add rotation event
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
      timestamp: serverTimestamp(),
      rotationId: Date.now().toString(), 
      previousSpotlightId: null,
      newSpotlightId: spotlightId,
      gender
    });
    
    debugLog('AutoSelect', `Recycled spotlight ${spotlightId} by resetting completed status`);
    return spotlightId;
  } catch (error) {
    debugLog('AutoSelect', 'Error auto-selecting spotlight:', error);
    return null;
  }
};


/**
 * Send lineup turn notification with deduplication
 */
export const sendTurnNotification = async (
  userId: string, 
  sessionId: string
): Promise<boolean> => {
  if (!userId || !sessionId) return false;
  
  try {
    debugLog('Notification', `Checking for existing notifications for user ${userId}`);
    
    // Check for existing unread notifications first
    const notificationsRef = collection(firestore, 'notifications');
    const existingQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', 'lineup_turn'),
      where('data.sessionId', '==', sessionId),
      where('isRead', '==', false),
      limit(1)
    );
    
    const existingDocs = await getDocs(existingQuery);
    
    if (!existingDocs.empty) {
      debugLog('Notification', `User ${userId} already has an unread notification, skipping`);
      return false;
    }
    
    // Create notification with deterministic ID to prevent duplicates
    const notificationId = `turn_${userId}_${sessionId}_${Date.now()}`;
    await setDoc(doc(firestore, 'notifications', notificationId), {
      userId,
      type: 'lineup_turn',
      message: "It's your turn in the Line-Up! You're now in the spotlight.",
      data: { sessionId },
      createdAt: serverTimestamp(),
      isRead: false
    });
    
    debugLog('Notification', `Successfully sent turn notification to user ${userId}`);
    return true;
  } catch (error) {
    debugLog('Notification', `Error sending turn notification to user ${userId}:`, error);
    return false;
  }
};