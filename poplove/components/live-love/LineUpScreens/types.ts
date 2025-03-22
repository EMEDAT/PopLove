// components/live-love/LineUpScreens/types.ts

export interface User {
  uid: string;
  displayName?: string;
  photoURL?: string;
  gender?: string;
  email?: string;
}

export interface Contestant {
    id: string;
    displayName: string;
    photoURL: string;
    ageRange: string;
    bio?: string;
    location?: string;
    interests?: string[];
    gender: string;
    matchPercentage?: number;
    popCount?: number;
    likeCount?: number;
  }
  
  export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderPhoto: string;
    senderGender?: string; // Add gender field
    text: string;
    timestamp: any; // Firestore timestamp
    isRead?: boolean;
  }
  
  export interface LineUpCategory {
    id: string;
    name: string;
    selected: boolean;
  }
  
  export type LineUpStep = 
  | 'selection'      // Category selection screen
  | 'lineup'         // Main lineup viewing screen
  | 'private'        // Private screen for current contestant
  | 'matches'        // Match selection after turn
  | 'confirmation'   // Match confirmation with 5s timer
  | 'eliminated'     // Eliminated/disqualified screen
  | 'no-matches';    // No matches found screen
  
  export interface LineUpSessionData {
    id: string;
    category: string[];
    currentSpotlightId?: string;
    currentMaleSpotlightId?: string;
    currentFemaleSpotlightId?: string;
    contestants: string[];
    startTime?: any;
    endTime?: any;
    status: 'active' | 'completed' | 'cancelled';
    isFirstGenderContestant?: boolean;  // New field
  }
  
  export interface MatchData {
    userId: string;
    displayName: string;
    photoURL: string;
    matchPercentage: number;
    timestamp: any;
    isMutualMatch?: boolean; // Added this field
}