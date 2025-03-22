// components/live-love/LineUpScreens/LineUpContext.tsx - FIXED VERSION

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  Contestant, 
  LineUpStep, 
  LineUpCategory, 
  ChatMessage, 
  MatchData 
} from './types';
import { useAuthContext } from '../../auth/AuthProvider';
import * as LineupService from '../../../services/lineupService';
import * as NotificationService from '../../../services/notificationService';
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
  onSnapshot,
  setDoc,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { calculateMatchPercentage } from '../../../utils/matchCalculation';
import { getOrderedSpotlightsByGender } from '../../../services/lineupService';

// TESTING CONFIGURATION - CHANGE BEFORE PRODUCTION
const SPOTLIGHT_TIMER_SECONDS = 4 * 60 * 60; // 10 minutes for testing (should be 4 * 60 * 60)
const ELIMINATION_TIMER_SECONDS = 48 * 60 * 60; // 1 hour for testing (should be 48 * 60 * 60)

interface LineUpContextType {
  // State
  step: LineUpStep;
  categories: LineUpCategory[];
  upcomingSpotlights: Contestant[];  // Changed from upcomingContestants
  currentSpotlight: Contestant | null;  // Changed from currentContestant
  setSpotlightTimeLeft: (time: number) => void;  // Changed from setContestantTimeLeft
  checkUserMatches: () => Promise<void>;
  selectedMatches: MatchData[];
  messages: ChatMessage[];
  isCurrentUser: boolean;
  eliminated: boolean;
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  timeLeft: number; 
  spotlightTimeLeft: number;  // Changed from contestantTimeLeft
  eliminationTimeLeft: number;
  popCount: number;
  likeCount: number;
  
  // Methods
  setStep: (step: LineUpStep) => void;
  toggleCategory: (id: string) => void;
  startLineUp: () => Promise<void>;
  handleAction: (action: 'like' | 'pop', spotlightId: string) => Promise<void>;  // Changed from contestantId
  sendMessage: (text: string) => Promise<void>;
  selectMatch: (match: MatchData) => void;
  confirmMatch: (match: MatchData) => Promise<string | null>;
  goBack: () => void;
  checkEligibility: () => Promise<boolean>;
  refreshSpotlights: () => Promise<Contestant[]>;  // Changed from refreshContestants
  setMessages: (messages: ChatMessage[]) => void;
  setSelectedMatches: (matches: MatchData[]) => void;
  setIsCurrentUser: (isCurrentUser: boolean) => void;
  setLikeCount: (count: number) => void;
  setPopCount: (count: number) => void;
  startSpotlightTimer: () => void;  // Changed from startContestantTimer
  setSessionId: (id: string | null) => void;
}

const LineUpContext = createContext<LineUpContextType | undefined>(undefined);

export const LineUpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log(`[${new Date().toISOString()}] [LineUpProvider] 🚀 Initializing LineUpProvider`);
  
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
  const [spotlightTimeLeft, setSpotlightTimeLeft] = useState<number>(SPOTLIGHT_TIMER_SECONDS);
  const [eliminationTimeLeft, setEliminationTimeLeft] = useState<number>(ELIMINATION_TIMER_SECONDS);
  const [popCount, setPopCount] = useState<number>(0);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [transitioning, setTransitioning] = useState(false);
  const [interactedContestants, setInteractedContestants] = useState<Set<string>>(new Set());
  
  // Refs for stable references between renders
  const turnCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerZeroReachedRef = useRef<boolean>(false);
  const isRefreshingRef = useRef(false);
  const isCurrentUserRef = useRef(isCurrentUser);
  const sessionIdRef = useRef(sessionId);
  const userGenderRef = useRef<string | null>(null);

  // Set session ID with ref update
  const setSessionId = (id: string | null) => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Setting sessionId to ${id}`);
    _setSessionId(id);
    sessionIdRef.current = id;
  };

  // Cache user gender early to avoid repeated lookups
  useEffect(() => {
    const cacheUserGender = async () => {
      if (user) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const gender = userDoc.data().gender || null;
          userGenderRef.current = gender;
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 👤 Cached user gender: ${gender}`);
        }
      }
    };
    
    cacheUserGender();
  }, [user]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!initialized) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🚀 Initializing LineUpProvider`);
      setInitialized(true);
      
      // Make this provider available globally for notifications
      if (typeof window !== 'undefined' && window.lineupContextRef) {
        window.lineupContextRef.current = {
          setIsCurrentUser,
          setSessionId,
          startSpotlightTimer,
          setStep
        };
      }
    }
  }, [initialized]);

  // Set isCurrentUser with logging
  const setIsCurrentUser = (value: boolean) => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Setting isCurrentUser to ${value}`);
    _setIsCurrentUser(value);
    isCurrentUserRef.current = value;
  };

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Cleaning up on unmount`);
      if (turnCheckIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Clearing turnCheckInterval`);
        clearInterval(turnCheckIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Clearing timerInterval`);
        clearInterval(timerIntervalRef.current);
      }
      if (syncIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Clearing syncInterval`);
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Toggle category selection
  const toggleCategory = (id: string) => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 👆 Toggling category: ${id}`);
    setCategories(categories.map(category => {
      if (category.id === id) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ${category.id === id ? '✅' : '❌'} Setting ${category.name} to ${!category.selected}`);
        return { ...category, selected: !category.selected };
      }
      return { ...category, selected: false }; // Ensure only one category can be selected
    }));
  };

  const safeSetStep = (newStep: LineUpStep) => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Transitioning from step '${step}' to '${newStep}'`);
    
    // Clean up any existing timers when switching steps
    if (newStep !== step) {
      if (turnCheckIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Clearing existing turn check interval`);
        clearInterval(turnCheckIntervalRef.current);
      }
      turnCheckIntervalRef.current = null;
      
      // If going to private screen, ensure timer is started
      if (newStep === 'private' && !timerIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⏱️ Starting contestant timer for private screen`);
        startSpotlightTimer();
      }
    }
    
    setStep(newStep);
    console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Step set to: ${newStep}`);
  };

  // Add this useEffect for better session restoration
  useEffect(() => {
    const restoreUserSession = async () => {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Restoring session for user ${user?.uid || 'unknown'}`);
      
      try {
        setLoading(true);
        
        // Check if user is in any active session
        const sessionsRef = collection(firestore, 'lineupSessions');
        const q = query(
          sessionsRef,
          where('contestants', 'array-contains', user?.uid || ''),
          where('status', '==', 'active')
        );
        
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Querying for existing sessions...`);
        const snapshot = await getDocs(q);
        console.log(`[RESTORE] Checking for user ${user?.uid} active sessions`);
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Found ${snapshot.size} active sessions`);
        
        if (snapshot.empty) {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 No active session found`);
          setLoading(false);
          return;
        }
        
        // Get the first active session
        const sessionDoc = snapshot.docs[0];
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Restoring session: ${sessionDoc.id}`);
        setSessionId(sessionDoc.id);
        
        // Check if user is current contestant
        const sessionData = sessionDoc.data();
        
        // Get user gender if not already cached
        if (!userGenderRef.current) {
          const userDoc = await getDoc(doc(firestore, 'users', user?.uid || ''));
          if (userDoc.exists()) {
            userGenderRef.current = userDoc.data().gender || null;
          }
        }
        
        const userGender = userGenderRef.current;
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 👤 User gender: ${userGender}`);
        
        // Check gender-specific field
        const genderField = userGender === 'male' ? 'currentMaleSpotlightId' : 'currentFemaleSpotlightId';
        const isCurrentContestant = 
          sessionData.currentContestantId === user?.uid || 
          sessionData[genderField] === user?.uid;

          console.log(`[RESTORE] User contestant check:`, {
            userId: user?.uid,  // Added optional chaining
            userGender,
            isCurrentContestant,
            currentFieldValue: sessionData.currentContestantId,
            genderFieldValue: sessionData[genderField],
            decision: isCurrentContestant ? 'PRIVATE SCREEN' : 'LINEUP SCREEN'
          });
        
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Current contestant check: ${isCurrentContestant ? 'YES' : 'NO'}`);
        
        if (isCurrentContestant) {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ User is current contestant - going to private screen`);
          setIsCurrentUser(true);
          isCurrentUserRef.current = true;
          startSpotlightTimer();
          setStep('private');
        } else {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ User is NOT current contestant - going to lineup screen`);
          await refreshSpotlights();
          setStep('lineup');
        }
        
        setLoading(false);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error restoring session:`, error);
        setLoading(false);
      }
    };
    
    if (user) {
      restoreUserSession();
    }
  }, [user]);


  // Start contestant timer (4 hours)
  const startSpotlightTimer = useCallback(() => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] ⏱️ Starting contestant timer`);
    
    // Reset timer zero flag
    timerZeroReachedRef.current = false;
    
    // Clear any existing timers
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    // Initial sync with server time
    const syncWithServer = async () => {
      if (!sessionId || !user) return;
      
      try {
        // Get user gender from cache or fetch
        const userGender = userGenderRef.current;
        if (!userGender) {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            userGenderRef.current = userDoc.data().gender || null;
          }
        }
        
        const gender = userGenderRef.current || '';
        const rotationTimeField = `${gender}LastRotationTime`;
        
        // Get session data
        const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
        if (!sessionDoc.exists()) return;
        
        // Get rotation time for this gender
        const lastRotationTime = sessionDoc.data()[rotationTimeField]?.toDate();
        if (!lastRotationTime) return;
        
        // Calculate remaining time precisely
        const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
        const remainingSeconds = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
        
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⏱️ Timer sync: ${remainingSeconds}s remaining`);
        
        // Update timer state
        setSpotlightTimeLeft(remainingSeconds);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error syncing timer:`, error);
      }
    };
    
    // Sync immediately
    syncWithServer();
    
    // Set up countdown timer
    const timerInterval = setInterval(() => {
      setSpotlightTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    timerIntervalRef.current = timerInterval;
    
    // Re-sync with server every minute to prevent drift
    const syncInterval = setInterval(() => {
      syncWithServer();
    }, 60000);
    
    syncIntervalRef.current = syncInterval;
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [sessionId, user]);

  // Optimized timer expiration handler with better error recovery
  useEffect(() => {
    if (spotlightTimeLeft <= 0 && isCurrentUser && !timerZeroReachedRef.current) {
      timerZeroReachedRef.current = true;
      
      const handleRotation = async () => {
        if (!sessionId || !user) return;
        
        try {
          setTransitioning(true);
          
          // Track session completion
          await setDoc(doc(firestore, 'users', user.uid, 'completedLineups', sessionId), {
            completedAt: serverTimestamp(),
            category: categories.find(cat => cat.selected)?.id || 'unknown'
          });
          
          // Get user gender from cache or fetch if needed
          let userGender = userGenderRef.current;
          if (!userGender) {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists()) {
              userGender = userDoc.data().gender || null;
              userGenderRef.current = userGender;
            }
          }
          
          if (!userGender) {
            setTransitioning(false);
            return;
          }
          
          // FIX: Use transaction to ensure atomic operations
          await runTransaction(firestore, async (transaction) => {
            // Get latest session data
            const sessionRef = doc(firestore, 'lineupSessions', sessionId);
            const sessionSnapshot = await transaction.get(sessionRef);
            
            if (!sessionSnapshot.exists()) {
              throw new Error('Session not found during rotation');
            }
            
            const sessionData = sessionSnapshot.data();
            
            // Check if this user is still the current contestant
            const userGenderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
            if (sessionData[userGenderField] !== user.uid) {
              console.log(`[${new Date().toISOString()}] [LineUpProvider] ⚠️ User is no longer the current contestant, skipping rotation`);
              return;
            }
            
            // Get list of next contestants
            const joinTimesRef = collection(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes');
            const joinTimesQuery = query(
              joinTimesRef,
              where('gender', '==', userGender),
              where('completed', '==', false),
              orderBy('joinedAt', 'asc')
            );
            
            const joinTimesSnapshot = await getDocs(joinTimesQuery);
            const contestantIds = joinTimesSnapshot.docs.map(doc => doc.id);
            
            // Find current user index
            const currentIndex = contestantIds.indexOf(user.uid);
            
            // Find next contestant (if any)
            let nextContestantId: string | null = null;
            if (currentIndex !== -1 && currentIndex < contestantIds.length - 1) {
              nextContestantId = contestantIds[currentIndex + 1];
            } else if (contestantIds.length > 1) {
              // Wrap around to first contestant (excluding current)
              const foundId = contestantIds.find(id => id !== user.uid);
              nextContestantId = foundId || null;
            }
            
            // Update fields with null (clearing current contestant)
            const rotationTimeField = `${userGender}LastRotationTime`;
            const updates: Record<string, any> = {
              [userGenderField]: nextContestantId,
              [rotationTimeField]: serverTimestamp()
            };
            
            // Update general fields if needed
            if (nextContestantId !== null) {
              updates.currentContestantId = nextContestantId;
              updates.lastRotationTime = serverTimestamp();
            }
            
            // Mark current user as completed
            const userJoinTimeRef = doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', user.uid);
            transaction.update(userJoinTimeRef, {
              completed: true,
              completedAt: serverTimestamp()
            });
            
            // Update session
            transaction.update(sessionRef, updates);
            
            // Add notification for next contestant if there is one
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
            
            // Add rotation event
            const rotationEventRef = doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest');
            transaction.set(rotationEventRef, {
              timestamp: serverTimestamp(),
              rotationId: Date.now().toString(),
              previousContestantId: user.uid,
              newContestantId: nextContestantId,
              gender: userGender
            });
          });
          
          // Wait for rotation to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Check for matches
          await checkUserMatches();
          
          // Reset flag after processing
          timerZeroReachedRef.current = false;
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error during rotation:`, error);
          // Fallback rotation attempt
          if (sessionId && user) {
            LineupService.requestForcedRotation(sessionId, user.uid)
              .catch(() => {}); // Suppress errors
          }
        } finally {
          setTimeout(() => setTransitioning(false), 1000);
        }
      };
      
      setTimeout(handleRotation, 1000);
    }
  }, [spotlightTimeLeft, isCurrentUser, sessionId, user]);
  
  // Helper function to remove user from lineup session after their turn is complete
  const removeUserFromLineupSession = async (sessionId: string, userId: string) => {
    try {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Removing user ${userId} from lineup session ${sessionId}`);
      
      // Get current session data
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
      if (!sessionDoc.exists()) return;
      
      const sessionData = sessionDoc.data();
      const contestants = sessionData.contestants || [];
      
      // Filter out this user
      const updatedContestants = contestants.filter(id => id !== userId);
      
      // Update the session document
      await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
        contestants: updatedContestants
      });
      
      // Also remove from the join times collection
      try {
        const joinTimeRef = doc(firestore, 'lineupSessions', sessionId, 'contestantJoinTimes', userId);
        await updateDoc(joinTimeRef, {
          completed: true,
          completedAt: serverTimestamp()
        });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error updating join time record:`, error);
      }
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ User successfully removed from lineup session`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error removing user from lineup:`, error);
    }
  };
  
  // Add this useEffect after the existing timer-related effects
  useEffect(() => {
    const calculateRemainingTime = async () => {
      if (!sessionIdRef.current || !user) return;
      
      try {
        // Use cached gender if available
        let userGender = userGenderRef.current;
        if (!userGender) {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            userGender = userDoc.data().gender || '';
            userGenderRef.current = userGender;
          }
        }
        
        if (!userGender) return;
        
        const rotationTimeField = `${userGender}LastRotationTime`;
        
        const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionIdRef.current));
        if (!sessionDoc.exists()) return;
        
        const lastRotationTime = sessionDoc.data()[rotationTimeField]?.toDate();
        if (!lastRotationTime) return;
        
        const elapsedSeconds = Math.floor((Date.now() - lastRotationTime.getTime()) / 1000);
        const remainingTime = Math.max(0, SPOTLIGHT_TIMER_SECONDS - elapsedSeconds);
        
        setSpotlightTimeLeft(remainingTime);
      } catch (error) {
        console.error('Error calculating remaining time:', error);
      }
    };
    
    calculateRemainingTime();
    
    // Force refresh timer every minute to prevent drift
    const refreshInterval = setInterval(calculateRemainingTime, 60000);
    return () => clearInterval(refreshInterval);
  }, [sessionId, user]);
  
  // Add rotation notification listener
  useEffect(() => {
    if (!sessionId) return;
    
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Setting up rotation event listener`);
    
    // Listen for rotation events
    const rotationRef = doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest');
    
    const unsubscribe = onSnapshot(rotationRef, (snapshot) => {
      if (snapshot.exists()) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Rotation event detected, refreshing contestants`);
        
        // Force refresh contestants immediately
        refreshSpotlights();
      }
    });
    
    return () => {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Cleaning up rotation event listener`);
      unsubscribe();
    };
  }, [sessionId]);
  
  // Check user matches to determine if user should see matches screen
  const checkUserMatches = async () => {
    // CRITICAL FIX: Add a state lock here too
    if (!sessionId || !user || loading || transitioning) {
      return;
    }
    
    try {
      setTransitioning(true);
      setLoading(true);
      
      // Get user matches
      const matchesList = await LineupService.getUserMatches(sessionId, user.uid);
      
      if (matchesList.length > 0) {
        setSelectedMatches(matchesList);
        setStep('matches');
      } else {
        // CRITICAL FIX: Clear intervals before changing state
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        setIsCurrentUser(false);
        isCurrentUserRef.current = false;
        setStep('no-matches');
      }
    } catch (error) {
      console.error('Error checking matches:', error);
    } finally {
      setLoading(false);
      // Release transition lock after delay
      setTimeout(() => {
        setTransitioning(false);
      }, 500);
    }
  };

  // Refresh contestants with better error handling and gender filtering
  const refreshSpotlights = async (): Promise<Contestant[]> => {
    if (!sessionIdRef.current || !user) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] ❌ Cannot refresh contestants: missing sessionId=${sessionIdRef.current} or user=${user?.uid}`);
      return [];
    }
      
    try {
      if (isRefreshingRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⚠️ Already refreshing, skipping additional call`);
        return [];
      }
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Starting contestant refresh`);
      isRefreshingRef.current = true;
      
      // Get user gender from cache or fetch
      let userGender = userGenderRef.current;
      if (!userGender) {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          userGender = userDoc.data().gender || '';
          userGenderRef.current = userGender;
        }
      }
      
      if (!userGender) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⚠️ User gender not found`);
        isRefreshingRef.current = false;
        return [];
      }
      
      const oppositeGender = userGender === 'male' ? 'female' : 'male';
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 📡 Getting contestants from service (${userGender} looking for ${oppositeGender})...`);
      
      // Get session data to determine current contestant
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionIdRef.current));
      if (!sessionDoc.exists()) {
        isRefreshingRef.current = false;
        return [];
      }
      
      const sessionData = sessionDoc.data();
      const oppositeGenderField = `current${oppositeGender.charAt(0).toUpperCase()}${oppositeGender.slice(1)}ContestantId`;
      const currentContestantId = sessionData[oppositeGenderField];
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 👤 Current ${oppositeGender} contestant ID from session: ${currentContestantId || 'null'}`);
      
      // FIX #5: If no current contestant for opposite gender, try to auto-select one
      if (!currentContestantId) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 No current ${oppositeGender} contestant, attempting to select one`);
        
        // Get list of available opposite gender contestants
        const orderedContestants = await getOrderedSpotlightsByGender(sessionIdRef.current, oppositeGender);
        
        if (orderedContestants.length > 0) {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Found ${orderedContestants.length} ${oppositeGender} contestants, selecting first as current`);
          
          // Auto-select the first contestant
          const newContestantId = orderedContestants[0];
          const rotationTimeField = `${oppositeGender}LastRotationTime`;
          
          await updateDoc(doc(firestore, 'lineupSessions', sessionIdRef.current), {
            [oppositeGenderField]: newContestantId,
            [rotationTimeField]: serverTimestamp()
          });
          
          // Also update rotation event
          await setDoc(doc(firestore, 'lineupSessions', sessionIdRef.current, 'rotationEvents', 'latest'), {
            timestamp: serverTimestamp(),
            rotationId: Date.now().toString(),
            previousContestantId: null,
            newContestantId: newContestantId,
            gender: oppositeGender
          });
          
          // Get the contestant details for the new selection
          const userDoc = await getDoc(doc(firestore, 'users', newContestantId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            const newContestant: Contestant = {
              id: newContestantId,
              displayName: userData.displayName || 'User',
              photoURL: userData.photoURL || '',
              ageRange: userData.ageRange || '',
              gender: userData.gender || '',
              bio: userData.bio || '',
              interests: userData.interests || [],
              location: userData.location || '',
              matchPercentage: await calculateMatchPercentage(user.uid, newContestantId)
            };
            
            // Set current contestant and return directly
            setCurrentSpotlight(newContestant);
            console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Auto-selected new contestant: ${newContestant.displayName}`);
            
            isRefreshingRef.current = false;
            return [newContestant];
          }
        }
      }
      
      // Normal flow - get contestants from service with proper gender filtering
      const contestants = await LineupService.getSpotlights(sessionIdRef.current, user.uid);
      
      // Find current contestant in the list
      let currentContestant = contestants.find(c => c.id === currentContestantId);
      
      // If current contestant not in list but ID exists, fetch directly
      if (!currentContestant && currentContestantId) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Current contestant not in filtered list, fetching directly`);
        const currentUserDoc = await getDoc(doc(firestore, 'users', currentContestantId));
        
        if (currentUserDoc.exists()) {
          const data = currentUserDoc.data();
          
          // Only create if gender matches what we expect
          if (data.gender === oppositeGender) {
            currentContestant = {
              id: currentContestantId,
              displayName: data.displayName || 'User',
              photoURL: data.photoURL || '',
              ageRange: data.ageRange || '',
              gender: data.gender || '',
              bio: data.bio || '',
              interests: data.interests || [],
              location: data.location || '',
              matchPercentage: 0
            };
            
            // Calculate match percentage
            const matchPercentage = await calculateMatchPercentage(user.uid, currentContestantId);
            currentContestant.matchPercentage = matchPercentage;
            
            console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Current contestant fetched directly: ${currentContestant.displayName}`);
          }
        }
      }
      
      // Set current contestant if found
      if (currentContestant) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Setting current contestant: ${currentContestant.displayName}`);
        setCurrentSpotlight(currentContestant);
      } else {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⚠️ No current contestant found for gender: ${oppositeGender}`);
        setCurrentSpotlight(null);
      }
      
      // Filter upcoming contestants - make sure to exclude completed users
      const upcomingContestants = contestants.filter(c => {
        return c.id !== currentContestantId;
      });
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Upcoming contestants after filtering: ${upcomingContestants.length}`);
      setUpcomingSpotlights(upcomingContestants);
      
      // Extra check - if we're the current contestant, ensure timer is running
      if (isCurrentUserRef.current && !timerIntervalRef.current) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⏱️ Starting contestant timer during refresh`);
        startSpotlightTimer();
      }
      
      isRefreshingRef.current = false;
      return contestants;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error refreshing contestants:`, error);
      isRefreshingRef.current = false;
      return [];
    }
  };

  // Handle like/pop action
  const handleAction = async (action: 'like' | 'pop', contestantId: string) => {
    if (!user || !contestantId || !sessionIdRef.current) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] ❌ Cannot handle action - missing data`);
      return;
    }
    
    // Check if already interacted with this contestant
    if (interactedContestants.has(contestantId)) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🚫 Already interacted with contestant ${contestantId}`);
      setError('You have already interacted with this contestant');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 👆 User ${user.uid} ${action === 'like' ? 'liked' : 'popped'} contestant ${contestantId}`);
    
    try {
      setLoading(true);
      
      // Add to interacted set immediately
      setInteractedContestants(prev => new Set(prev).add(contestantId));
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 📡 Recording ${action} action in service`);
      await LineupService.recordAction(sessionIdRef.current, user.uid, contestantId, action);
      
      if (action === 'like') {
        // Check if match is immediate (mutual)
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Checking for immediate match`);
        const isMatch = await LineupService.checkForMatch(user.uid, contestantId);
        
        if (isMatch) {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 💘 Mutual match found! Showing matches immediately`);
          // Show matches immediately if mutual
          const matchesList = await LineupService.getUserMatches(sessionIdRef.current, user.uid);
          setSelectedMatches(matchesList);
          setStep('matches');
          return;
        } else {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 👍 Like recorded but not mutual yet`);
        }
      }
      
      // Move to next contestant if available
      if (upcomingSpotlights.length > 0) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ➡️ Moving to next contestant from list`);
        setCurrentSpotlight(upcomingSpotlights[0]);
        setUpcomingSpotlights(prev => prev.slice(1));
      } else {
        // Only check for elimination for pop action
        if (action === 'pop') {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Checking pop count`);
          const popCount = await LineupService.getUserPopCount(sessionIdRef.current, user.uid);
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔢 User has ${popCount} pops`);
          
          if (popCount >= 20) {
            console.log(`[${new Date().toISOString()}] [LineUpProvider] ❌ User eliminated due to too many pops`);
            setEliminated(true);
            setStep('eliminated');
            await LineupService.eliminateUser(sessionIdRef.current, user.uid);
            return;
          }
        }
        
        // If no more contestants, refresh to see if new ones joined
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 No more upcoming contestants, refreshing`);
        await refreshSpotlights();
      }
      
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error handling action:`, err);
      setError('Failed to process your action. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Listen for chat messages and mark user active
  useEffect(() => {
    if (!sessionIdRef.current) return;
    
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Setting up message subscription for session ${sessionIdRef.current}`);
    
    // Determine if user is current contestant
    const isCurrentContestant = isCurrentUserRef.current;
    
    // Use the gender-filtered message subscription
    const unsubscribe = LineupService.subscribeToGenderFilteredMessages(
      sessionIdRef.current, 
      user?.uid || '', 
      currentSpotlight?.id || null,
      (newMessages) => {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 💬 Received ${newMessages.length} filtered messages from subscription`);
        setMessages(newMessages);
        // Mark user active when new messages arrive
        if (newMessages.length > 0 && user) {
          console.log(`[${new Date().toISOString()}] [LineUpProvider] 👋 Marking user as active due to messages`);
          LineupService.markUserActive(sessionIdRef.current || '', user.uid).catch(error => {
            console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error marking user active:`, error);
          });
        }
      }
    );
    
    return () => {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🧹 Cleaning up message subscription`);
      unsubscribe();
    };
  }, [sessionId, user, isCurrentUser, currentSpotlight]);

  // Send chat message
  const sendMessage = async (text: string) => {
    if (!user || !sessionId) return;
    
    try {
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
      const sessionData = sessionDoc.data();
      
      if (sessionData?.clearPreviousMessages) {
        // Clear previous messages
        const prevMessagesRef = collection(firestore, 'lineupSessions', sessionId, 'messages');
        const snapshot = await getDocs(prevMessagesRef);
        
        // Batch delete to improve performance
        const batch = writeBatch(firestore);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Reset the clear flag
        await updateDoc(doc(firestore, 'lineupSessions', sessionId), {
          clearPreviousMessages: false
        });
      }
      
      // Send new message
      await addDoc(collection(firestore, 'lineupSessions', sessionId, 'messages'), {
        senderId: user.uid,
        senderName: user.displayName || 'User',
        senderPhoto: user.photoURL || '',
        text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Message send error:', error);
    }
  };
  
  // Start lineup process
  const startLineUp = async () => {
    if (!user) {
      console.error('No user available for lineup');
      return;
    }
  
    const selectedCategory = categories.find(cat => cat.selected);
    if (!selectedCategory) return;
  
    // Cached gender retrieval
    const userGender = userGenderRef.current || 
      (await (async () => {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        return userDoc.data()?.gender;
      })());
  
    const session = await LineupService.joinLineupSession(user.uid, selectedCategory.id);
    const genderField = `current${userGender.charAt(0).toUpperCase() + userGender.slice(1)}SpotlightId`;
  
    console.log('Session Join Debug', {
      isFirstGenderContestant: session.isFirstGenderContestant,
      currentSpotlightId: session.currentSpotlightId,
      genderSpotlightId: session[genderField]
    });
  
    if (session.isFirstGenderContestant || session.currentSpotlightId === user.uid) {
      setIsCurrentUser(true);
      startSpotlightTimer();
      setStep('private');
      return;
    }
  
    setStep('lineup');
    await refreshSpotlights();
  };

  // Select a match from the matches screen
  const selectMatch = (match: MatchData) => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 👆 User selected match: ${match.displayName}`);
    setSelectedMatches([match]);
    setStep('confirmation');
  };

  // Confirm match selection and create/find chat
  const confirmMatch = async (match: MatchData): Promise<string | null> => {
    if (!user || !match) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] ❌ Cannot confirm match - missing user or match`);
      return null;
    }
    
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 💘 Confirming match with ${match.displayName}`);
    
    try {
      setLoading(true);
      
      // Check if chat already exists
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Checking for existing chat`);
      const existingChatId = await LineupService.checkExistingChat(user.uid, match.userId);
      
      if (existingChatId) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Found existing chat: ${existingChatId}`);
        // Return existing chat id
        return existingChatId;
      } else {
        // Create new chat
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Creating new chat`);
        const newChatId = await LineupService.createChat(user.uid, match.userId, 'lineup');
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Created new chat: ${newChatId}`);
        return newChatId;
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error confirming match:`, err);
      setError('Failed to confirm match. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous screen
  const goBack = () => {
    // Logic to go back based on current step
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 👆 User requested to go back from ${step}`);
    
    switch (step) {
      case 'lineup':
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Going back to selection from lineup`);
        setStep('selection');
        break;
      case 'matches':
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Going back to lineup from matches`);
        setStep('lineup');
        break;
      case 'confirmation':
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Going back to matches from confirmation`);
        setStep('matches');
        break;
      case 'eliminated':
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Going back to selection from eliminated`);
        setStep('selection');
        break;
      default:
        // For other cases, just go to selection
        console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔀 Going back to selection from ${step}`);
        setStep('selection');
    }
  };

  // Check if user is eligible to join lineup
  const checkEligibility = async (): Promise<boolean> => {
    if (!user) return false;
    
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Checking eligibility for user ${user.uid}`);
    try {
      const isEligible = await LineupService.checkUserEligibility(user.uid);
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Eligibility result: ${isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`);
      
      if (!isEligible) {
        // Get elimination data to set countdown
        const eliminationDoc = await getDoc(doc(firestore, 'userEliminations', user.uid));
        if (eliminationDoc.exists()) {
          const eliminationData = eliminationDoc.data();
          const eligibleAt = eliminationData.eligibleAt.toDate();
          const now = new Date();
          const timeLeftMs = Math.max(0, eligibleAt.getTime() - now.getTime());
          setEliminationTimeLeft(Math.ceil(timeLeftMs / 1000));
          
          console.log(`[${new Date().toISOString()}] [LineUpProvider] ⏱️ User can join again in ${Math.ceil(timeLeftMs / 1000)} seconds`);
          
          // Start countdown timer
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          const newTimerInterval = setInterval(() => {
            setEliminationTimeLeft(prev => {
              if (prev <= 1) {
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          timerIntervalRef.current = newTimerInterval;
        }
        
        setEliminated(true);
        setStep('eliminated');
      }
      
      return isEligible;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error checking eligibility:`, error);
      return false;
    }
  };

  // Helper to retry loading contestants
  const loadContestantsWithRetry = async (sessionId: string, userId: string): Promise<Contestant[]> => {
    console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Loading contestants with retry for session ${sessionId}`);
    let attempts = 0;
    const maxAttempts = 3;
    let contestants: Contestant[] = [];
    
    while (attempts < maxAttempts && (contestants.length === 0)) {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔄 Attempt ${attempts+1} to load contestants`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      contestants = await refreshSpotlights();
      
      if (contestants.length === 0) {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ⚠️ No contestants found, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
      } else {
        console.log(`[${new Date().toISOString()}] [LineUpProvider] ✅ Loaded ${contestants.length} contestants`);
      }
    }
    
    return contestants;
  };

  // Add this function to verify current contestant status
  const verifyCurrentContestantStatus = async (sessionId: string, userId: string, userGender: string): Promise<boolean> => {
    try {
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Verifying contestant status for ${userId} (${userGender})`);
      
      const sessionDoc = await getDoc(doc(firestore, 'lineupSessions', sessionId));
      if (!sessionDoc.exists()) return false;
      
      const sessionData = sessionDoc.data();
      const genderField = `current${userGender.charAt(0).toUpperCase()}${userGender.slice(1)}ContestantId`;
      
      const isCurrentContestant = sessionData[genderField] === userId;
      
      console.log(`[${new Date().toISOString()}] [LineUpProvider] 🔍 Verification result: ${isCurrentContestant}`);
      return isCurrentContestant;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [LineUpProvider] ❌ Error verifying contestant status:`, error);
      return false;
    }
  };

  // Listen for user turn changes 
  useEffect(() => {
    if (!sessionId || !user) return;
    
    const unsubscribe = LineupService.subscribeToUserTurn(sessionId, user.uid, async (isUserTurn) => {
      if (transitioning) return;
      
      if (isUserTurn && !isCurrentUserRef.current) {
        setTransitioning(true);
        
        // Critical verification step - double check with server
        const userGender = userGenderRef.current;
        if (!userGender) {
          setTransitioning(false);
          return;
        }
        
        const isReallyCurrentContestant = await verifyCurrentContestantStatus(sessionId, user.uid, userGender);
        
        if (!isReallyCurrentContestant) {
          console.log(`User is not actually the current ${userGender} contestant - verification failed`);
          setTransitioning(false);
          return;
        }
        
        setIsCurrentUser(true);
        isCurrentUserRef.current = true;
        startSpotlightTimer();
        
        setTimeout(() => {
          setStep('private');
          setTransitioning(false);
        }, 300);
      } 
    });
    
    return () => unsubscribe();
  }, [sessionId, user]);  // Remove step from here

  const contextValue: LineUpContextType = {
    step,
    categories,
    upcomingSpotlights, // changed from upcomingContestants
    currentSpotlight,   // changed from currentContestant
    selectedMatches,
    messages,
    isCurrentUser,
    eliminated,
    loading,
    error,
    sessionId,
    timeLeft,
    spotlightTimeLeft,  // changed from contestantTimeLeft
    eliminationTimeLeft,
    popCount,
    likeCount,
    setStep,
    checkUserMatches,
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
    setSpotlightTimeLeft, 
    setLikeCount,
    setPopCount,
    startSpotlightTimer,
    setSessionId
  };

  return (
    <LineUpContext.Provider value={contextValue}>
      {children}
    </LineUpContext.Provider>
  );
};

export const useLineUp = () => {
  const context = useContext(LineUpContext);
  if (context === undefined) {
    throw new Error('useLineUp must be used within a LineUpProvider');
  }
  return context;
};