// poplove/functions/src/index.ts

import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {DocumentSnapshot} from "firebase-admin/firestore";

initializeApp();
const firestore = getFirestore();

// Constants for lineup
const SPOTLIGHT_TIMER_SECONDS = 5 * 60; // 4 hours in seconds
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 48 hours in seconds

// This function runs once per day to clean up expired stories
export const cleanupExpiredStories = onSchedule({
  schedule: "0 0 * * *", // Run at midnight every day
  timeZone: "UTC",
}, async () => {
  const functionName = 'cleanupExpiredStories';
  console.log(`${functionName}: Starting execution`);
  
  try {
    const now = Timestamp.now();
    console.log(`${functionName}: Current timestamp: ${now.toDate().toISOString()}`);

    // Query for expired stories
    const storiesRef = firestore.collection("stories");
    const expiredQuery = await storiesRef
      .where("expiresAt", "<", now)
      .get();

    if (expiredQuery.empty) {
      console.log(`${functionName}: No expired stories to clean up`);
      return;
    }

    console.log(`${functionName}: Found ${expiredQuery.size} expired stories to clean up`);

    // Use batched writes for better performance
    const batchSize = 500;
    let batch = firestore.batch();
    let operationCount = 0;
    let totalDeleted = 0;

    expiredQuery.docs.forEach((doc) => {
      console.log(`${functionName}: Adding story ${doc.id} to deletion batch`);
      batch.delete(doc.ref);
      operationCount++;
      totalDeleted++;

      if (operationCount >= batchSize) {
        console.log(`${functionName}: Committing batch of ${operationCount} deletions`);
        batch.commit();
        batch = firestore.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      console.log(`${functionName}: Committing final batch of ${operationCount} deletions`);
      await batch.commit();
    }

    console.log(`${functionName}: Successfully deleted ${totalDeleted} expired stories`);
  } catch (error) {
    console.error(`${functionName}: Error cleaning up expired stories:`, error);
  }
});

// Schedule function to run every minute to rotate lineup contestants
export const rotateLineupContestants = onSchedule({
  schedule: "every 1 minutes", // Run every minute for responsive rotations
  timeZone: "UTC",
  retryCount: 3, // Add retries for better reliability
}, async () => {
  const functionName = 'rotateLineupContestants';
  console.log(`${functionName}: Starting execution`);
  
  try {
    const sessionsRef = firestore.collection("lineupSessions");
    const activeSessionsQuery = sessionsRef.where("status", "==", "active");
    const sessionsSnapshot = await activeSessionsQuery.get();

    console.log(`${functionName}: Checking ${sessionsSnapshot.size} active lineup sessions`);
    
    let rotationsPerformed = 0;

    // Process each active session
    for (const sessionDoc of sessionsSnapshot.docs) {
      console.log(`${functionName}: Processing session ${sessionDoc.id}`);
      
      // Check male contestant rotation time
      const maleRotated = await checkAndRotateGender(sessionDoc, "male");
      console.log(`${functionName}: Male rotation check for session ${sessionDoc.id}: ${maleRotated ? 'Rotated' : 'No rotation needed'}`);
      
      // Check female contestant rotation time
      const femaleRotated = await checkAndRotateGender(sessionDoc, "female");
      console.log(`${functionName}: Female rotation check for session ${sessionDoc.id}: ${femaleRotated ? 'Rotated' : 'No rotation needed'}`);
      
      if (maleRotated || femaleRotated) {
        console.log(`${functionName}: Session ${sessionDoc.id}: Performed rotation`);
        rotationsPerformed++;
      }
    }

    console.log(`${functionName}: Performed ${rotationsPerformed} contestant rotations`);
  } catch (error) {
    console.error(`${functionName}: Error in contestant rotation:`, error);
  }
});

// Process forced rotation requests from clients
export const forceRotateContestant = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "UTC", 
}, async () => {
  const functionName = 'forceRotateContestant';
  console.log(`${functionName}: Starting execution`);
  
  try {
    // Check for rotation requests
    const requestsRef = firestore.collection("rotationRequests");
    const pendingRequests = await requestsRef
      .where("status", "==", "pending")
      .where("requestTime", ">=", Timestamp.fromMillis(Date.now() - 10 * 60 * 1000)) // Only consider requests from last 10 minutes
      .limit(10) // Process 10 requests at a time
      .get();
    
    console.log(`${functionName}: Processing ${pendingRequests.size} pending rotation requests`);
    
    // Process each request
    for (const requestDoc of pendingRequests.docs) {
      const request = requestDoc.data();
      const sessionId = request.sessionId;
      const userId = request.userId;
      const gender = request.gender;
      
      console.log(`${functionName}: Processing rotation request: session=${sessionId}, user=${userId}, gender=${gender}`);
      
      try {
        // Get session data
        const sessionDoc = await firestore.doc(`lineupSessions/${sessionId}`).get();
        if (!sessionDoc.exists) {
          console.log(`${functionName}: Session ${sessionId} does not exist, marking request as failed`);
          await requestDoc.ref.update({
            status: "failed",
            processedAt: FieldValue.serverTimestamp(),
            error: "Session not found"
          });
          continue;
        }
        
        // Get session data
        const sessionData = sessionDoc.data() || {};
        
        // Check if user is actually the current contestant for their gender
        const genderField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}ContestantId`;
        if (sessionData[genderField] !== userId) {
          console.log(`${functionName}: User ${userId} is not the current ${gender} contestant, marking request as invalid`);
          await requestDoc.ref.update({
            status: "invalid",
            processedAt: FieldValue.serverTimestamp(),
            error: "Not current contestant"
          });
          continue;
        }
        
        // Perform rotation using existing helper function
        const rotated = await checkAndRotateGender(sessionDoc, gender);
        
        // Update request status
        await requestDoc.ref.update({
          status: rotated ? "completed" : "failed",
          processedAt: FieldValue.serverTimestamp(),
          error: rotated ? null : "Rotation failed"
        });
        
        console.log(`${functionName}: Rotation request processed: rotated=${rotated}`);
      } catch (error: any) {
        console.error(`${functionName}: Error processing rotation request ${requestDoc.id}:`, error);
        await requestDoc.ref.update({
          status: "failed",
          processedAt: FieldValue.serverTimestamp(),
          error: error.message || "Unknown error"
        });
      }
    }
    
  } catch (error) {
    console.error(`${functionName}: Error processing rotation requests:`, error);
  }
});

// Automatic elimination checking for the 20-pop threshold
export const checkEliminationThreshold = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "UTC",
}, async () => {
  const functionName = 'checkEliminationThreshold';
  console.log(`${functionName}: Starting execution`);
  
  try {
    // Get all active sessions
    const sessionsRef = firestore.collection("lineupSessions");
    const activeSessionsQuery = sessionsRef.where("status", "==", "active");
    const sessionsSnapshot = await activeSessionsQuery.get();
    
    console.log(`${functionName}: Checking elimination threshold for ${sessionsSnapshot.size} active sessions`);
    
    let eliminationsPerformed = 0;
    
    // Process each session
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionId = sessionDoc.id;
      console.log(`${functionName}: Checking session ${sessionId}`);
      
      // Check stats for all contestants
      const statsRef = firestore.collection(`lineupSessions/${sessionId}/spotlightStats`);
      const statsQuery = await statsRef.where("popCount", ">=", 20).get();
      
      if (statsQuery.empty) {
        console.log(`${functionName}: No contestants to eliminate in session ${sessionId}`);
        continue;
      }
      
      console.log(`${functionName}: Found ${statsQuery.size} contestants to eliminate in session ${sessionId}`);
      
      // Process each contestant to eliminate
      for (const statDoc of statsQuery.docs) {
        const contestantId = statDoc.id;
        console.log(`${functionName}: Checking contestant ${contestantId} for elimination`);
        
        // Get contestant data
        const contestantJoinRef = firestore.doc(`lineupSessions/${sessionId}/contestantJoinTimes/${contestantId}`);
        const contestantJoinDoc = await contestantJoinRef.get();
        
        if (!contestantJoinDoc.exists) {
          console.log(`${functionName}: Contestant ${contestantId} not found in join times`);
          continue;
        }
        
        const joinData = contestantJoinDoc.data();
        
        // Skip if already eliminated or completed
        if (joinData && joinData.completed) {
          console.log(`${functionName}: Contestant ${contestantId} already completed or eliminated`);
          continue;
        }
        
        console.log(`${functionName}: Eliminating contestant ${contestantId} due to 20+ pops`);
        
        // Perform elimination process
        await eliminateContestant(sessionId, contestantId);
        eliminationsPerformed++;
      }
    }
    
    console.log(`${functionName}: Performed ${eliminationsPerformed} contestant eliminations`);
  } catch (error) {
    console.error(`${functionName}: Error checking elimination threshold:`, error);
  }
});

// Helper function to check if a user should be eliminated (20+ pops)
async function eliminateContestant(sessionId: string, userId: string): Promise<boolean> {
  const functionName = 'eliminateContestant';
  console.log(`${functionName}: Eliminating user ${userId} from session ${sessionId}`);
  
  try {
    // Get user gender first
    const userRef = firestore.doc(`users/${userId}`);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log(`${functionName}: User ${userId} not found`);
      return false;
    }
    
    const userData = userDoc.data() || {};
    const userGender = userData.gender || '';
    
    if (!userGender) {
      console.log(`${functionName}: User ${userId} has no gender defined`);
      return false;
    }
    
    // Get session document
    const sessionRef = firestore.doc(`lineupSessions/${sessionId}`);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      console.log(`${functionName}: Session ${sessionId} not found`);
      return false;
    }
    
    const sessionData = sessionDoc.data() || {};
    
    // Check if user is currently the spotlight
    const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
    const isCurrentContestant = sessionData[genderField] === userId;
    
    console.log(`${functionName}: User ${userId} is${isCurrentContestant ? '' : ' not'} the current ${userGender} contestant`);
    
    // Using transaction for atomic updates
    await firestore.runTransaction(async (transaction) => {
      // 1. If user is current contestant, rotate to next
      if (isCurrentContestant) {
        // Get next gender-specific contestant
        const joinTimesRef = firestore.collection(`lineupSessions/${sessionId}/contestantJoinTimes`);
        const contestantsQuery = transaction.get(
          joinTimesRef
            .where("gender", "==", userGender)
            .where("completed", "==", false)
            .orderBy("joinedAt", "asc")
        );
        
        const contestantsSnap = await contestantsQuery;
        const contestants = contestantsSnap.docs
          .filter(doc => doc.id !== userId) // Exclude current user
          .map(doc => doc.id);
        
        // Get next contestant
        const nextContestantId = contestants.length > 0 ? contestants[0] : null;
        console.log(`${functionName}: Next ${userGender} contestant: ${nextContestantId || 'None'}`);
        
        // Update session
        const updates: Record<string, any> = {
          [genderField]: nextContestantId,
          [`${userGender}LastRotationTime`]: FieldValue.serverTimestamp()
        };
        
        // If this is also the general current contestant, update that too
        if (sessionData.currentContestantId === userId) {
          updates.currentContestantId = nextContestantId;
          updates.lastRotationTime = FieldValue.serverTimestamp();
        }
        
        transaction.update(sessionRef, updates);
        
        // Create rotation event
        const rotationRef = firestore.doc(`lineupSessions/${sessionId}/rotationEvents/latest`);
        transaction.set(rotationRef, {
          timestamp: FieldValue.serverTimestamp(),
          rotationId: Date.now().toString(),
          previousContestantId: userId,
          newContestantId: nextContestantId,
          gender: userGender,
          reason: 'elimination'
        });
        
        // Notify next contestant if there is one
        if (nextContestantId) {
          const notificationRef = firestore.collection('notifications').doc();
          transaction.set(notificationRef, {
            userId: nextContestantId,
            type: 'lineup_turn',
            message: "It's your turn in the Line-Up! You're now the featured contestant.",
            data: { sessionId },
            createdAt: FieldValue.serverTimestamp(),
            isRead: false
          });
        }
      }
      
      // 2. Mark contestant as eliminated
      const joinTimeRef = firestore.doc(`lineupSessions/${sessionId}/contestantJoinTimes/${userId}`);
      transaction.update(joinTimeRef, {
        completed: true,
        eliminatedAt: FieldValue.serverTimestamp()
      });
      
      // 3. Create elimination record
      const eliminationRef = firestore.doc(`userEliminations/${userId}`);
      const now = Timestamp.now();
      const eligibleAt = new Timestamp(
        now.seconds + ELIMINATION_TIMER_SECONDS,
        now.nanoseconds
      );
      
      transaction.set(eliminationRef, {
        eliminatedAt: FieldValue.serverTimestamp(),
        eligibleAt: eligibleAt,
        sessionId,
        reason: 'pop_threshold'
      });
      
      // 4. Create notification for user
      const notificationRef = firestore.collection('notifications').doc();
      transaction.set(notificationRef, {
        userId,
        type: 'lineup_elimination',
        message: "You've been eliminated from the Line-Up due to receiving too many pops.",
        data: { 
          sessionId,
          cooldownHours: ELIMINATION_TIMER_SECONDS / 3600
        },
        createdAt: FieldValue.serverTimestamp(),
        isRead: false
      });
    });
    
    console.log(`${functionName}: Successfully eliminated user ${userId}`);
    return true;
  } catch (error) {
    console.error(`${functionName}: Error eliminating user:`, error);
    return false;
  }
}

// Helper function to check and rotate gender-specific contestants
async function checkAndRotateGender(sessionDoc: DocumentSnapshot, gender: string): Promise<boolean> {
  const functionName = 'checkAndRotateGender';
  const sessionId = sessionDoc.id;
  const sessionData = sessionDoc.data();
  if (!sessionData) {
    console.log(`${functionName}: No session data for ${sessionId}`);
    return false;
  }

  const currentContestantField = `current${gender.charAt(0).toUpperCase() + gender.slice(1)}ContestantId`;
  const rotationTimeField = `${gender}LastRotationTime`;
  
  const lastRotationTime = sessionData[rotationTimeField]?.toDate();
  const currentContestantId = sessionData[currentContestantField];
  
  // Skip if no rotation time or no current contestant
  if (!lastRotationTime || !currentContestantId) {
    console.log(`${functionName}: No ${gender} rotation time or contestant for session ${sessionId}`);
    
    // If there's no current contestant but there should be, try to auto-select one
    if (!currentContestantId) {
      return await tryAutoSelectContestant(sessionId, gender);
    }
    
    return false;
  }
  
  const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
  console.log(`${functionName}: ${gender} contestant ${currentContestantId} has been active for ${elapsedSeconds}s (max: ${SPOTLIGHT_TIMER_SECONDS}s)`);
  
  // Check if rotation time has elapsed (4 hours)
  if (elapsedSeconds > SPOTLIGHT_TIMER_SECONDS) {
    console.log(`${functionName}: Time to rotate ${gender} contestant in session ${sessionId} (elapsed: ${elapsedSeconds}s)`);
    
    try {
      // Get all contestants of this gender
      const joinTimesRef = firestore.collection(`lineupSessions/${sessionId}/contestantJoinTimes`);
      const contestantsQuery = joinTimesRef
        .where("gender", "==", gender)
        .where("completed", "==", false)
        .orderBy("joinedAt", "asc");
      
      const contestantsSnapshot = await contestantsQuery.get();
      
      if (contestantsSnapshot.empty) {
        console.log(`${functionName}: No ${gender} contestants to rotate to in session ${sessionId}`);
        return false;
      }
      
      // Get ordered array of contestant IDs
      const contestantIds = contestantsSnapshot.docs.map(doc => doc.id);
      console.log(`${functionName}: Ordered ${gender} contestants: ${contestantIds.join(', ')}`);
      
      // Find current contestant index
      const currentIndex = contestantIds.indexOf(currentContestantId);
      console.log(`${functionName}: Current contestant index: ${currentIndex}`);
      
      // Calculate next contestant index (with wrap-around)
      const nextIndex = (currentIndex === -1 || currentIndex === contestantIds.length - 1) ? 0 : currentIndex + 1;
      const nextContestantId = contestantIds[nextIndex];
      console.log(`${functionName}: Next contestant index: ${nextIndex}, ID: ${nextContestantId}`);
      
      // Verify we're not rotating to the same person
      if (nextContestantId === currentContestantId) {
        console.log(`${functionName}: No other ${gender} contestants available to rotate to`);
        return false;
      }
      
      // Mark current contestant as completed
      await firestore.doc(`lineupSessions/${sessionId}/contestantJoinTimes/${currentContestantId}`).update({
        completed: true,
        completedAt: FieldValue.serverTimestamp()
      });
      
      // Transaction to safely update the session and create notification
      await firestore.runTransaction(async (transaction) => {
        // Update the session with new contestant
        const sessionRef = firestore.doc(`lineupSessions/${sessionId}`);
        
        const updates: Record<string, any> = {
          [currentContestantField]: nextContestantId,
          [rotationTimeField]: FieldValue.serverTimestamp()
        };
        
        // If this is the primary gender, also update legacy fields
        const isPrimaryGender = (gender === "male" && !sessionData.primaryGender) || 
                              sessionData.primaryGender === gender;
        
        if (isPrimaryGender || sessionData.currentContestantId === currentContestantId) {
          updates.currentContestantId = nextContestantId;
          updates.lastRotationTime = FieldValue.serverTimestamp();
        }
        
        transaction.update(sessionRef, updates);
        
        // Create turn notification
        const notificationRef = firestore.collection('notifications').doc();
        transaction.set(notificationRef, {
          userId: nextContestantId,
          type: 'lineup_turn',
          message: "It's your turn in the Line-Up! You're now the featured contestant.",
          data: { sessionId },
          createdAt: FieldValue.serverTimestamp(),
          isRead: false
        });
        
        // Create rotation event to notify all clients
        const rotationRef = firestore.doc(`lineupSessions/${sessionId}/rotationEvents/latest`);
        transaction.set(rotationRef, {
          timestamp: FieldValue.serverTimestamp(),
          rotationId: Date.now().toString(),
          previousContestantId: currentContestantId,
          newContestantId: nextContestantId,
          gender
        });
      });
      
      console.log(`${functionName}: Successfully rotated ${gender} contestant from ${currentContestantId} to ${nextContestantId}`);
      return true;
    } catch (error) {
      console.error(`${functionName}: Error rotating ${gender} contestant:`, error);
      return false;
    }
  }
  
  return false;
}

// Helper function to try auto-selecting a contestant if none exists
async function tryAutoSelectContestant(sessionId: string, gender: string): Promise<boolean> {
  const functionName = 'tryAutoSelectContestant';
  console.log(`${functionName}: Trying to auto-select a ${gender} contestant for session ${sessionId}`);
  
  try {
    // Find eligible contestants of this gender
    const joinTimesRef = firestore.collection(`lineupSessions/${sessionId}/contestantJoinTimes`);
    const eligibleQuery = joinTimesRef
      .where("gender", "==", gender)
      .where("completed", "==", false)
      .orderBy("joinedAt", "asc")
      .limit(1);
    
    const eligibleSnapshot = await eligibleQuery.get();
    
    if (eligibleSnapshot.empty) {
      console.log(`${functionName}: No eligible ${gender} contestants found`);
      return false;
    }
    
    // Get the first eligible contestant
    const firstContestantDoc = eligibleSnapshot.docs[0];
    const contestantId = firstContestantDoc.id;
    
    console.log(`${functionName}: Selected contestant ${contestantId}`);
    
    // Update session with the selected contestant
    const sessionRef = firestore.doc(`lineupSessions/${sessionId}`);
    const currentContestantField = `current${gender.charAt(0).toUpperCase() + gender.slice(1)}ContestantId`;
    const rotationTimeField = `${gender}LastRotationTime`;
    
    await firestore.runTransaction(async (transaction) => {
      // Update session
      transaction.update(sessionRef, {
        [currentContestantField]: contestantId,
        [rotationTimeField]: FieldValue.serverTimestamp()
      });
      
      // Create turn notification
      const notificationRef = firestore.collection('notifications').doc();
      transaction.set(notificationRef, {
        userId: contestantId,
        type: 'lineup_turn',
        message: "It's your turn in the Line-Up! You're now the featured contestant.",
        data: { sessionId },
        createdAt: FieldValue.serverTimestamp(),
        isRead: false
      });
      
      // Create rotation event
      const rotationRef = firestore.doc(`lineupSessions/${sessionId}/rotationEvents/latest`);
      transaction.set(rotationRef, {
        timestamp: FieldValue.serverTimestamp(),
        rotationId: Date.now().toString(),
        previousContestantId: null,
        newContestantId: contestantId,
        gender
      });
    });
    
    console.log(`${functionName}: Successfully auto-selected ${gender} contestant ${contestantId}`);
    return true;
  } catch (error) {
    console.error(`${functionName}: Error auto-selecting contestant:`, error);
    return false;
  }
}