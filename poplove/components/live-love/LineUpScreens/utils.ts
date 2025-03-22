// components/live-love/LineUpScreens/utils.ts

import { doc, getDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { calculateMatchPercentage as calculateGlobalMatchPercentage } from '../../../utils/matchCalculation';

// Constants for lineup
const SPOTLIGHT_TIMER_SECONDS = 5 * 60; // 4 hours in seconds (14,400 seconds)
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 48 hours in seconds (172,800 seconds)

// Debug logging helper
export const debugLog = (area: string, message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [Utils:${area}] ${message}`, data ? data : '');
};

// Cache for match percentage calculations to reduce database calls
const matchPercentageCache = new Map<string, number>();

/**
 * Calculate match percentage between two users with caching
 * @param userId1 First user's ID
 * @param userId2 Second user's ID
 * @returns Promise with match percentage (0-100)
 */
export const calculateMatchPercentage = async (userId1: string, userId2: string): Promise<number> => {
  debugLog('Match', `Calculating match percentage between ${userId1} and ${userId2}`);
  
  // Create a unique cache key for this pair (sort to ensure same key regardless of order)
  const cacheKey = [userId1, userId2].sort().join('_');
  
  // Check if we have a cached result
  if (matchPercentageCache.has(cacheKey)) {
    const cachedResult = matchPercentageCache.get(cacheKey);
    debugLog('Match', `Using cached match percentage: ${cachedResult}%`);
    return cachedResult || 50;
  }

  try {
    // Use the global match calculation function
    const matchPercentage = await calculateGlobalMatchPercentage(userId1, userId2);
    
    // Cache the result
    matchPercentageCache.set(cacheKey, matchPercentage);
    debugLog('Match', `Calculated and cached match percentage: ${matchPercentage}%`);
    
    return matchPercentage;
  } catch (error) {
    debugLog('Match', 'Error calculating match percentage', error);
    // Default fallback percentage if calculation fails
    return 50;
  }
};

/**
 * Format time string (e.g., 4h → "04:00:00")
 * @param seconds Total seconds
 * @returns Formatted time string (HH:MM:SS)
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

/**
 * Check if user is eligible for lineup (not eliminated in the past 48 hours)
 * @param userId User ID to check
 * @returns Promise that resolves to eligibility status
 */
export const checkUserEligibility = async (userId: string): Promise<boolean> => {
  debugLog('Eligibility', `Checking eligibility for user ${userId}`);
  
  try {
    const eliminationDoc = await getDoc(doc(firestore, 'userEliminations', userId));
    
    if (!eliminationDoc.exists()) {
      debugLog('Eligibility', 'No elimination record found, user is eligible');
      return true; // No elimination record
    }
    
    const eliminationData = eliminationDoc.data();
    const eligibleAt = eliminationData.eligibleAt.toDate();
    const now = new Date();
    
    const isEligible = now >= eligibleAt;
    const timeUntilEligible = Math.max(0, (eligibleAt.getTime() - now.getTime()) / 1000);
    
    debugLog('Eligibility', `User eligibility: ${isEligible}, Time until eligible: ${formatTime(timeUntilEligible)}`);
    return isEligible;
  } catch (error) {
    debugLog('Eligibility', 'Error checking eligibility', error);
    return false; // Default to not eligible on error
  }
};

/**
 * Get remaining time for a user's spotlight turn
 * @param sessionId Session ID
 * @param userId User ID
 * @returns Remaining seconds in spotlight
 */
export const getSpotlightRemainingTime = async (sessionId: string, userId: string): Promise<number> => {
  debugLog('Timer', `Getting remaining time for user ${userId} in session ${sessionId}`);
  
  try {
    // Get user's gender for the correct field
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    if (!userDoc.exists()) {
      debugLog('Timer', 'User document not found');
      return 0;
    }
    
    const userGender = userDoc.data().gender || '';
    const rotationTimeField = `${userGender}LastRotationTime`;
    
    // Get session data
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    if (!sessionDoc.exists()) {
      debugLog('Timer', 'Session document not found');
      return 0;
    }
    
    // Get the rotation time
    const lastRotationTime = sessionDoc.data()[rotationTimeField]?.toDate();
    if (!lastRotationTime) {
      debugLog('Timer', 'No rotation time found');
      return SPOTLIGHT_TIMER_SECONDS; // Default to full time
    }
    
    // Calculate elapsed and remaining time
    const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
    
    debugLog('Timer', `Remaining time: ${remainingSeconds}s (${formatTime(remainingSeconds)})`);
    return remainingSeconds;
  } catch (error) {
    debugLog('Timer', 'Error getting remaining time', error);
    return SPOTLIGHT_TIMER_SECONDS; // Default to full time on error
  }
};

/**
 * Increment view count for a contestant
 * @param sessionId Session ID
 * @param viewerId Viewer user ID
 * @param contestantId Contestant user ID
 */
export const incrementViewCount = async (sessionId: string, viewerId: string, contestantId: string): Promise<void> => {
  if (viewerId === contestantId) return; // Don't count self-views
  
  debugLog('Views', `Recording view from ${viewerId} to ${contestantId}`);
  
  try {
    // Check if view is already recorded
    const viewId = `${viewerId}_${contestantId}`;
    const viewRef = doc(firestore, 'lineupSessions', sessionId, 'views', viewId);
    const viewDoc = await getDoc(viewRef);
    
    if (!viewDoc.exists()) {
      // Record new view
      await updateDoc(doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', contestantId), {
        viewCount: increment(1)
      });
      
      // Record view timestamp
      await updateDoc(viewRef, {
        timestamp: serverTimestamp()
      });
      
      debugLog('Views', 'View count incremented');
    } else {
      debugLog('Views', 'View already recorded, not incrementing');
    }
  } catch (error) {
    debugLog('Views', 'Error incrementing view count', error);
  }
};

/**
 * Check if the timer has expired for a contestant
 * @param sessionId Session ID
 * @param userId User ID
 * @returns Boolean indicating if timer expired
 */
export const hasTimerExpired = async (sessionId: string, userId: string): Promise<boolean> => {
  const remainingTime = await getSpotlightRemainingTime(sessionId, userId);
  const hasExpired = remainingTime <= 0;
  
  debugLog('Timer', `Timer expired check for ${userId}: ${hasExpired}, remaining: ${remainingTime}s`);
  return hasExpired;
};

/**
 * Debug function to dump timer state
 * @param sessionId Session ID to debug
 */
export const dumpTimerState = async (sessionId: string): Promise<void> => {
  try {
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    
    if (!sessionDoc.exists()) {
      debugLog('Debug', 'Session not found for timer debug');
      return;
    }
    
    const data = sessionDoc.data();
    const maleRotationTime = data.maleLastRotationTime?.toDate();
    const femaleRotationTime = data.femaleLastRotationTime?.toDate();
    const generalRotationTime = data.lastRotationTime?.toDate();
    
    const now = new Date();
    
    const debug = {
      sessionId,
      now: now.toISOString(),
      maleRotation: maleRotationTime ? {
        time: maleRotationTime.toISOString(),
        elapsed: Math.floor((now.getTime() - maleRotationTime.getTime()) / 1000),
        remaining: Math.max(0, SPOTLIGHT_TIMER_SECONDS - Math.floor((now.getTime() - maleRotationTime.getTime()) / 1000))
      } : null,
      femaleRotation: femaleRotationTime ? {
        time: femaleRotationTime.toISOString(),
        elapsed: Math.floor((now.getTime() - femaleRotationTime.getTime()) / 1000),
        remaining: Math.max(0, SPOTLIGHT_TIMER_SECONDS - Math.floor((now.getTime() - femaleRotationTime.getTime()) / 1000))
      } : null,
      generalRotation: generalRotationTime ? {
        time: generalRotationTime.toISOString(),
        elapsed: Math.floor((now.getTime() - generalRotationTime.getTime()) / 1000),
        remaining: Math.max(0, SPOTLIGHT_TIMER_SECONDS - Math.floor((now.getTime() - generalRotationTime.getTime()) / 1000))
      } : null,
      timerConstants: {
        spotlightSeconds: SPOTLIGHT_TIMER_SECONDS,
        eliminationSeconds: ELIMINATION_TIMER_SECONDS,
      }
    };
    
    debugLog('Debug', 'Timer state dump', debug);
  } catch (error) {
    debugLog('Debug', 'Error dumping timer state', error);
  }
};