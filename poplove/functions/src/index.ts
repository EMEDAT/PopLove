// poplove/functions/src/index.ts

import {onSchedule} from "firebase-functions/v2/scheduler";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp, FieldValue} from "firebase-admin/firestore";
import {DocumentSnapshot} from "firebase-admin/firestore";

initializeApp();
const firestore = getFirestore();

// Constants for lineup
const SPOTLIGHT_TIMER_SECONDS = 4 * 60 * 60; // 4 hours in seconds
// const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 48 hours - TODO: Use in elimination handler

// This function runs once per day to clean up expired stories
export const cleanupExpiredStories = onSchedule({
  schedule: "0 0 * * *", // Run at midnight every day
  timeZone: "UTC",
}, async () => {
  try {
    const now = Timestamp.now();

    // Query for expired stories
    const storiesRef = firestore.collection("stories");
    const expiredQuery = await storiesRef
      .where("expiresAt", "<", now)
      .get();

    if (expiredQuery.empty) {
      console.log("No expired stories to clean up");
      return;
    }

    // Use batched writes for better performance
    const batchSize = 500;
    let batch = firestore.batch();
    let operationCount = 0;
    let totalDeleted = 0;

    expiredQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
      operationCount++;
      totalDeleted++;

      if (operationCount >= batchSize) {
        batch.commit();
        batch = firestore.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      await batch.commit();
    }

    console.log(`Successfully deleted ${totalDeleted} expired stories`);
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
  }
});

// Schedule function to run every minute to rotate lineup contestants
export const rotateLineupContestants = onSchedule({
  schedule: "every 1 minutes", // Changed from 5 minutes to 1 minute
  timeZone: "UTC",
  retryCount: 3, // Add retries for better reliability
}, async () => {
  try {
    const sessionsRef = firestore.collection("lineupSessions");
    const activeSessionsQuery = sessionsRef.where("status", "==", "active");
    const sessionsSnapshot = await activeSessionsQuery.get();

    console.log(`Checking ${sessionsSnapshot.size} active lineup sessions`);
    
    let rotationsPerformed = 0;

    // Process each active session
    for (const sessionDoc of sessionsSnapshot.docs) {
      // Check male contestant rotation time
      const maleRotated = await checkAndRotateGender(sessionDoc, "male");
      
      // Check female contestant rotation time
      const femaleRotated = await checkAndRotateGender(sessionDoc, "female");
      
      if (maleRotated || femaleRotated) {
        console.log(`Session ${sessionDoc.id}: Performed rotation`);
        rotationsPerformed++;
      }
    }

    console.log(`Performed ${rotationsPerformed} contestant rotations`);
  } catch (error) {
    console.error("Error in contestant rotation:", error);
  }
});

// Process forced rotation requests from clients
export const forceRotateContestant = onSchedule({
  schedule: "every 1 minutes",
  timeZone: "UTC", 
}, async () => {
  try {
    // Check for rotation requests
    const requestsRef = firestore.collection("rotationRequests");
    const pendingRequests = await requestsRef
      .where("status", "==", "pending")
      .where("requestTime", ">=", Timestamp.fromMillis(Date.now() - 10 * 60 * 1000)) // Only consider requests from last 10 minutes
      .limit(10) // Process 10 requests at a time
      .get();
    
    console.log(`Processing ${pendingRequests.size} pending rotation requests`);
    
    // Process each request
    for (const requestDoc of pendingRequests.docs) {
      const request = requestDoc.data();
      const sessionId = request.sessionId;
      const userId = request.userId;
      const gender = request.gender;
      
      console.log(`Processing rotation request: session=${sessionId}, user=${userId}, gender=${gender}`);
      
      try {
        // Get session data
        const sessionDoc = await firestore.doc(`lineupSessions/${sessionId}`).get();
        if (!sessionDoc.exists) {
          console.log(`Session ${sessionId} does not exist, marking request as failed`);
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
          console.log(`User ${userId} is not the current ${gender} contestant, marking request as invalid`);
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
        
        console.log(`Rotation request processed: rotated=${rotated}`);
      } catch (error: any) {
        console.error(`Error processing rotation request ${requestDoc.id}:`, error);
        await requestDoc.ref.update({
          status: "failed",
          processedAt: FieldValue.serverTimestamp(),
          error: error.message || "Unknown error"
        });
      }
    }
    
  } catch (error) {
    console.error("Error processing rotation requests:", error);
  }
});

// Helper function to check and rotate gender-specific contestants
async function checkAndRotateGender(sessionDoc: DocumentSnapshot, gender: string): Promise<boolean> {
  const sessionData = sessionDoc.data();
  if (!sessionData) return false;

  const sessionId = sessionDoc.id;
  const currentContestantField = `current${gender.charAt(0).toUpperCase() + gender.slice(1)}ContestantId`;
  const rotationTimeField = `${gender}LastRotationTime`;
  
  const lastRotationTime = sessionData[rotationTimeField]?.toDate();
  const currentContestantId = sessionData[currentContestantField];
  
  // Skip if no rotation time or no current contestant
  if (!lastRotationTime || !currentContestantId) return false;
  
  const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
  
  // Check if rotation time has elapsed (4 hours)
  if (elapsedSeconds > SPOTLIGHT_TIMER_SECONDS) {
    console.log(`Time to rotate ${gender} contestant in session ${sessionId} (elapsed: ${elapsedSeconds}s)`);
    
    try {
      // Get all contestants of this gender
      const joinTimesRef = firestore.collection(`lineupSessions/${sessionId}/contestantJoinTimes`);
      const contestantsQuery = joinTimesRef.where("gender", "==", gender).orderBy("joinedAt", "asc");
      const contestantsSnapshot = await contestantsQuery.get();
      
      if (contestantsSnapshot.empty) {
        console.log(`No ${gender} contestants to rotate to in session ${sessionId}`);
        return false;
      }
      
      // Get ordered array of contestant IDs
      const contestantIds = contestantsSnapshot.docs.map(doc => doc.id);
      console.log(`Ordered ${gender} contestants: ${contestantIds.join(', ')}`);
      
      // Find current contestant index
      const currentIndex = contestantIds.indexOf(currentContestantId);
      console.log(`Current contestant index: ${currentIndex}`);
      
      // Calculate next contestant index (with wrap-around)
      const nextIndex = (currentIndex === -1 || currentIndex === contestantIds.length - 1) ? 0 : currentIndex + 1;
      const nextContestantId = contestantIds[nextIndex];
      console.log(`Next contestant index: ${nextIndex}, ID: ${nextContestantId}`);
      
      // Verify we're not rotating to the same person
      if (nextContestantId === currentContestantId) {
        console.log(`No other ${gender} contestants available to rotate to`);
        return false;
      }
      
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
      
      console.log(`Successfully rotated ${gender} contestant from ${currentContestantId} to ${nextContestantId}`);
      return true;
    } catch (error) {
      console.error(`Error rotating ${gender} contestant:`, error);
      return false;
    }
  }
  
  return false;
}