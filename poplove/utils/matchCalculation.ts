// utils/matchCalculation.ts

import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

/**
 * Calculate match percentage between two users based on their profiles
 * @param userId1 First user's ID
 * @param userId2 Second user's ID
 * @returns Match percentage (0-100)
 */
export const calculateMatchPercentage = async (userId1: string, userId2: string): Promise<number> => {
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
  
  const interestWeight = Math.min(20, (sharedInterests.length / Math.max(1, Math.min(user1Interests.length, user2Interests.length))) * 20);
  score += interestWeight;
  
  // Lifestyle matching (up to 15 points)
  const user1Lifestyle = user1Data.lifestyle || [];
  const user2Lifestyle = user2Data.lifestyle || [];
  
  const sharedLifestyle = user1Lifestyle.filter(item => 
    user2Lifestyle.includes(item)
  );
  
  const lifestyleWeight = Math.min(15, (sharedLifestyle.length / Math.max(1, Math.min(user1Lifestyle.length, user2Lifestyle.length))) * 15);
  score += lifestyleWeight;
  
  // Location matching (up to 10 points)
  if (user1Data.location && user2Data.location) {
    if (user1Data.location === user2Data.location) {
      score += 10;
    } else {
      // Check for partial match (e.g., same city or region)
      const user1Location = user1Data.location.toLowerCase();
      const user2Location = user2Data.location.toLowerCase();
      
      // Extract city from "City, Country" format
      const user1City = user1Location.split(',')[0]?.trim();
      const user2City = user2Location.split(',')[0]?.trim();
      
      if (user1City && user2City && (user1City === user2City)) {
        score += 8; // Good match - same city
      } else {
        // Check if they're in the same country/region
        const user1Country = user1Location.split(',')[1]?.trim();
        const user2Country = user2Location.split(',')[1]?.trim();
        
        if (user1Country && user2Country && (user1Country === user2Country)) {
          score += 3; // Partial match - same country/region
        }
      }
    }
  }
  
  // UPDATED: Age matching (up to 10 points)
  // Try to get exact ages first, then fall back to age ranges
  let user1Age = 0;
  let user2Age = 0;
  
  // Get exact ages if available
  if (user1Data.age) {
    user1Age = parseInt(user1Data.age);
  } else if (user1Data.ageRange) {
    const match = user1Data.ageRange.match(/^(\d+)/);
    if (match && match[1]) {
      user1Age = parseInt(match[1]);
    }
  }
  
  if (user2Data.age) {
    user2Age = parseInt(user2Data.age);
  } else if (user2Data.ageRange) {
    const match = user2Data.ageRange.match(/^(\d+)/);
    if (match && match[1]) {
      user2Age = parseInt(match[1]);
    }
  }
  
  // Calculate age score based on proximity
  if (user1Age > 0 && user2Age > 0) {
    const ageDifference = Math.abs(user1Age - user2Age);
    
    // Age scoring logic: closer ages get higher scores
    if (ageDifference === 0) {
      score += 10; // Exact match
    } else if (ageDifference <= 2) {
      score += 9; // Very close
    } else if (ageDifference <= 5) {
      score += 7; // Close
    } else if (ageDifference <= 10) {
      score += 5; // Moderate match
    } else if (ageDifference <= 15) {
      score += 3; // Somewhat distant
    } else {
      score += 1; // Distant match
    }
  } else {
    // Fallback to old ageRange matching if exact ages aren't available
    const user1AgeRange = user1Data.ageRange || '';
    const user2AgeRange = user2Data.ageRange || '';
    
    if (user1AgeRange && user2AgeRange) {
      // Extract min and max ages
      const user1Match = user1AgeRange.match(/(\d+).*?(\d+)/);
      const user2Match = user2AgeRange.match(/(\d+).*?(\d+)/);
      
      if (user1Match && user2Match) {
        const user1Min = parseInt(user1Match[1]);
        const user1Max = parseInt(user1Match[2]);
        const user2Min = parseInt(user2Match[1]);
        const user2Max = parseInt(user2Match[2]);
        
        // Calculate overlap
        const overlapStart = Math.max(user1Min, user2Min);
        const overlapEnd = Math.min(user1Max, user2Max);
        
        if (overlapEnd >= overlapStart) {
          // There is some overlap
          const overlapLength = overlapEnd - overlapStart + 1;
          const user1Range = user1Max - user1Min + 1;
          const user2Range = user2Max - user2Min + 1;
          
          // Calculate overlap percentage
          const overlapPercentage = overlapLength / Math.min(user1Range, user2Range);
          
          // Award points based on overlap
          score += Math.min(10, overlapPercentage * 10);
        }
      }
    }
  }
  
  // Bio keyword matching (up to 5 points)
  if (user1Data.bio && user2Data.bio) {
    const user1Bio = user1Data.bio.toLowerCase();
    const user2Bio = user2Data.bio.toLowerCase();
    
    // Extract meaningful words (4+ characters)
    const user1Words = user1Bio.split(/\s+/).filter(word => word.length >= 4);
    const user2Words = user2Bio.split(/\s+/).filter(word => word.length >= 4);
    
    // Count shared words
    const sharedWords = user1Words.filter(word => user2Words.includes(word));
    
    // Award points
    score += Math.min(5, (sharedWords.length / Math.max(5, Math.min(user1Words.length, user2Words.length))) * 5);
  }
  
  // Add some randomness (±5 points)
  const randomFactor = Math.floor(Math.random() * 10) - 5;
  score += randomFactor;
  
  // Boost score a bit to make matches feel better (people prefer higher percentages)
  score = Math.min(100, Math.floor(score * 1.1)); // 10% boost, capped at 100
  
  // Ensure minimum score of 40 to avoid very low matches
  return Math.max(40, Math.round(score));
};