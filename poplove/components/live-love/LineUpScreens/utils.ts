// components/live-love/LineUpScreens/utils.ts

import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';

const matchPercentageCache = new Map();

// Calculate match percentage between two users
export const calculateMatchPercentage = async (userId1: string, userId2: string): Promise<number> => {
    
  // Create a unique cache key for this pair of users
    const cacheKey = [userId1, userId2].sort().join('_');
  
    // Check if we have a cached result
    if (matchPercentageCache.has(cacheKey)) {
      return matchPercentageCache.get(cacheKey);
    }

  // Get user data
  const user1Doc = await getDoc(doc(firestore, 'users', userId1));
  const user2Doc = await getDoc(doc(firestore, 'users', userId2));
  
  if (!user1Doc.exists() || !user2Doc.exists()) {
    return 0;
  }
  
  const user1Data = user1Doc.data();
  const user2Data = user2Doc.data();
  
  // Calculate based on shared interests, lifestyle, etc.
  let score = 50; // Base score
  
  // Interests matching (up to 20 points)
  const user1Interests = user1Data.interests || [];
  const user2Interests = user2Data.interests || [];
  
  const sharedInterests = user1Interests.filter(interest => 
    user2Interests.includes(interest)
  );
  
  const interestScore = Math.min(20, (sharedInterests.length / Math.max(1, user1Interests.length)) * 20);
  score += interestScore;
  
  // Lifestyle matching (up to 15 points)
  const user1Lifestyle = user1Data.lifestyle || [];
  const user2Lifestyle = user2Data.lifestyle || [];
  
  const sharedLifestyle = user1Lifestyle.filter(item => 
    user2Lifestyle.includes(item)
  );
  
  const lifestyleScore = Math.min(15, (sharedLifestyle.length / Math.max(1, user1Lifestyle.length)) * 15);
  score += lifestyleScore;
  
  // Location matching (up to 10 points)
  if (user1Data.location && user2Data.location) {
    if (user1Data.location === user2Data.location) {
      score += 10;
    } else {
      // Check for partial match (e.g., same city)
      const user1Location = user1Data.location.toLowerCase();
      const user2Location = user2Data.location.toLowerCase();
      
      if (user1Location.includes(user2Location) || user2Location.includes(user1Location)) {
        score += 5;
      }
    }
  }
  
  // Add some randomness (±5 points)
  score += Math.floor(Math.random() * 10) - 5;
  
  // Ensure score is between 0 and 100
  const result = Math.max(40, Math.round(score));
  matchPercentageCache.set(cacheKey, result);
  return result;
};

// Format time string (e.g., 4h → "04:00:00")
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

// Check if user is eligible for lineup (not eliminated in the past 48 hours)
export const checkUserEligibility = async (userId: string): Promise<boolean> => {
  const eliminationDoc = await getDoc(doc(firestore, 'userEliminations', userId));
  
  if (!eliminationDoc.exists()) {
    return true; // No elimination record
  }
  
  const eliminationData = eliminationDoc.data();
  const eligibleAt = eliminationData.eligibleAt.toDate();
  const now = new Date();
  
  return now >= eligibleAt;
};