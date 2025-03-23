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
  joinedAt?: any; // Firestore timestamp
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  senderGender?: string; // Gender field for filtering
  text: string;
  timestamp: any; // Firestore timestamp
  isRead?: boolean;
  status?: 'sending' | 'sent' | 'error';
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
| 'no-matches'     // No matches found screen
| 'congratulations'; // Congratulations screen after match

export interface LineUpSessionData {
  id: string;
  category: string[];
  currentContestantId?: string;      // Legacy field
  currentMaleContestantId?: string;  // Gender-specific current contestant
  currentFemaleContestantId?: string; // Gender-specific current contestant
  contestants: string[];
  startTime?: any;
  endTime?: any;
  status: 'active' | 'completed' | 'cancelled';
  lastRotationTime?: any;           // Legacy field
  maleLastRotationTime?: any;       // Gender-specific rotation time
  femaleLastRotationTime?: any;     // Gender-specific rotation time
  isFirstGenderContestant?: boolean; // Flag for first contestant of gender
  primaryGender?: 'male' | 'female'; // Primary gender for the session
}

export interface MatchData {
  userId: string;
  displayName: string;
  photoURL: string;
  matchPercentage: number;
  timestamp: any;
  isMutualMatch?: boolean; // Whether both users liked each other
  gender?: string;         // For gender filtering
  ageRange?: string;       // Age range for display
  bio?: string;            // Bio for display
}

export interface ContestantJoinTimeData {
  userId: string;
  gender: string;
  joinedAt: any;           // Firestore timestamp
  completed: boolean;      // Whether this contestant has completed their turn
  completedAt?: any;       // When they completed their turn
}

export interface SpotlightStats {
  likeCount: number;
  popCount: number;
  viewCount: number;
}

export interface RotationEvent {
  timestamp: any;          // When rotation occurred
  rotationId: string;      // Unique ID for deduplication
  previousContestantId: string | null;
  newContestantId: string | null;
  gender: string;          // Which gender rotated
}

export interface EliminationData {
  eliminatedAt: any;       // When user was eliminated
  eligibleAt: any;         // When user can rejoin
  sessionId: string;       // Session where elimination occurred
}

// Types for debugging and monitoring
export interface TimerState {
  spotlightTimer: number;
  serverTime: number;
  clientTime: number;
  lastSync: number;
  drift: number;
}

export interface LogEvent {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  area: string;
  message: string;
  data?: any;
}