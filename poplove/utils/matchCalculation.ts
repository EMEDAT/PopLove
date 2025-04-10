// utils/matchCalculation.ts

import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

/**
 * Calculate match percentage between two users based on their complete profiles
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
  let score = 45; // Adjusted base score
  let totalFactors = 0;
  let factorsContributing = 0;
  
  // INTERESTS MATCHING (up to 20 points)
  const user1Interests = user1Data.interests || [];
  const user2Interests = user2Data.interests || [];
  
  if (user1Interests.length > 0 && user2Interests.length > 0) {
    totalFactors++;
    factorsContributing++;
    
    const sharedInterests = user1Interests.filter(interest => 
      user2Interests.includes(interest)
    );
    
    const interestWeight = Math.min(20, (sharedInterests.length / Math.max(1, Math.min(user1Interests.length, user2Interests.length))) * 20);
    score += interestWeight;
  }

  // PRONOUNS COMPATIBILITY (up to 3 points)
  if (user1Data.pronouns && user2Data.pronouns) {
    totalFactors++;
    factorsContributing++;
    
    // Determine pronoun gender alignment
    const getGenderFromPronouns = (pronouns) => {
      if (pronouns.includes('He')) return 'male';
      if (pronouns.includes('She')) return 'female';
      return 'neutral';
    };
    
    const gender1 = getGenderFromPronouns(user1Data.pronouns);
    const gender2 = getGenderFromPronouns(user2Data.pronouns);
    
    // For heterosexual matching
    if ((gender1 === 'male' && gender2 === 'female') || 
        (gender1 === 'female' && gender2 === 'male')) {
      score += 3;
    } 
    // For same pronouns matching
    else if (user1Data.pronouns === user2Data.pronouns) {
      score += 2;
    }
    // For gender-neutral and other combinations
    else if (gender1 === 'neutral' || gender2 === 'neutral') {
      score += 2;
    }
    // All other combinations
    else {
      score += 1;
    }
  }
  
  // LIFESTYLE MATCHING (up to 15 points)
  const user1Lifestyle = user1Data.lifestyle || [];
  const user2Lifestyle = user2Data.lifestyle || [];
  
  if (user1Lifestyle.length > 0 && user2Lifestyle.length > 0) {
    totalFactors++;
    factorsContributing++;
    
    const sharedLifestyle = user1Lifestyle.filter(item => 
      user2Lifestyle.includes(item)
    );
    
    const lifestyleWeight = Math.min(15, (sharedLifestyle.length / Math.max(1, Math.min(user1Lifestyle.length, user2Lifestyle.length))) * 15);
    score += lifestyleWeight;
  }
  
  // LOCATION MATCHING (up to 15 points) - Enhanced and prioritized
  if (user1Data.location && user2Data.location) {
    totalFactors++;
    factorsContributing++;
    
    // Enhanced location matching with prioritization
    const locationScore = calculateLocationScore(user1Data, user2Data);
    score += locationScore;
  }
  
  // AGE MATCHING (up to 10 points)
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
    totalFactors++;
    factorsContributing++;
    
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
    // Fallback to age range matching
    const user1AgeRange = user1Data.ageRange || '';
    const user2AgeRange = user2Data.ageRange || '';
    
    if (user1AgeRange && user2AgeRange) {
      totalFactors++;
      factorsContributing++;
      
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
  
  // HEIGHT MATCHING (up to 5 points)
  if (user1Data.height && user2Data.height) {
    totalFactors++;
    factorsContributing++;
    
    const height1 = parseInt(user1Data.height);
    const height2 = parseInt(user2Data.height);
    
    if (!isNaN(height1) && !isNaN(height2)) {
      const heightDiff = Math.abs(height1 - height2);
      
      // Traditional height preferences by gender
      const user1Gender = user1Data.gender || '';
      const user2Gender = user2Data.gender || '';
      
      if ((user1Gender === 'male' && user2Gender === 'female' && height1 >= height2) ||
          (user1Gender === 'female' && user2Gender === 'male' && height1 <= height2)) {
        // "Traditional" height preference - taller men, shorter women
        if (heightDiff <= 15) score += 5;
        else if (heightDiff <= 25) score += 4;
        else score += 2;
      } else {
        // Non-traditional or same gender matching
        if (heightDiff <= 5) score += 5;
        else if (heightDiff <= 10) score += 3;
        else if (heightDiff <= 20) score += 2;
        else score += 1;
      }
    }
  }
  
  // ETHNICITY MATCHING (up to 5 points)
  if (user1Data.ethnicity && user2Data.ethnicity) {
    totalFactors++;
    factorsContributing++;
    
    if (user1Data.ethnicity === user2Data.ethnicity) {
      score += 5; // Exact match
    } else if (user1Data.ethnicity === 'Multiracial' || user2Data.ethnicity === 'Multiracial') {
      score += 3; // Multiracial users match well with others
    } else if (user1Data.ethnicity === 'Prefer not to say' || user2Data.ethnicity === 'Prefer not to say') {
      score += 2; // Neutral option
    } else {
      score += 1; // Different ethnicities
    }
  }
  
  // CHILDREN COMPATIBILITY (up to 5 points)
  if (user1Data.hasChildren && user2Data.hasChildren) {
    totalFactors++;
    factorsContributing++;
    
    // Exact match on children status
    if (user1Data.hasChildren === user2Data.hasChildren) {
      score += 5;
    }
    // Both have children (different counts)
    else if (user1Data.hasChildren.startsWith('Have') && user2Data.hasChildren.startsWith('Have')) {
      score += 4;
    }
    // One wants children, one has children
    else if ((user1Data.hasChildren === 'Want children someday' && user2Data.hasChildren.startsWith('Have')) ||
             (user2Data.hasChildren === 'Want children someday' && user1Data.hasChildren.startsWith('Have'))) {
      score += 3;
    }
    // One wants children, one doesn't want children
    else if ((user1Data.hasChildren === 'Want children someday' && user2Data.hasChildren === "Don't want children") ||
             (user2Data.hasChildren === 'Want children someday' && user1Data.hasChildren === "Don't want children")) {
      score -= 2; // Negative compatibility
    }
    // Other combinations
    else {
      score += 1;
    }
  }
  
  // BIO KEYWORD MATCHING (up to 5 points)
  if (user1Data.bio && user2Data.bio) {
    totalFactors++;
    factorsContributing++;
    
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
  
  // Adjust score based on how many factors were actually available
  if (totalFactors > 0 && factorsContributing < totalFactors) {
    // Extrapolate score to account for missing data
    const extrapolationFactor = totalFactors / factorsContributing;
    score = Math.min(100, score * extrapolationFactor);
  }
  
  // Add some randomness (±3 points) to create variety
  const randomFactor = Math.floor(Math.random() * 6) - 3;
  score += randomFactor;
  
  // Boost score slightly (people prefer higher percentages)
  score = Math.min(100, Math.floor(score * 1.05)); // 5% boost, capped at 100
  
  // Ensure minimum score of 45 to avoid too low matches
  return Math.max(45, Math.round(score));
};

/**
 * Enhanced function for calculating location match score with prioritization
 * @param user1Data First user's data
 * @param user2Data Second user's data
 * @returns Location match score (0-15)
 */
const calculateLocationScore = (user1Data: any, user2Data: any): number => {
  // If exact location string match, perfect score
  if (user1Data.location === user2Data.location) {
    return 15; // Perfect match - exact location strings
  }
  
  // Parse location strings - format: "City, State, Country"
  const parseLocation = (locationString: string) => {
    const parts = locationString.split(',').map(part => part.trim().toLowerCase());
    return {
      // If only 1 part, assume it's a city
      city: parts.length > 0 ? parts[0] : '',
      // If 2 parts, assume state is 2nd part
      state: parts.length > 1 ? parts[1] : '',
      // If 3 parts or 2 parts with no state, assume country is last part
      country: parts.length > 2 ? parts[2] : (parts.length === 2 ? parts[1] : '')
    };
  };
  
  const loc1 = parseLocation(user1Data.location);
  const loc2 = parseLocation(user2Data.location);
  
  // PRIORITY 1: City match - highest priority (12 points)
  if (loc1.city && loc2.city && loc1.city === loc2.city) {
    return 15; // Full score for matching city
  }
  
  // PRIORITY 2: State match - medium priority (8 points)
  if (loc1.state && loc2.state && loc1.state === loc2.state) {
    return 8; // Good score for matching state
  }
  
  // PRIORITY 3: Country match - lowest priority (4 points)
  if (loc1.country && loc2.country && loc1.country === loc2.country) {
    return 4; // Basic score for matching country
  }
  
  // Different locations
  return 1;
};

// Direct matching by location components with proper prioritization
export const matchUsersByLocation = (users: any[], currentUserLocation: any): any[] => {
  if (!currentUserLocation) return users;
  
  // Helper function to parse location string
  const parseLocation = (locationString: string) => {
    if (!locationString) return { city: '', state: '', country: '' };
    
    const parts = locationString.split(',').map(part => part.trim().toLowerCase());
    return {
      city: parts.length > 0 ? parts[0] : '',
      state: parts.length > 1 ? parts[1] : '',
      country: parts.length > 2 ? parts[2] : (parts.length === 2 ? parts[1] : '')
    };
  };
  
  // Parse current user's location
  const userLoc = parseLocation(currentUserLocation);
  
  // First try to match by city - highest priority
  let matches = users.filter(user => {
    const otherLoc = parseLocation(user.location);
    return userLoc.city && otherLoc.city && userLoc.city === otherLoc.city;
  });
  
  // If no matches by city, try matching by state
  if (matches.length === 0 && userLoc.state) {
    matches = users.filter(user => {
      const otherLoc = parseLocation(user.location);
      return otherLoc.state && userLoc.state === otherLoc.state;
    });
  }
  
  // If still no matches, try matching by country
  if (matches.length === 0 && userLoc.country) {
    matches = users.filter(user => {
      const otherLoc = parseLocation(user.location);
      return otherLoc.country && userLoc.country === otherLoc.country;
    });
  }
  
  // If still no matches, return everyone sorted by closest location components
  if (matches.length === 0) {
    return users.sort((a, b) => {
      const locA = parseLocation(a.location);
      const locB = parseLocation(b.location);
      
      // Compare by country first
      if (userLoc.country) {
        const countryMatchA = locA.country === userLoc.country;
        const countryMatchB = locB.country === userLoc.country;
        if (countryMatchA && !countryMatchB) return -1;
        if (!countryMatchA && countryMatchB) return 1;
      }
      
      // Then by state
      if (userLoc.state) {
        const stateMatchA = locA.state === userLoc.state;
        const stateMatchB = locB.state === userLoc.state;
        if (stateMatchA && !stateMatchB) return -1;
        if (!stateMatchA && stateMatchB) return 1;
      }
      
      return 0;
    });
  }
  
  return matches;
};