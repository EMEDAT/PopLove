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


// TESTING CONFIGURATION - CHANGE BEFORE PRODUCTION
const CONTESTANT_TIMER_SECONDS = 4 * 60 * 60; // 10 minutes for testing (should be 4 * 60 * 60)
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
    
    // Check both male and female contestant timers
    await checkGenderTimeout(sessionDoc.id, sessionData, 'male');
    await checkGenderTimeout(sessionDoc.id, sessionData, 'female');
  }
};

// Check if a gender-specific contestant has timed out
async function checkGenderTimeout(sessionId: string, sessionData: any, gender: 'male' | 'female') {
  const field = `${gender}LastRotationTime`;
  const currentField = `current${gender.charAt(0).toUpperCase() + gender.slice(1)}ContestantId`;
  
  // Use gender-specific rotation time if exists, fallback to general one
  const lastRotationTime = sessionData[field]?.toDate() || 
                          sessionData.lastRotationTime?.toDate() ||
                          new Date(Date.now() - 5 * 60 * 60 * 1000);
  
  const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
  
  debugLog('Timeouts', `${gender} contestant time elapsed: ${elapsedSeconds}s`, {
    sessionId,
    currentContestantId: sessionData[currentField],
    lastRotationTime
  });
  
  // If more than 4 hours have passed since last rotation
  if (elapsedSeconds > CONTESTANT_TIMER_SECONDS) {
    debugLog('Timeouts', `${gender} contestant timed out, rotating`, {
      sessionId, 
      contestant: sessionData[currentField]
    });
    await rotateNextContestant(sessionId, gender);
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
      
      // First check if there's an active session for this category
      const sessionsRef = collection(firestore, 'lineupSessions');
      const q = query(
        sessionsRef,
        where('category', 'array-contains', categoryId),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      debugLog('Join', `Found ${snapshot.size} active sessions for category ${categoryId}`);
      
      // Get user's gender for proper session assignment
      debugLog('Join', `Getting gender for user ${userId}`);
      const userDoc = await getDoc(doc(firestore, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      const userGender = userDoc.data().gender || 'unknown';
      debugLog('Join', `User gender: ${userGender}`);
      
      if (!snapshot.empty) {
        // Join existing session
        const sessionDoc = snapshot.docs[0];
        const sessionData = sessionDoc.data();
        
        // Make sure contestants is defined and is an array
        const contestants = sessionData.contestants || [];
        
        // Get gender-specific field names
        const userGenderField = `current${userGender.charAt(0).toUpperCase() + userGender.slice(1)}ContestantId`;
        const rotationTimeField = `${userGender}LastRotationTime`;

        // Check if user already had a completed turn in this session
        const userJoinTimeRef = doc(firestore, 'lineupSessions', sessionDoc.id, 'contestantJoinTimes', userId);
        const userJoinTimeDoc = await getDoc(userJoinTimeRef);
        
        // If user already had a turn, record show as new join with fresh timestamp
        if (userJoinTimeDoc.exists() && userJoinTimeDoc.data().completed) {
          debugLog('Join', `User ${userId} previously completed their turn, rejoining with new timestamp`);
          
          // Add user to contestants if not already there
          if (!contestants.includes(userId)) {
            await updateDoc(doc(firestore, 'lineupSessions', sessionDoc.id), {
              contestants: [...contestants, userId]
            });
          }
          
          // Update join time record with new timestamp and reset completed flag
          await setDoc(userJoinTimeRef, {
            joinedAt: serverTimestamp(),
            gender: userGender,
            categoryId: categoryId,
            completed: false
          });
          
          // Wait for Firebase to process the update
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // Normal first-time join
        else if (!userJoinTimeDoc.exists()) {
          // Add user to contestants if not already there
          if (!contestants.includes(userId)) {
            debugLog('Join', `Adding user ${userId} to contestants list`, {
              sessionId: sessionDoc.id,
              userGender,
              userGenderField
            });
            
            await updateDoc(doc(firestore, 'lineupSessions', sessionDoc.id), {
              contestants: [...contestants, userId]
            });
            
            // Also add user to contestant timestamps for proper ordering
            await setDoc(doc(firestore, 'lineupSessions', sessionDoc.id, 'contestantJoinTimes', userId), {
              joinedAt: serverTimestamp(),
              gender: userGender,
              categoryId: categoryId,
              completed: false
            });
            
            // Wait for Firebase to process the update
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        // Check again if the user is now in the contestants list
        const updatedSessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionDoc.id));
        const updatedSessionData = updatedSessionDoc.data() || {};
        const updatedContestants = updatedSessionData.contestants || [];
        
        if (!updatedContestants.includes(userId)) {
          // Retry if user is still not in contestants list
          debugLog('Join', `User not in contestants list after update, retrying... (attempt ${attempt + 1})`);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // CRITICAL CHANGE: If there are no contestants of this gender, make this user the current contestant
        const sameGenderCount = await getContestantsOfSameGender(sessionDoc.id, userGender);
        debugLog('Join', `Found ${sameGenderCount} ${userGender} contestants including this user`);
        
        if (sameGenderCount <= 1) {
          // First of this gender - make them current contestant using gender-specific field
          debugLog('Join', `User is first ${userGender}, setting as current ${userGender} contestant`);
          
          const updates: any = {
            [userGenderField]: userId,
            [rotationTimeField]: serverTimestamp()
          };
          
          // Update gender-specific field
          await updateDoc(doc(firestore, 'lineupSessions', sessionDoc.id), updates);
          
          // Update session data to reflect this change
          updatedSessionData[userGenderField] = userId;
          updatedSessionData[rotationTimeField] = serverTimestamp();
        }
        
        return { 
          ...updatedSessionData, 
          id: sessionDoc.id,
          contestants: updatedSessionData.contestants || [],
          category: updatedSessionData.category || [categoryId]
        } as LineUpSessionData;
      } else {
        // Create new session
        debugLog('Join', `No existing session found, creating new session`);
        const now = new Date();
        const fourHoursLater = new Date(now.getTime() + CONTESTANT_TIMER_SECONDS * 1000);
        
        const maleField = userGender === 'male' ? userId : '';
        const femaleField = userGender === 'female' ? userId : '';
        
        // NEW SESSION - Create with proper gender fields
        const newSession = {
          category: [categoryId],
          primaryGender: userGender, // Set primary gender based on first user
          currentMaleContestantId: maleField,
          currentFemaleContestantId: femaleField,
          maleLastRotationTime: userGender === 'male' ? serverTimestamp() : null,
          femaleLastRotationTime: userGender === 'female' ? serverTimestamp() : null,
          contestants: [userId],
          startTime: serverTimestamp(),
          endTime: Timestamp.fromDate(fourHoursLater),
          status: 'active',
          
          // Legacy fields for backward compatibility 
          currentContestantId: userId,
          lastRotationTime: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(firestore, 'lineupSessions'), newSession);
        debugLog('Join', `Created new session: ${docRef.id}`);
        
        // Add initial user to timestamps collection
        await setDoc(doc(firestore, 'lineupSessions', docRef.id, 'contestantJoinTimes', userId), {
          joinedAt: serverTimestamp(),
          gender: userGender,
          categoryId,
          completed: false
        });
        
        return { ...newSession, id: docRef.id } as LineUpSessionData;
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

// Count contestants of the same gender
export const getContestantsOfSameGender = async (sessionId: string, gender: string): Promise<number> => {
  debugLog('GenderCount', `Counting ${gender} contestants for session ${sessionId}`);
  const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
  const joinTimesQuery = query(joinTimesRef, where('gender', '==', gender));
  const result = (await getDocs(joinTimesQuery)).size;
  debugLog('GenderCount', `Found ${result} ${gender} contestants`);
  return result;
};

// Get current contestant data with gender filtering
export const getCurrentContestantData = async (sessionId: string, userId: string): Promise<Contestant | null> => {
  try {
    debugLog('CurrentContestant', `Getting current contestant for user ${userId} in session ${sessionId}`);
    
    // Get user gender
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      debugLog('CurrentContestant', "User document not found");
      return null;
    }
    
    const userGender = userDoc.data().gender || '';
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    debugLog('CurrentContestant', `User gender: ${userGender}, looking for opposite gender: ${oppositeGender}`);
    
    // Get session data with gender-specific fields
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('CurrentContestant', "Session document not found");
      return null;
    }
    
    // Get the contestant ID from the appropriate gender field
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase() + oppositeGender.slice(1)}ContestantId`;
    const currentContestantId = sessionDoc.data()[oppositeGenderField];
    debugLog('CurrentContestant', `Current ${oppositeGender} contestant ID: ${currentContestantId}`);
    
    if (!currentContestantId) {
      debugLog('CurrentContestant', `No ${oppositeGender} contestant found in session`);
      return null;
    }
    
    // Get current contestant data
    const contestantDoc = await getDoc(doc(firestore, 'users', currentContestantId));
    if (!contestantDoc.exists()) {
      debugLog('CurrentContestant', "Contestant document not found");
      return null;
    }
    
    const contestantData = contestantDoc.data();
    
    // Build and return contestant object
    return {
      id: currentContestantId,
      displayName: contestantData.displayName || 'User',
      photoURL: contestantData.photoURL || '',
      ageRange: contestantData.ageRange || '',
      bio: contestantData.bio || '',
      location: contestantData.location || '',
      interests: contestantData.interests || [],
      gender: contestantData.gender || ''
    };
  } catch (error) {
    debugLog('CurrentContestant', 'Error getting current contestant:', error);
    return null;
  }
};

/**
 * Get contestants from service with better gender-specific filtering
 */
export const getContestants = async (sessionId: string, userId: string): Promise<Contestant[]> => {
  debugLog('GetContestants', `Getting contestants for session ${sessionId}, user ${userId}`);
  
  try {
    // Get user gender for filtering
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error("User profile not found");
    }
    
    const userGender = userDoc.data().gender || '';
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    debugLog('GetContestants', `User gender: ${userGender}, looking for opposite gender: ${oppositeGender}`);
    
    // Get session data
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      throw new Error("Session not found");
    }
    const sessionData = sessionDoc.data();
    const sessionCategory = sessionData.category || [];
    debugLog('GetContestants', `Session category: ${sessionCategory.join(', ')}`);
    
    // CRITICAL FIX: Check if there's a current contestant for the opposite gender
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase() + oppositeGender.slice(1)}ContestantId`;
    const currentOppositeGenderContestantId = sessionData[oppositeGenderField];
    
    // If there's no current contestant of opposite gender, return empty array
    if (!currentOppositeGenderContestantId) {
      debugLog('GetContestants', `No current ${oppositeGender} contestant - returning empty array`);
      return [];
    }
    
    // Get all contestants by checking join times collection - CRITICAL: Filter out completed contestants
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef, 
      where('gender', '==', oppositeGender),
      where('completed', '==', false), // CRITICAL: Only get active contestants
      orderBy('joinedAt', 'asc') // Critical FIFO order by join time
    );

    const joinTimesSnapshot = await getDocs(joinTimesQuery);
    // Log raw profiles for debugging
    debugLog('GetContestants', `Raw profiles count: ${joinTimesSnapshot.size}`);
    
    // Create a contestants array with proper typing
    const allContestants: Contestant[] = [];
    
    // Get user data for all contestants of opposite gender
    for (const timeDoc of joinTimesSnapshot.docs) {
      const contestantId = timeDoc.id;
      
      // Skip current user
      if (contestantId === userId) {
        continue;
      }
      
      const contestantDoc = await getDoc(doc(firestore, 'users', contestantId));
      if (contestantDoc.exists()) {
        const contestantData = contestantDoc.data();
        debugLog('GetContestants', `Profile: ${contestantData.displayName}, Gender: ${contestantData.gender}, ID: ${contestantId}`);
        
        // Double check gender to be safe
        if (contestantData.gender === oppositeGender) {
          // Create a Contestant object
          const contestant: Contestant = {
            id: contestantId,
            displayName: contestantData.displayName || 'User',
            photoURL: contestantData.photoURL || '',
            ageRange: contestantData.ageRange || '??',
            bio: contestantData.bio || '',
            location: contestantData.location || '',
            interests: contestantData.interests || [],
            gender: contestantData.gender
          };
          
          allContestants.push(contestant);
          debugLog('GetContestants', `Including profile ${contestant.displayName} (Gender: ${contestant.gender})`);
        } else {
          debugLog('GetContestants', `Excluding profile ${contestantData.displayName} - wrong gender: ${contestantData.gender}`);
        }
      }
    }
    
    debugLog('GetContestants', `Filtered to ${allContestants.length} profiles of gender ${oppositeGender}`);
    
    // Make sure current contestant is included and first in the list
    let currentContestantIncluded = false;
    if (currentOppositeGenderContestantId) {
      // Check if current contestant is already in our list
      currentContestantIncluded = allContestants.some(c => c.id === currentOppositeGenderContestantId);
      
      // If not included, try to fetch and add them
      if (!currentContestantIncluded) {
        debugLog('GetContestants', `Current contestant ${currentOppositeGenderContestantId} not in list, fetching separately`);
        const contestantDoc = await getDoc(doc(firestore, 'users', currentOppositeGenderContestantId));
        
        if (contestantDoc.exists()) {
          const data = contestantDoc.data();
          if (data.gender === oppositeGender) {
            const currentContestant: Contestant = {
              id: currentOppositeGenderContestantId,
              displayName: data.displayName || 'User',
              photoURL: data.photoURL || '',
              ageRange: data.ageRange || '',
              bio: data.bio || '',
              location: data.location || '',
              interests: data.interests || [],
              gender: data.gender || oppositeGender
            };
            
            // Add to beginning of array
            allContestants.unshift(currentContestant);
            currentContestantIncluded = true;
            debugLog('GetContestants', `Added current contestant ${currentContestant.displayName} to beginning of list`);
          }
        }
      } else {
        // Move current contestant to the beginning of the array
        const currentIndex = allContestants.findIndex(c => c.id === currentOppositeGenderContestantId);
        if (currentIndex > 0) {
          const currentContestant = allContestants.splice(currentIndex, 1)[0];
          allContestants.unshift(currentContestant);
          debugLog('GetContestants', `Moved current contestant ${currentContestant.displayName} to beginning of list`);
        }
      }
    }
    
    // Calculate match percentages for each contestant
    const contestantsWithMatchPercentage = await Promise.all(
      allContestants.map(async (contestant) => {
        const matchPercentage = await calculateMatchPercentage(userId, contestant.id);
        return {
          ...contestant,
          matchPercentage
        };
      })
    );
    
    return contestantsWithMatchPercentage;
  } catch (error) {
    debugLog('GetContestants', 'Error getting contestants:', error);
    return [];
  }
};

// Record user action (like/pop)
export const recordAction = async (sessionId: string, userId: string, contestantId: string, action: 'like' | 'pop') => {
  debugLog('Action', `Recording ${action} from user ${userId} to contestant ${contestantId}`);
  
  // Record action in the session actions
  await addDoc(collection(firestore, 'lineupSessions', sessionId, 'actions'), {
    fromUserId: userId,
    toUserId: contestantId,
    action,
    timestamp: serverTimestamp()
  });
  
  // Update contestant's like/pop count
  const countField = action === 'like' ? 'likeCount' : 'popCount';
  
  // Check if stats document exists, if not create it
  const statsRef = doc(firestore, 'lineupSessions', sessionId, 'contestantStats', contestantId);
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
    await setDoc(doc(firestore, 'likes', `${userId}_${contestantId}`), {
      fromUserId: userId,
      toUserId: contestantId,
      createdAt: serverTimestamp(),
      status: 'pending',
      source: 'lineup'
    });
  }
  
  // If contestant has >= 20 pop counts, eliminate them
  if (action === 'pop') {
    const updatedStatsDoc = await getDoc(statsRef);
    if (updatedStatsDoc.exists() && (updatedStatsDoc.data().popCount || 0) >= 20) {
      await eliminateUser(sessionId, contestantId);
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
  const statsDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId, 'contestantStats', userId));
  
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
  
  // Update the lineup session to remove this user from contestants array
  const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
  if (sessionDoc.exists()) {
    const sessionData = sessionDoc.data();
    const contestants = sessionData.contestants || [];
    const updatedContestants = contestants.filter(id => id !== userId);
    
    await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
      contestants: updatedContestants
    });
    
    // If this was the current contestant, move to the next one
    if (sessionData.currentContestantId === userId) {
      if (updatedContestants.length > 0) {
        await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
          currentContestantId: updatedContestants[0]
        });
      }
    }
    
    // Check gender-specific fields
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (userDoc.exists()) {
      const userGender = userDoc.data().gender || '';
      if (userGender === 'male' && sessionData.currentMaleContestantId === userId) {
        // Rotate to next male
        await rotateNextContestant(sessionId, 'male');
      } else if (userGender === 'female' && sessionData.currentFemaleContestantId === userId) {
        // Rotate to next female
        await rotateNextContestant(sessionId, 'female');
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
        const statsRef = doc(firestore, 'lineupSessions', sessionId, 'contestantStats', profileId);
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
        const userGenderField = `current${userGender.charAt(0).toUpperCase() + userGender.slice(1)}ContestantId`;
        
        // Check if this user is current contestant for their gender
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
  // Otherwise determine from current contestant
  const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
  if (!sessionDoc.exists()) return null;
  
  const currentContestantId = sessionDoc.data().currentContestantId;
  if (!currentContestantId) return null;
  
  const contestantDoc = await getDoc(doc(firestore, 'users', currentContestantId));
  return contestantDoc.exists() ? (contestantDoc.data().gender || 'male') : 'male';
} catch (error) {
  debugLog('Gender', 'Error determining gender:', error);
  return 'male'; // Default fallback
}
};

/**
 * Rotate to next contestant with gender specific handling
 * This addresses the issue of maintaining proper rotation order based on join time
 */
export const rotateNextContestant = async (sessionId: string, gender?: string): Promise<void> => {
  // Get gender information consistently 
  const contestantGender = await determineGender(sessionId, gender);
  if (!contestantGender) return;

  // Use proper field names consistently
  const genderField = `current${contestantGender.charAt(0).toUpperCase()}${contestantGender.slice(1)}ContestantId`;
  const rotationTimeField = `${contestantGender}LastRotationTime`;
  
  debugLog('Rotation', `Starting rotation for ${contestantGender} contestant in session ${sessionId}`);

  try {
    // Get ordered contestant list by join time (FIFO)
    const orderedContestants = await getOrderedContestantsByGender(sessionId, contestantGender);
    if (orderedContestants.length === 0) {
      debugLog('Rotation', `No ${contestantGender} contestants available for rotation`);
      return;
    }
    
    // Get session data to determine current contestant
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('Rotation', `Session ${sessionId} not found`);
      return;
    }
    
    const sessionData = sessionDoc.data();
    const currentContestantId = sessionData[genderField];
    
    // Find next contestant index based on join time order
    const currentIndex = orderedContestants.indexOf(currentContestantId);
    
    // CRITICAL FIX: Handle the case where we need to wrap around to first contestant
    // This ensures we follow the FIFO order strictly
    let nextIndex = 0;
    if (currentIndex !== -1 && currentIndex < orderedContestants.length - 1) {
      nextIndex = currentIndex + 1;
    }
    
    const nextContestantId = orderedContestants[nextIndex];
    
    // Verify we're not rotating to the same person
    if (nextContestantId === currentContestantId) {
      debugLog('Rotation', `No other ${contestantGender} contestants available to rotate to`);
      return;
    }
    
    // FIX #1: Add a transaction for atomic updates
    await runTransaction(firestore, async (transaction) => {
      // Update ONLY the gender-specific fields
      const sessionRef = doc(firestore, 'lineupSessions', sessionId);
      
      const updateData: Record<string, any> = {
        [genderField]: nextContestantId,
        [rotationTimeField]: serverTimestamp()
      };
      
      // Check if we need to update general field, only if we're handling the primary gender
      const isPrimaryGender = isPrimaryGenderForSession(sessionData, contestantGender);
      
      // If this is the primary gender OR the current contestant is the general one, update it
      if (isPrimaryGender || sessionData.currentContestantId === currentContestantId) {
        updateData.currentContestantId = nextContestantId;
        updateData.lastRotationTime = serverTimestamp();
      }
      
      // Execute updates in transaction
      transaction.update(sessionRef, updateData);
      
      // Add rotation event to notify all clients
      const rotationRef = doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest');
      transaction.set(rotationRef, {
        timestamp: serverTimestamp(),
        rotationId: Date.now().toString(),
        previousContestantId: currentContestantId,
        newContestantId: nextContestantId,
        gender: contestantGender
      });
      
      // FIX #2: Only send notification to the specific next contestant
      if (nextContestantId) {
        const notificationRef = doc(firestore, 'notifications', `turn_${nextContestantId}_${Date.now()}`);
        transaction.set(notificationRef, {
          userId: nextContestantId,
          type: 'lineup_turn',
          message: "It's your turn in the Line-Up! You're now the featured contestant.",
          data: { sessionId },
          createdAt: serverTimestamp(),
          isRead: false
        });
      }
    });
    
    // Mark previous contestant as completed (outside transaction as this can be done asynchronously)
    await markContestantAsCompleted(sessionId, currentContestantId);
    
    debugLog('Rotation', `Successfully rotated ${contestantGender} contestant from ${currentContestantId} to ${nextContestantId}`);
    return;
  } catch (error) {
    debugLog('Rotation', `Error rotating ${contestantGender} contestant:`, error);
    return;
  }
};

/**
 * Mark a contestant as completed - critical for proper rotation
 */
async function markContestantAsCompleted(sessionId: string, userId: string): Promise<void> {
  if (!userId) return;
  
  try {
    // Get current user info for logging
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    const userGender = userDoc.exists() ? userDoc.data().gender || 'unknown' : 'unknown';
    
    debugLog('Rotation', `Marking ${userGender} contestant ${userId} as completed`);
    
    // Set completed flag and timestamp
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', userId), {
      completed: true,
      completedAt: serverTimestamp()
    }, { merge: true }); // Important: merge to preserve join time
    
    // Also remove from contestants array in session
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (sessionDoc.exists()) {
      const sessionData = sessionDoc.data();
      const contestants = sessionData.contestants || [];
      
      // Create updated array without this user
      const updatedContestants = contestants.filter(id => id !== userId);
      
      await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
        contestants: updatedContestants
      });
      
      debugLog('Rotation', `Removed ${userId} from contestants array, new count: ${updatedContestants.length}`);
    }
    
    debugLog('Rotation', `Successfully marked contestant ${userId} as completed`);
  } catch (error) {
    debugLog('Rotation', `Error marking contestant as completed:`, error);
  }
}

/**
 * Get ordered contestants by gender, strictly enforcing completed status
 */
export const getOrderedContestantsByGender = async (sessionId: string, gender: string): Promise<string[]> => {
  try {
    // FIX #3: Improved query with better error handling
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
    const joinTimesQuery = query(
      joinTimesRef, 
      where('gender', '==', gender),
      where('completed', '==', false), // Only include active contestants
      orderBy('joinedAt', 'asc') // FIFO order by join time
    );
    
    const snapshot = await getDocs(joinTimesQuery);
    
    // Double verify - remove any contestants with completed=true (backup check)
    const filteredIds = snapshot.docs
      .filter(doc => doc.data().completed !== true)
      .map(doc => doc.id);
      
    debugLog('Contestants', `Found ${filteredIds.length} active ${gender} contestants: ${filteredIds.join(', ')}`);
    
    // FIX #4: Ensure we actually have valid contestant IDs
    if (filteredIds.length === 0) {
      // Check if we can find ANY contestants of this gender, even if marked completed
      const allGenderQuery = query(
        joinTimesRef,
        where('gender', '==', gender)
      );
      
      const allGenderSnapshot = await getDocs(allGenderQuery);
      const allIds = allGenderSnapshot.docs.map(doc => doc.id);
      
      if (allIds.length > 0) {
        // Reset one contestant to be active again to ensure we always have someone
        const firstId = allIds[0];
        await updateDoc(doc(joinTimesRef, firstId), {
          completed: false,
          resetAt: serverTimestamp()
        });
        
        debugLog('Contestants', `Reset contestant ${firstId} to active state`);
        return [firstId];
      }
    }
    
    return filteredIds;
  } catch (error) {
    debugLog('Contestants', 'Error getting ordered contestants:', error);
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
    message: "It's your turn in the Line-Up! You're now the featured contestant.",
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

// Get remaining time for a specific gender contestant
export const getRemainingTime = async (sessionId: string, gender: 'male' | 'female'): Promise<number> => {
debugLog('Timer', `Getting remaining time for ${gender} contestant in session ${sessionId}`);

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
      return CONTESTANT_TIMER_SECONDS; // Use constant instead of hardcoded value
    }
    
    const elapsedSeconds = Math.floor((Date.now() - generalLastRotationTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, CONTESTANT_TIMER_SECONDS - elapsedSeconds);
    
    debugLog('Timer', `${gender} contestant remaining time (from general field): ${remainingSeconds}s`);
    return remainingSeconds;
  }
  
  // Calculate time normally using gender-specific field
  const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
  const remainingSeconds = Math.max(0, CONTESTANT_TIMER_SECONDS - elapsedSeconds);
  
  debugLog('Timer', `${gender} contestant remaining time: ${remainingSeconds}s`, {
    lastRotationTime: lastRotationTime.toISOString(),
    now: new Date().toISOString(),
    elapsedSeconds,
    maxTime: CONTESTANT_TIMER_SECONDS
  });
  
  return remainingSeconds;
} catch (error) {
  debugLog('Timer', 'Error getting remaining time:', error);
  return 0; // Default to zero on error
}
};

// Calculate and return gender-specific contestant times
export const getContestantTimes = async (sessionId: string): Promise<{male: number, female: number}> => {
try {
  const maleTime = await getRemainingTime(sessionId, 'male');
  const femaleTime = await getRemainingTime(sessionId, 'female');
  
  return { male: maleTime, female: femaleTime };
} catch (error) {
  debugLog('Timer', 'Error getting contestant times:', error);
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
    await rotateNextContestant(sessionId, userGender);
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
* @param isContestant Whether current user is the contestant
* @returns Filtered chat messages for display
*/
export const getGenderFilteredMessages = async (
sessionId: string,
userId: string,
currentContestantId: string | null
): Promise<ChatMessage[]> => {
const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
const q = query(messagesRef, orderBy('timestamp', 'asc'));

const snapshot = await getDocs(q);
const allMessages = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
})) as ChatMessage[];

// If user is current contestant, they only need to see messages from the opposite gender
const isUserContestant = userId === currentContestantId;

if (!isUserContestant) {
  // User is in waiting room, only see messages from current contestant
  return allMessages.filter(msg => 
    msg.senderId === userId ||      // User's own messages
    msg.senderId === 'system' ||    // System messages
    msg.senderId === currentContestantId // Current contestant's messages
  );
}

// Current contestant needs to see messages from opposite gender users
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
* @param currentContestantId Current contestant ID
* @param callback Function to call with filtered messages
* @returns Unsubscribe function
*/
export const subscribeToGenderFilteredMessages = (
sessionId: string, 
userId: string,
currentContestantId: string | null,
callback: (messages: ChatMessage[]) => void
) => {
if (!sessionId || !userId) {
  console.log("Missing parameters for message subscription");
  callback([]); 
  return () => {};
}

const messagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
const q = query(messagesRef, orderBy('timestamp', 'asc'));

// Determine if user is the current contestant
const isCurrentContestant = userId === currentContestantId;

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
      
      // For contestants (in private screen)
      if (isCurrentContestant) {
        // Include ALL messages from opposite gender users
        if (senderGender !== userGender) {
          filteredMessages.push(message);
        }
      } 
      // For waiting room users (in lineup screen)
      else {
        // Include current contestant's messages regardless of gender
        if (message.senderId === currentContestantId) {
          filteredMessages.push(message);
        }
        
        // Also include messages from any user with the SAME gender as current contestant
        const contestantGender = genderCache.get(currentContestantId || '') || 
          await getUserGender(currentContestantId || '');
          
        if (contestantGender && senderGender === contestantGender) {
          filteredMessages.push(message);
        }
      }
    }
    
    callback(filteredMessages);
  };
  
  processMessages();
});
}

/**
* Subscribe to contestant changes in a session
* @param sessionId Session ID
* @param callback Function to call when contestants change
* @returns Unsubscribe function
*/
export const subscribeToContestants = (
sessionId: string,
callback: (contestantId: string | null) => void
): () => void => {
const sessionRef = doc(firestore, 'lineupSessions', sessionId);

return onSnapshot(sessionRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.data();
    callback(data.currentContestantId || null);
  } else {
    callback(null);
  }
});
};

// After successful rotation, notify all clients via a special document
export const notifyContestantRotation = async (sessionId: string): Promise<void> => {
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
 * Auto-select a contestant for a gender if none exists
 * This is a critical failsafe to prevent empty lineup screens
 */
export const autoSelectContestantForGender = async (sessionId: string, gender: string): Promise<string | null> => {
  try {
    debugLog('AutoSelect', `Attempting to auto-select a ${gender} contestant for session ${sessionId}`);
    
    // First check if there's already a current contestant
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('AutoSelect', 'Session not found');
      return null;
    }
    
    const genderField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}ContestantId`;
    const currentContestant = sessionDoc.data()[genderField];
    
    // If there's already a contestant, don't replace them
    if (currentContestant) {
      debugLog('AutoSelect', `There's already a ${gender} contestant: ${currentContestant}`);
      return currentContestant;
    }
    
    // Get available contestants that haven't completed
    const orderedContestants = await getOrderedContestantsByGender(sessionId, gender);
    
    if (orderedContestants.length > 0) {
      const selectedContestant = orderedContestants[0];
      debugLog('AutoSelect', `Selected contestant ${selectedContestant} from active list`);
      
      // Update session with new contestant
      const rotationTimeField = `${gender}LastRotationTime`;
      await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
        [genderField]: selectedContestant,
        [rotationTimeField]: serverTimestamp()
      });
      
      // Add notification
      await addTurnNotification(selectedContestant, sessionId);
      
      // Add rotation event
      await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
        timestamp: serverTimestamp(),
        rotationId: Date.now().toString(),
        previousContestantId: null,
        newContestantId: selectedContestant,
        gender
      });
      
      return selectedContestant;
    }
    
    // If no active contestants, try to find any contestant of this gender (even completed ones)
    const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
    const anyGenderQuery = query(
      joinTimesRef,
      where('gender', '==', gender)
    );
    
    const snapshot = await getDocs(anyGenderQuery);
    
    if (snapshot.empty) {
      debugLog('AutoSelect', `No ${gender} contestants found at all`);
      return null;
    }
    
    // Select the first one and reset its completed status
    const contestantId = snapshot.docs[0].id;
    await updateDoc(doc(joinTimesRef, contestantId), {
      completed: false,
      resetAt: serverTimestamp()
    });
    
    // Update session with recycled contestant
    const rotationTimeField = `${gender}LastRotationTime`;
    await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
      [genderField]: contestantId,
      [rotationTimeField]: serverTimestamp()
    });
    
    // Send notification to recycled contestant
    await addLineupTurnNotification(contestantId, sessionId);
    
    // Add rotation event
    await setDoc(doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest'), {
      timestamp: serverTimestamp(),
      rotationId: Date.now().toString(), 
      previousContestantId: null,
      newContestantId: contestantId,
      gender
    });
    
    debugLog('AutoSelect', `Recycled contestant ${contestantId} by resetting completed status`);
    return contestantId;
  } catch (error) {
    debugLog('AutoSelect', 'Error auto-selecting contestant:', error);
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
      message: "It's your turn in the Line-Up! You're now the featured contestant.",
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