// components/live-love/LineUpScreens/LineUpContext.tsx

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { 
  Contestant, 
  LineUpStep, 
  LineUpCategory, 
  ChatMessage, 
  MatchData,
  SpotlightStats,
  RotationEvent
} from './types';
import { useAuthContext } from '../../auth/AuthProvider';
import * as LineupService from '../../../services/lineupService';
import { 
  doc, 
  getDoc, 
  serverTimestamp, 
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { calculateMatchPercentage } from '../../../utils/matchCalculation';
import { debugLog, formatTime, checkUserEligibility, getSpotlightRemainingTime } from './utils';

// Constants for lineup
const SPOTLIGHT_TIMER_SECONDS = 5 * 60; // 4 hours in seconds (14,400 seconds)
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 48 hours in seconds (172,800 seconds)
const SERVER_SYNC_INTERVAL = 60 * 1000; // Sync with server every minute
const MIN_REFRESH_INTERVAL = 30 * 1000; // Minimum time between refreshes

interface LineUpContextType {
  // State
  step: LineUpStep;
  categories: LineUpCategory[];
  upcomingSpotlights: Contestant[];
  currentSpotlight: Contestant | null;
  selectedMatches: MatchData[];
  messages: ChatMessage[];
  isCurrentUser: boolean;
  eliminated: boolean;
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  timeLeft: number;
  spotlightTimeLeft: number;
  eliminationTimeLeft: number;
  popCount: number;
  likeCount: number;
  
  // Methods
  setStep: (step: LineUpStep) => void;
  toggleCategory: (id: string) => void;
  startLineUp: () => Promise<void>;
  handleAction: (action: 'like' | 'pop', spotlightId: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  selectMatch: (match: MatchData) => void;
  confirmMatch: (match: MatchData) => Promise<string | null>;
  goBack: () => void;
  checkEligibility: () => Promise<boolean>;
  refreshSpotlights: () => Promise<Contestant[]>;
  setMessages: (messages: ChatMessage[]) => void;
  setSelectedMatches: (matches: MatchData[]) => void;
  setIsCurrentUser: (isCurrentUser: boolean) => void;
  setLikeCount: (count: number) => void;
  setPopCount: (count: number) => void;
  startSpotlightTimer: () => void;
  setSessionId: (id: string | null) => void;
  setSpotlightTimeLeft: (time: number) => void;
  checkUserMatches: () => Promise<void>;
  setCurrentSpotlight?: (spotlight: Contestant | null) => void;
  
  // Enhanced methods for better stability
  resetTimers: () => void;
  forceRefreshSpotlightStatus: () => Promise<void>;
  syncWithServerTime: () => Promise<void>;
  markUserActivity: () => Promise<void>;
  getMatchPercentageData: (spotlightId: string) => Promise<number>;
}

const LineUpContext = createContext<LineUpContextType | undefined>(undefined);

export const LineUpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  debugLog('Provider', '🚀 Initializing LineUpProvider');
  
  const { user } = useAuthContext();
  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState<LineUpStep>('selection');
  const [categories, setCategories] = useState<LineUpCategory[]>([
    { id: 'christian', name: 'Christian Singles', selected: false },
    { id: 'professionals', name: 'Professionals', selected: false },
    { id: 'adventurous', name: 'Adventurous Singles', selected: false },
    { id: 'others', name: 'Others', selected: false },
  ]);
  const [upcomingSpotlights, setUpcomingSpotlights] = useState<Contestant[]>([]); 
  const [currentSpotlight, setCurrentSpotlight] = useState<Contestant | null>(null); 
  const [selectedMatches, setSelectedMatches] = useState<MatchData[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isCurrentUser, _setIsCurrentUser] = useState(false);
  const [eliminated, setEliminated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, _setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(SPOTLIGHT_TIMER_SECONDS);
  const [spotlightTimeLeft, _setSpotlightTimeLeft] = useState<number>(SPOTLIGHT_TIMER_SECONDS);
  const [eliminationTimeLeft, setEliminationTimeLeft] = useState<number>(ELIMINATION_TIMER_SECONDS);
  const [popCount, setPopCount] = useState<number>(0);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [transitioning, setTransitioning] = useState(false);
  const [interactedContestants, setInteractedContestants] = useState<Set<string>>(new Set());
  const [contestantActions, setContestantActions] = useState<Map<string, 'like' | 'pop'>>(new Map());
  
  // Refs for stable references between renders
  const turnCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const serverSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerZeroReachedRef = useRef<boolean>(false);
  const isRefreshingRef = useRef(false);
  const isCurrentUserRef = useRef(isCurrentUser);
  const sessionIdRef = useRef(sessionId);
  const userGenderRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastServerSyncTimeRef = useRef<number>(Date.now());
  const matchPercentageCacheRef = useRef<Map<string, number>>(new Map());
  const lastActivityTimeRef = useRef<number>(Date.now());
  const spotlightTimeLeftRef = useRef<number>(SPOTLIGHT_TIMER_SECONDS);
  const hasStartedTimerRef = useRef<boolean>(false);
  const messageSubscriptionRef = useRef<() => void>(() => {});
  const rotationListenerRef = useRef<() => void>(() => {});
  const statsListenerRef = useRef<() => void>(() => {});
  const [viewCount, setViewCount] = useState<number>(0);
  const interactedContestantsRef = useRef(new Set());
  const sessionStateLocksRef = useRef(new Set<string>());
  const timerExpirationInProgressRef = useRef(false);

  // Add this useEffect to set up real-time view count listener
  useEffect(() => {
    if (!sessionId || !currentSpotlight) return;
    
    debugLog('Views', `Setting up view count listener for ${currentSpotlight.id}`);
    
    // Listen for stats changes on the current spotlight
    const statsRef = doc(firestore, 'lineupSessions', sessionId, 'spotlightStats', currentSpotlight.id);
    
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.viewCount !== undefined) {
          debugLog('Views', `Received viewCount update: ${data.viewCount}`);
          
          // Update current spotlight with new view count
          setCurrentSpotlight(prev => {
            if (!prev) return null;
            return {
              ...prev,
              viewCount: data.viewCount
            };
          });
        }
      }
    }, (error) => {
      debugLog('Views', 'Error in view count listener', error);
    });
    
    // Add cleanup function
    return () => {
      debugLog('Views', 'Cleaning up view count listener');
      unsubscribe();
    };
  }, [sessionId, currentSpotlight?.id]);

  // Update the trackProfileView function call when a new contestant is viewed
  useEffect(() => {
    if (!user || !sessionId || !currentSpotlight) return;
    
    // Add a debounce to avoid multiple view counts when component re-renders
    const timeoutId = setTimeout(() => {
      debugLog('Views', `Tracking view for contestant ${currentSpotlight.id}`);
      
      LineupService.trackProfileView(sessionId, user.uid, currentSpotlight.id)
        .catch(error => {
          debugLog('Views', 'Error tracking profile view', error);
        });
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [currentSpotlight?.id, sessionId, user?.uid]);

/**
 * Get gender-filtered spotlights
 */
const getGenderFilteredSpotlights = async (): Promise<Contestant[]> => {
  if (!sessionId || !user) return [];
  
  try {
    // Get user gender if not cached
    if (!userGenderRef.current) {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        userGenderRef.current = userDoc.data().gender || '';
      }
    }
    
    const userGender = userGenderRef.current;
    if (!userGender) return [];
    
    // Determine opposite gender to show
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    
    // Get spotlights from service, filtering by opposite gender
    const allSpotlights = await LineupService.getSpotlights(sessionId, user.uid);
    
    // Further filter to ensure only opposite gender is shown
    const filteredSpotlights = allSpotlights.filter(spotlight => 
      spotlight.gender === oppositeGender
    );
    
    // Run match percentage calculation for each spotlight
    const spotlightsWithMatch = await Promise.all(
      filteredSpotlights.map(async (spotlight) => {
        if (!spotlight.matchPercentage) {
          try {
            const matchPercentage = await calculateMatchPercentage(user.uid, spotlight.id);
            return { ...spotlight, matchPercentage };
          } catch (error) {
            return { ...spotlight, matchPercentage: 50 };
          }
        }
        return spotlight;
      })
    );
    
    return spotlightsWithMatch;
  } catch (error) {
    debugLog('GenderFilter', `Error getting filtered spotlights: ${error}`);
    return [];
  }
};
  
  // Enhanced setter for spotlight time with ref update
  const setSpotlightTimeLeft = (time: number) => {
    debugLog('Timer', `Setting spotlight time left: ${time}s (${formatTime(time)})`);
    _setSpotlightTimeLeft(time);
    spotlightTimeLeftRef.current = time;
    
    // Log when timer is getting close to zero
    if (time <= 300 && time % 60 === 0) { // Log every minute when under 5 minutes
      debugLog('Timer', `⚠️ Spotlight ending soon: ${formatTime(time)}`);
    }
    
    // Check if timer reached zero
    if (time <= 0 && !timerZeroReachedRef.current && isCurrentUserRef.current) {
      timerZeroReachedRef.current = true;
      debugLog('Timer', '⏰ Timer reached zero, processing rotation');
      handleTimerExpiration();
    }
  };
  
  // Set session ID with ref update and logging
  const setSessionId = (id: string | null) => {
    debugLog('Session', `Setting session ID: ${id || 'null'}`);
    _setSessionId(id);
    sessionIdRef.current = id;
  };
  
  // Set isCurrentUser with ref update and logging
  const setIsCurrentUser = (value: boolean) => {
    debugLog('User', `Setting isCurrentUser: ${value}`);
    _setIsCurrentUser(value);
    isCurrentUserRef.current = value;
    
    // Start timer if becoming current user
    if (value && !hasStartedTimerRef.current) {
      debugLog('Timer', 'Auto-starting timer due to becoming current user');
      startSpotlightTimer();
    }
  };
  
  // Initialize provider on mount
  useEffect(() => {
    if (!initialized) {
      debugLog('Init', 'First-time initialization');
      setInitialized(true);
      
      // Make context available globally
      if (typeof window !== 'undefined') {
        window.lineupContextRef = {
          current: {
            setIsCurrentUser,
            setSessionId,
            startSpotlightTimer,
            setStep,
            syncWithServerTime: async () => {
              await syncWithServerTime();
              return true;
            }
          }
        };
      }
      
      // Set up app state listener
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      
      // Cache user gender on init
      cacheUserGender();
      
      return () => {
        subscription.remove();
      };
    }
  }, [initialized]);
  
  // App state change handler
  const handleAppStateChange = async (nextAppState: string) => {
    const wasBackground = appStateRef.current.match(/inactive|background/);
    const isActive = nextAppState === 'active';
    appStateRef.current = nextAppState as AppStateStatus;
    
    debugLog('AppState', `App state changed: ${nextAppState}`);
    
    // Coming back to foreground
    if (wasBackground && isActive) {
      debugLog('AppState', 'App returning to foreground, syncing state');
      
      // Always sync with server when returning to foreground
      await syncWithServerTime();
      
      // Check if we're the current user
      if (sessionIdRef.current && user) {
        await checkCurrentContestantStatus();
      }
      
      // If current user, ensure timer is running
      if (isCurrentUserRef.current && !timerIntervalRef.current) {
        debugLog('Timer', 'Restarting timer after app return to foreground');
        startSpotlightTimer();
      }
      
      // Mark user as active
      markUserActivity();
    }
  };
  
  // Cache user gender to avoid repeated lookups
  const cacheUserGender = async () => {
    if (!user) return;
    
    try {
      debugLog('User', 'Caching user gender');
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const gender = userDoc.data().gender;
        userGenderRef.current = gender;
        debugLog('User', `Cached user gender: ${gender}`);
      }
    } catch (error) {
      debugLog('User', 'Error caching user gender', error);
    }
  };
  
// Check if current user is still the current contestant
const checkCurrentContestantStatus = async () => {
  if (!sessionIdRef.current || !user || !userGenderRef.current) return false;
  
  try {
    debugLog('Status', 'Checking current contestant status');
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionIdRef.current));
    
    if (!sessionDoc.exists()) {
      debugLog('Status', 'Session not found');
      return false;
    }
    
    const sessionData = sessionDoc.data();
    const gender = userGenderRef.current;
    const contestantField = `current${gender.charAt(0).toUpperCase()}${gender.slice(1)}ContestantId`;
    const currentContestantId = sessionData[contestantField];
    
    const isStillCurrentContestant = currentContestantId === user.uid;
    debugLog('Status', `Is still current ${gender} contestant: ${isStillCurrentContestant}`);
    
    // Update state to match reality
    if (isStillCurrentContestant !== isCurrentUserRef.current) {
      setIsCurrentUser(isStillCurrentContestant);
      
      // If became the current contestant, move to private screen
      if (isStillCurrentContestant && step !== 'private') {
        debugLog('Navigation', 'Moving to private screen due to becoming current contestant');
        setStep('private');
      }
      // If no longer current contestant, move to lineup screen
      else if (!isStillCurrentContestant && step === 'private') {
        debugLog('Navigation', 'Moving to lineup screen due to no longer being current contestant');
        setStep('lineup');
      }
    }
    
    return isStillCurrentContestant;
  } catch (error) {
    debugLog('Status', 'Error checking current contestant status', error);
    return false;
  }
};

// Sync with server time to keep timer accurate
const syncWithServerTime = async () => {
  if (!sessionIdRef.current || !user || !userGenderRef.current) return;
  
  try {
    const now = Date.now();
    // Don't sync too frequently
    if (now - lastServerSyncTimeRef.current < 5000) {
      debugLog('Sync', 'Skipping timer sync - too soon since last sync');
      return;
    }
    
    lastServerSyncTimeRef.current = now;
    debugLog('Sync', 'Syncing with server time');
    
    // Determine which timer to sync
    const gender = userGenderRef.current;
    const remainingTime = await getSpotlightRemainingTime(sessionIdRef.current, user.uid);
    
    debugLog('Sync', `Server sync result: ${remainingTime}s remaining for ${gender} contestant`);
    
    // Update timer if different by more than 10 seconds
    const currentTime = spotlightTimeLeftRef.current;
    if (Math.abs(remainingTime - currentTime) > 10) {
      debugLog('Sync', `Updating timer from ${currentTime}s to ${remainingTime}s (drift: ${remainingTime - currentTime}s)`);
      setSpotlightTimeLeft(remainingTime);
    }
    
    // Check if timer expired according to server
    if (remainingTime <= 0 && isCurrentUserRef.current && !timerZeroReachedRef.current) {
      debugLog('Sync', '⚠️ Server indicates timer expired but we missed it, handling expiration');
      timerZeroReachedRef.current = true;
      handleTimerExpiration();
    }
  } catch (error) {
    debugLog('Sync', 'Error syncing with server time', error);
  }
};

// Record user activity to show they're online
const markUserActivity = async () => {
  if (!sessionIdRef.current || !user) return;
  
  try {
    const now = Date.now();
    // Throttle activity updates to once per minute
    if (now - lastActivityTimeRef.current < 60000) return;
    
    lastActivityTimeRef.current = now;
    debugLog('Activity', 'Marking user as active');
    
    // Update active users collection
    await setDoc(doc(firestore, 'lineupSessions', sessionIdRef.current, 'activeUsers', user.uid), {
      lastActive: serverTimestamp(),
      gender: userGenderRef.current || 'unknown'
    }, { merge: true });
  } catch (error) {
    debugLog('Activity', 'Error marking user as active', error);
    // Non-critical, don't rethrow
  }
};

// Handle timer expiration for current contestant
const handleTimerExpiration = async () => {
  if (!sessionIdRef.current || !user) return;
  
  // Prevent multiple executions of timer expiration
  if (timerExpirationInProgressRef.current) return;
  timerExpirationInProgressRef.current = true;
  
  try {
    // Check matches
    const matchesList = await LineupService.getUserMatches(sessionIdRef.current, user.uid);
    
    // Force navigation with a clean state reset
    if (matchesList.length > 0) {
      // Has matches - go to matches screen
      setSelectedMatches(matchesList);
      setIsCurrentUser(false);
      setStep('matches');
    } else {
      // No matches - force to no-matches screen
      setIsCurrentUser(false);
      setStep('no-matches');
      
      // Important: Block any competing state changes
      timerZeroReachedRef.current = true;
      
      // Clear any rotation listeners that might override this state
      if (rotationListenerRef.current) {
        rotationListenerRef.current();
        rotationListenerRef.current = () => {};
      }
    }
  } catch (error) {
    console.error('Error in timer expiration:', error);
    // Fallback to lineup on error
    setIsCurrentUser(false);
    setStep('lineup');
  } finally {
    // Release lock with delay to ensure state settles
    setTimeout(() => {
      timerExpirationInProgressRef.current = false;
    }, 500);
  }
};

// Start countdown timer for contestant spotlight with server sync
const startSpotlightTimer = useCallback(() => {
  debugLog('Timer', 'Starting spotlight timer');
  
  // Clear any existing timers
  resetTimers();
  
  // Set flag to prevent multiple starts
  hasStartedTimerRef.current = true;
  
  // Initial server sync
  syncWithServerTime();
  
  // Set up timer interval (every second)
  const timerInterval = setInterval(() => {
    setSpotlightTimeLeft(spotlightTimeLeftRef.current > 0 ? spotlightTimeLeftRef.current - 1 : 0);
  }, 1000);
  
  timerIntervalRef.current = timerInterval;
  
  // Set up server sync interval (every minute)
  const syncInterval = setInterval(() => {
    syncWithServerTime();
    markUserActivity();
  }, SERVER_SYNC_INTERVAL);
  
  syncIntervalRef.current = syncInterval;
  
  // Return cleanup function
  return () => {
    resetTimers();
  };
}, [sessionId, user]);

// Reset all timers (helper function)
const resetTimers = () => {
  if (timerIntervalRef.current) {
    debugLog('Timer', 'Clearing timer interval');
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  }
  
  if (syncIntervalRef.current) {
    debugLog('Timer', 'Clearing sync interval');
    clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = null;
  }
  
  if (serverSyncTimerRef.current) {
    debugLog('Timer', 'Clearing server sync timer');
    clearInterval(serverSyncTimerRef.current);
    serverSyncTimerRef.current = null;
  }
  
  if (turnCheckIntervalRef.current) {
    debugLog('Timer', 'Clearing turn check interval');
    clearInterval(turnCheckIntervalRef.current);
    turnCheckIntervalRef.current = null;
  }
};

// Clean up subscriptions and intervals on unmount
useEffect(() => {
  return () => {
    debugLog('Cleanup', 'Unmounting LineUpProvider, cleaning up resources');
    
    // Clear all intervals
    resetTimers();
    
    // Unsubscribe from all listeners
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current();
    }
    
    if (rotationListenerRef.current) {
      rotationListenerRef.current();
    }
    
    if (statsListenerRef.current) {
      statsListenerRef.current();
    }
  };
}, []);

// Toggle category selection
const toggleCategory = (id: string) => {
  debugLog('Category', `Toggling category: ${id}`);
  setCategories(categories.map(category => {
    if (category.id === id) {
      return { ...category, selected: !category.selected };
    }
    return { ...category, selected: false }; // Ensure only one category can be selected
  }));
};

// Force refresh spotlight status
const forceRefreshSpotlightStatus = async () => {
  if (!sessionIdRef.current || !user) return;
  
  debugLog('Refresh', 'Force refreshing spotlight status');
  setLoading(true);
  
  try {
    await checkCurrentContestantStatus();
    await refreshSpotlights();
    await syncWithServerTime();
  } catch (error) {
    debugLog('Refresh', 'Error in force refresh', error);
  } finally {
    setLoading(false);
  }
};

// Set step with safeguards
const safeSetStep = (newStep: LineUpStep) => {
  debugLog('Navigation', `Changing step from '${step}' to '${newStep}'`);
  
  // If transitioning to private screen, ensure timer is started
  if (newStep === 'private' && !timerIntervalRef.current) {
    debugLog('Timer', 'Auto-starting timer for private screen');
    startSpotlightTimer();
  }
  
  // Update step state
  setStep(newStep);
};

// Start lineup process
const startLineUp = async () => {
  if (!user) {
    setError('User not logged in');
    return;
  }
  
  debugLog('Lineup', 'Starting lineup process');
  setLoading(true);
  
  try {
    // Get selected category
    const selectedCategory = categories.find(cat => cat.selected);
    if (!selectedCategory) {
      setError('Please select a category');
      setLoading(false);
      return;
    }
    
    debugLog('Lineup', `Selected category: ${selectedCategory.name} (${selectedCategory.id})`);
    
    // Join or create session
    const session = await LineupService.joinLineupSession(user.uid, selectedCategory.id);
    setSessionId(session.id);
    
    // Enhanced logging for session state
    debugLog('Lineup', 'Session joined successfully', {
      sessionId: session.id,
      isFirstGenderContestant: session.isFirstGenderContestant,
      userGender: userGenderRef.current,
      currentMaleContestantId: session.currentMaleContestantId,
      currentFemaleContestantId: session.currentFemaleContestantId
    });
    
    // If user is the first of their gender, they become the current contestant
    if (session.isFirstGenderContestant) {
      debugLog('Lineup', 'User is first contestant of their gender, moving to private screen');
      setIsCurrentUser(true);
      startSpotlightTimer();
      safeSetStep('private');
    } else {
      // Check if user is the current contestant
      const userGender = userGenderRef.current;
      const genderField = `current${userGender?.charAt(0).toUpperCase()}${userGender?.slice(1)}ContestantId`;
      
      if (session[genderField] === user.uid) {
        debugLog('Lineup', 'User is current contestant, moving to private screen');
        setIsCurrentUser(true);
        startSpotlightTimer();
        safeSetStep('private');
      } else {
        // Regular contestant, go to lineup screen
        debugLog('Lineup', 'User is not current contestant, moving to lineup screen');
        await refreshSpotlights();
        safeSetStep('lineup');
      }
    }
  } catch (error) {
    debugLog('Lineup', 'Error starting lineup', error);
    setError('Failed to join lineup. Please try again.');
  } finally {
    setLoading(false);
  }
};

// Setup message subscriptions and stats listeners when session changes
useEffect(() => {
  if (!sessionIdRef.current || !user) return;
  
  debugLog('Subscription', 'Setting up message and stats subscriptions');
  
  // Clean up previous subscriptions
  if (messageSubscriptionRef.current) {
    messageSubscriptionRef.current();
  }
  
  if (statsListenerRef.current) {
    statsListenerRef.current();
  }
  
  // Subscribe to messages with gender filtering
  const unsubscribeMessages = LineupService.subscribeToGenderFilteredMessages(
    sessionIdRef.current!, // Force non-null
    user!.uid,            // Force non-null
    currentSpotlight?.id || null,
    (newMessages) => {
      setMessages(newMessages);
    }
  );
  
  messageSubscriptionRef.current = unsubscribeMessages;
  
  // Listen for stats updates if user is current contestant
  if (isCurrentUserRef.current) {
    const statsRef = doc(firestore, 'lineupSessions', sessionIdRef.current, 'spotlightStats', user.uid);
    
    const unsubscribeStats = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SpotlightStats;
        debugLog('Stats', 'Stats update received', data);
        
        setLikeCount(data.likeCount || 0);
        setPopCount(data.popCount || 0);
        setViewCount(data.viewCount || 0);
        
        // Check for elimination threshold
        if (data.popCount >= 20 && !eliminated) {
          debugLog('Elimination', 'User reached elimination threshold (20+ pops)');
          setEliminated(true);
          safeSetStep('eliminated');
          
          // Record elimination
          LineupService.eliminateUser(sessionIdRef.current || '', user.uid).catch((error) => {
            debugLog('Elimination', 'Error recording elimination', error);
          });
        }
      }
    }, (error) => {
      debugLog('Stats', 'Error in stats listener', error);
    });
    
    statsListenerRef.current = unsubscribeStats;
  }
  
  // Listen for rotation events
  const rotationRef = doc(firestore, 'lineupSessions', sessionIdRef.current, 'rotationEvents', 'latest');
  
  const unsubscribeRotation = onSnapshot(rotationRef, async (snapshot) => {
    if (!snapshot.exists()) return;
    
    const eventData = snapshot.data() as RotationEvent;
    debugLog('Rotation', 'Rotation event detected', eventData);
    
    // If current user is involved in the rotation
    if (eventData.previousContestantId === user.uid) {
      debugLog('Rotation', 'Current user was rotated out, checking matches');
      
      // Clear timer flags for clean state
      timerZeroReachedRef.current = false;
      
      // Auto-check for matches
      await checkUserMatches();
    } 
    // If user is now the current contestant
    else if (eventData.newContestantId === user.uid) {
      debugLog('Rotation', 'Current user is now the current contestant');
      
      // Update state and move to private screen
      setIsCurrentUser(true);
      startSpotlightTimer();
      safeSetStep('private');
    }
    // If just a general rotation, refresh spotlights
    else if (currentSpotlight && (
      eventData.previousContestantId === currentSpotlight.id || 
      eventData.newContestantId !== currentSpotlight.id
    )) {
      debugLog('Rotation', 'Current spotlight changed, refreshing spotlights');
      await refreshSpotlights();
    }
  });
  
  rotationListenerRef.current = unsubscribeRotation;
  
  // Return cleanup function
  return () => {
    debugLog('Subscription', 'Cleaning up subscriptions');
    unsubscribeMessages();
    
    if (statsListenerRef.current) {
      statsListenerRef.current();
    }
    
    unsubscribeRotation();
  };
}, [sessionId, user, currentSpotlight, isCurrentUser]);

// Handle like/pop action
const handleAction = async (action: 'like' | 'pop', contestantId: string) => {
  if (!user || !contestantId || !sessionIdRef.current) return;
  
  // Check using ref directly (persists between renders)
  if (interactedContestantsRef.current.has(contestantId)) {
    setError(`You've already interacted with this profile`);
    setTimeout(() => setError(null), 3000);
    return;
  }
  
  // Add to ref immediately
  interactedContestantsRef.current.add(contestantId);
  
  try {
    setLoading(true);
    await LineupService.recordAction(sessionIdRef.current, user.uid, contestantId, action);
    
    if (action === 'like') {
      const isMatch = await LineupService.checkForMatch(user.uid, contestantId);
      
      if (isMatch) {
        // Get the match details with all required properties
        const matchDetails: MatchData = {
          userId: contestantId,
          displayName: currentSpotlight?.displayName || "User",
          photoURL: currentSpotlight?.photoURL || "",
          matchPercentage: currentSpotlight?.matchPercentage || 85,
          timestamp: serverTimestamp()
        };
        
        // Save match details
        setSelectedMatches([matchDetails]);
        
        // Go to congratulations screen
        safeSetStep('confirmation');
        setLoading(false);
        return;
      }
    }

    // ALWAYS move to next contestant after action processed
    if (upcomingSpotlights.length > 0) {
      setCurrentSpotlight(upcomingSpotlights[0]);
      setUpcomingSpotlights(prev => prev.slice(1));
    } else {
      if (action === 'pop') {
        const popCount = await LineupService.getUserPopCount(sessionIdRef.current, contestantId);
        if (popCount >= 20) {
          await LineupService.eliminateUser(sessionIdRef.current, contestantId);
        }
      }
      await refreshSpotlights();
    }
  } catch (error) {
    setError('Failed to process your action');
    // Don't remove from interactedContestants - action still considered used
  } finally {
    setLoading(false);
  }
};

// Check for matches when user's turn ends
const checkUserMatches = async () => {
  if (!sessionId || !user || loading) return;
  
  try {
    setLoading(true);
    
    // Get user matches
    const matchesList = await LineupService.getUserMatches(sessionId, user.uid);
    
    if (matchesList.length > 0) {
      // User has matches, go to matches screen
      setSelectedMatches(matchesList);
      setStep('matches');
    } else {
      // No matches, clear previous contestant status
      setIsCurrentUser(false);
      timerZeroReachedRef.current = false;
      hasStartedTimerRef.current = false;
      
      // Move to no-matches screen
      setStep('no-matches');
    }
  } catch (error) {
    // On error, just reset and go to lineup screen
    setIsCurrentUser(false);
    setStep('lineup');
  } finally {
    setLoading(false);
  }
};

// Refresh spotlights with better gender filtering
const refreshSpotlights = async (): Promise<Contestant[]> => {
  if (!sessionId || !user) return [];
  
  try {
    if (isRefreshingRef.current) return [];
    
    isRefreshingRef.current = true;
    
    // Get gender-filtered spotlights
    const spotlights = await getGenderFilteredSpotlights();
    
    // Extract current spotlight
    if (!userGenderRef.current) {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        userGenderRef.current = userDoc.data().gender || '';
      }
    }
    
    const userGender = userGenderRef.current;
    if (!userGender) {
      isRefreshingRef.current = false;
      return [];
    }
    
    const oppositeGender = userGender === 'male' ? 'female' : 'male';
    const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
    
    if (!sessionDoc.exists()) {
      isRefreshingRef.current = false;
      return [];
    }
    
    const sessionData = sessionDoc.data();
    const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase()}${oppositeGender.slice(1)}ContestantId`;
    const currentSpotlightId = sessionData[oppositeGenderField];
    
    // Find current spotlight in list
    let currentSpot = spotlights.find(s => s.id === currentSpotlightId);
    
    // Set current spotlight if found
    if (currentSpot) {
      setCurrentSpotlight(currentSpot);
      
      // Upcoming spotlights should exclude current spotlight
      const upcomingList = spotlights.filter(s => s.id !== currentSpotlightId);
      setUpcomingSpotlights(upcomingList);
    } else {
      setCurrentSpotlight(null);
      setUpcomingSpotlights(spotlights);
    }
    
    isRefreshingRef.current = false;
    return spotlights;
  } catch (error) {
    isRefreshingRef.current = false;
    return [];
  }
};

// Send chat message
const sendMessage = async (text: string) => {
  if (!user || !sessionIdRef.current) {
    debugLog('Chat', 'Cannot send message - missing user or session');
    return;
  }
  
  debugLog('Chat', 'Sending message');
  
  try {
    // Create temporary message ID for optimistic UI update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Optimistically add message to state
    const tempMessage: ChatMessage = {
      id: tempId,
      senderId: user.uid,
      senderName: user.displayName || 'You',
      senderPhoto: user.photoURL || '',
      senderGender: userGenderRef.current || '',
      text,
      timestamp: new Date(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Send message to server
    await LineupService.sendMessage(sessionIdRef.current, {
      senderId: user.uid,
      senderName: user.displayName || 'You',
      senderPhoto: user.photoURL || '',
      senderGender: userGenderRef.current || '',
      text,
      timestamp: serverTimestamp()
    } as Omit<ChatMessage, 'id'>);
    
    // Update message status to sent (optional since we'll get the real message from subscription)
  } catch (error) {
    debugLog('Chat', 'Error sending message', error);
    // Add error handling logic if needed
  }
};

// Select a match from the matches screen
const selectMatch = (match: MatchData) => {
  debugLog('Matches', `Selected match: ${match.displayName} (${match.userId})`);
  setSelectedMatches([match]);
  safeSetStep('confirmation');
};

// Confirm match selection and create/find chat
const confirmMatch = async (match: MatchData): Promise<string | null> => {
  if (!user || !match) {
    debugLog('Matches', 'Cannot confirm match - missing user or match');
    return null;
  }
  
  debugLog('Matches', `Confirming match with ${match.displayName} (${match.userId})`);
  
  try {
    setLoading(true);
    
    // Check for existing chat
    const existingChatId = await LineupService.checkExistingChat(user.uid, match.userId);
    
    if (existingChatId) {
      debugLog('Matches', `Found existing chat: ${existingChatId}`);
      return existingChatId;
    } else {
      // Create new chat
      debugLog('Matches', 'Creating new chat room');
      const newChatId = await LineupService.createChat(user.uid, match.userId, 'lineup');
      debugLog('Matches', `Created new chat: ${newChatId}`);
      return newChatId;
    }
  } catch (error) {
    debugLog('Matches', 'Error confirming match', error);
    setError('Failed to confirm match. Please try again.');
    return null;
  } finally {
    setLoading(false);
  }
};

// Go back to previous screen
const goBack = () => {
  debugLog('Navigation', `Going back from ${step}`);
  
  switch (step) {
    case 'lineup':
      safeSetStep('selection');
      // Clean up session data if leaving
      if (sessionIdRef.current) {
        debugLog('Cleanup', 'Leaving lineup, cleaning up session data');
        resetTimers();
        messageSubscriptionRef.current?.();
        rotationListenerRef.current?.();
        statsListenerRef.current?.();
      }
      break;
    case 'matches':
      safeSetStep('lineup');
      break;
    case 'confirmation':
      safeSetStep('matches');
      break;
    case 'eliminated':
      safeSetStep('selection');
      break;
    case 'no-matches':
      safeSetStep('selection');
      break;
    default:
      safeSetStep('selection');
  }
};

// Get match percentage data between users
const getMatchPercentageData = async (spotlightId: string): Promise<number> => {
  if (!user) return 50; // Default
  
  // Check cache first
  const cacheKey = [user.uid, spotlightId].sort().join('_');
  if (matchPercentageCacheRef.current.has(cacheKey)) {
    return matchPercentageCacheRef.current.get(cacheKey) || 50;
  }
  
  try {
    // Calculate match percentage
    const result = await calculateMatchPercentage(user.uid, spotlightId);
    
    // Cache the result
    matchPercentageCacheRef.current.set(cacheKey, result);
    
    return result;
  } catch (error) {
    debugLog('Match', 'Error getting match percentage', error);
    return 50; // Default on error
  }
};

// Check if user is eligible to join lineup
const checkEligibility = async (): Promise<boolean> => {
  if (!user) return false;
  
  debugLog('Eligibility', `Checking eligibility for user ${user.uid}`);
  
  try {
    const isEligible = await checkUserEligibility(user.uid);
    
    if (!isEligible) {
      debugLog('Eligibility', 'User not eligible - getting elimination data');
      
      // Get elimination data to set countdown
      const eliminationDoc = await getDoc(doc(firestore, 'userEliminations', user.uid));
      
      if (eliminationDoc.exists()) {
        const data = eliminationDoc.data();
        const eligibleAt = data.eligibleAt.toDate();
        const now = new Date();
        const timeLeftMs = Math.max(0, eligibleAt.getTime() - now.getTime());
        const remainingSeconds = Math.ceil(timeLeftMs / 1000);
        
        debugLog('Eligibility', `User can join again in ${formatTime(remainingSeconds)}`);
        setEliminationTimeLeft(remainingSeconds);
        
        // Setup countdown timer
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        
        const newTimerInterval = setInterval(() => {
          setEliminationTimeLeft(prev => {
            if (prev <= 1) {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        timerIntervalRef.current = newTimerInterval;
      }
      
      setEliminated(true);
      safeSetStep('eliminated');
    }
    
    return isEligible;
  } catch (error) {
    debugLog('Eligibility', 'Error checking eligibility', error);
    return false;
  }
};

// Provide context value
const contextValue: LineUpContextType = {
  step,
  categories,
  upcomingSpotlights,
  currentSpotlight,
  selectedMatches,
  messages,
  isCurrentUser,
  eliminated,
  loading,
  error,
  sessionId,
  timeLeft,
  spotlightTimeLeft,
  eliminationTimeLeft,
  popCount,
  likeCount,
  setCurrentSpotlight,
  
  setStep: safeSetStep,
  toggleCategory,
  startLineUp,
  handleAction,
  sendMessage,
  selectMatch,
  confirmMatch,
  goBack,
  checkEligibility,
  refreshSpotlights,
  setMessages,
  setSelectedMatches,
  setIsCurrentUser,
  setLikeCount,
  setPopCount,
  startSpotlightTimer,
  setSessionId,
  setSpotlightTimeLeft,
  checkUserMatches,
  
  resetTimers,
  forceRefreshSpotlightStatus,
  syncWithServerTime,
  markUserActivity,
  getMatchPercentageData
};

return (
  <LineUpContext.Provider value={contextValue}>
    {children}
  </LineUpContext.Provider>
);
};

// Custom hook to use the LineUp context
export const useLineUp = () => {
const context = useContext(LineUpContext);

if (!context) {
  throw new Error('useLineUp must be used within a LineUpProvider');
}

return context;
};