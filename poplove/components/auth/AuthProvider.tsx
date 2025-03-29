// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User, UserCredential } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, firestore, serverTimestamp } from '../../lib/firebase';
import { authService } from '../../services/auth';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { updateAuthProfile } from '../../utils/profileAuthSync';
import MatchSyncService from '../../services/matchSyncService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExtendedUser extends User {
  gender?: string;
}

type AuthContextType = {
  user: ExtendedUser | null;
  loading: boolean;
  error: string | null;
  hasCompletedOnboarding: boolean;
  onboardingStartTime: number | null;
  signIn: (email: string, password: string) => Promise<UserCredential | void>; // Changed return type
  signUp: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
  startOnboarding: () => void;
  saveOnboardingProgress: (progress: any) => Promise<void>;
  registerListener: (unsubscribe: Function) => void;
  updateUserProfile: (profileData: { displayName?: string; photoURL?: string }) => Promise<void>;
};

const ONBOARDING_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const AUTH_STORAGE_KEY = 'auth_user_data';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  hasCompletedOnboarding: false,
  onboardingStartTime: null,
  signIn: async () => {},
  signUp: async () => null,
  signOut: async () => {},
  resetAuth: async () => {},
  setHasCompletedOnboarding: async () => {},
  startOnboarding: () => {},
  saveOnboardingProgress: async () => {},
  registerListener: () => {},
  updateUserProfile: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);
  const [onboardingStartTime, setOnboardingStartTime] = useState<number | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<any>(null);
  const [activeListeners, setActiveListeners] = useState<Function[]>([]);
  
  // Use refs to prevent navigation loops
  const initialNavPerformed = useRef(false);
  const userNavFired = useRef(false);
  const authCheckComplete = useRef(false);

  // Add this function to track user online status
  const trackUserStatus = () => {
    if (!user) return;

    // Update user status when app is active
    const updateOnlineStatus = () => {
      if (!user) return;
      
      try {
        const userStatusRef = doc(firestore, 'userStatus', user.uid);
        setDoc(userStatusRef, {
          isOnline: true,
          lastActive: serverTimestamp()
        }, { merge: true }).catch(error => {
          console.warn('Status update failed - check Firestore rules:', error);
        });
      } catch (error) {
        console.warn('Error updating online status:', error);
      }
    };

    // Mark user as offline when app is closed/backgrounded
    const updateOfflineStatus = () => {
      const userStatusRef = doc(firestore, 'userStatus', user.uid);
      setDoc(userStatusRef, {
        isOnline: false,
        lastActive: serverTimestamp()
      }, { merge: true }).catch(error => {
        console.error('Error updating offline status:', error);
      });
    };

    // Set up app state listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        updateOnlineStatus();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        updateOfflineStatus();
      }
    });

    // Initial status update
    updateOnlineStatus();

    // Set up cleanup for when component unmounts
    return () => {
      subscription.remove();
      updateOfflineStatus();
    };
  };

  // Persist auth data to AsyncStorage
  const persistAuthData = async (userData: User | null) => {
    if (userData) {
      try {
        // Store minimal auth data
        const authData = {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          lastLoginTime: Date.now()
        };
        
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
        console.log('Auth data persisted to storage');
      } catch (error) {
        console.error('Error persisting auth data:', error);
      }
    } else {
      try {
        // Clear stored auth data on logout
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        console.log('Auth data removed from storage');
      } catch (error) {
        console.error('Error removing auth data:', error);
      }
    }
  };

  // Try to restore auth from AsyncStorage
  const tryRestoreAuth = async () => {
    try {
      const storedAuthData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      
      if (storedAuthData && !user) {
        const authData = JSON.parse(storedAuthData);
        console.log('Found stored auth data, checking validity');
        
        // Check if stored auth is recent enough (30 days)
        const lastLoginTime = authData.lastLoginTime || 0;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const isRecent = Date.now() - lastLoginTime < thirtyDaysMs;
        
        if (isRecent && !auth.currentUser) {
          console.log('Attempting to restore auth session for:', authData.email);
          // We can't directly restore the session, but we can trigger auto-signin
          // by attempting to re-authenticate with stored tokens
          
          // Note: This is a placeholder - actual implementation depends on your auth flow
          // You may need to redirect to the login screen with a message
          console.log('Auth session may need manual re-authentication');
        }
      }
      
      authCheckComplete.current = true;
    } catch (error) {
      console.error('Error restoring auth:', error);
      authCheckComplete.current = true;
    }
  };

  // Add this to your useEffect in AuthProvider
  useEffect(() => {
    if (user) {
      const unsubscribeStatus = trackUserStatus();
      // Persist auth data when user changes
      persistAuthData(user);
      
      return () => {
        if (unsubscribeStatus) unsubscribeStatus();
      };
    }
  }, [user]);

  // Initial auth restoration attempt
  useEffect(() => {
    tryRestoreAuth();
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Persist auth data whenever we get a valid user
        persistAuthData(authUser);
        
        try {
          const userDoc = await getDoc(doc(firestore, 'users', authUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setHasCompletedOnboardingState(userData?.hasCompletedOnboarding || false);
            
            // Load onboarding progress
            if (!userData.hasCompletedOnboarding) {
              if (userData.onboardingProgress) {
                setOnboardingProgress(userData.onboardingProgress);
              }
              
              if (userData.onboardingStartTime) {
                setOnboardingStartTime(userData.onboardingStartTime);
              } else {
                // Only save to Firestore, don't trigger another state update
                const startTime = Date.now();
                updateDoc(doc(firestore, 'users', authUser.uid), {
                  onboardingStartTime: startTime
                }).catch(error => {
                  console.error('Error saving onboarding start time:', error);
                });
              }
            }
          } else {
            // If the document doesn't exist yet, create it
            await setDoc(doc(firestore, 'users', authUser.uid), {
              email: authUser.email,
              createdAt: serverTimestamp(),
              hasCompletedOnboarding: false
            });
            setHasCompletedOnboardingState(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setHasCompletedOnboardingState(false);
        }
      } else {
        // Reset state when user is not authenticated
        setHasCompletedOnboardingState(false);
        setOnboardingStartTime(null);
        setOnboardingProgress(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Single navigation effect that runs only once when auth state is determined
  useEffect(() => {
    if (loading || !authCheckComplete.current) return;
    
    const performNavigation = async () => {
      // Always start with splash screen first time
      if (!initialNavPerformed.current) {
        router.replace('/(onboarding)/splash');
        initialNavPerformed.current = true;
        return;
      }
      
      // If no user, go directly to auth
      if (!user) {
        router.replace('/(auth)/signup');
        return;
      }
      
      // CRITICAL CHANGE: ALWAYS redirect to onboarding if not completed
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      // STRICT REDIRECT: If onboarding is not complete, ALWAYS go to onboarding flow
      if (!userData?.hasCompletedOnboarding) {
        router.replace('/(onboarding)/onboarding-flow');
        return;
      }
      
      // Signed-in user with completed onboarding goes to dashboard
      router.replace('/(tabs)');
    };
    
    // Small delay to ensure state stability
    setTimeout(performNavigation, 100);
  }, [loading, user, hasCompletedOnboarding]);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Starting signup process for:', email);
      
      const userCredential = await authService.signUpWithEmail(email, password);
      
      // Manually set start time instead of triggering effect
      if (userCredential) {
        const startTime = Date.now();
        await updateDoc(doc(firestore, 'users', userCredential.uid), {
          onboardingStartTime: startTime
        });
        
        // Persist auth data immediately after signup
        if (userCredential) {
          persistAuthData(userCredential);
        }
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Signup Error:', error);
      setError(error?.message || 'Signup failed');
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<UserCredential | void> => {
    try {
      setLoading(true);
      const userCredential = await authService.signInWithEmail(email, password);
      
      // Persist auth data immediately after signin
      if (userCredential && userCredential.user) {
        persistAuthData(userCredential.user);
      }
      
      setError(null);
      return userCredential;
    } catch (err: any) {
      console.error('Login Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerListener = (unsubscribe: Function) => {
    setActiveListeners(prev => [...prev, unsubscribe]);
  };

  const signOut = async () => {
    try {
      // Capture the user ID before signing out
      const currentUserId = user?.uid;
      
      // First update offline status BEFORE signing out
      if (currentUserId) {
        await setDoc(doc(firestore, 'userStatus', currentUserId), {
          isOnline: false,
          lastActive: serverTimestamp()
        }, { merge: true });
      }
      
      // Clean up listeners
      activeListeners.forEach(unsubscribe => unsubscribe());
      setActiveListeners([]);
      
      // Small delay to ensure update completes
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear stored auth data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      
      // NOW sign out
      await authService.signOut();
      
      // Reset state
      setHasCompletedOnboardingState(false);
      setOnboardingStartTime(null);
      setOnboardingProgress(null);
    } catch (error: unknown) {
      // Type guard to check if error is an object with a message
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'string' 
          ? error 
          : 'Signout failed';
      
      console.error('Signout Error:', errorMessage);
      setError(errorMessage);
      throw error;
    }
  };

  const resetAuth = async () => {
    try {
      await authService.resetAuth();
      // Clear stored auth data
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      // Reset onboarding state
      setHasCompletedOnboardingState(false);
      setOnboardingStartTime(null);
      setOnboardingProgress(null);
      userNavFired.current = false;
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save onboarding progress to Firestore
  const saveOnboardingProgress = async (progress: any) => {
    if (user) {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), {
          onboardingProgress: progress,
          updatedAt: serverTimestamp()
        });
        setOnboardingProgress(progress);
      } catch (error) {
        console.error('Error saving onboarding progress:', error);
      }
    }
  };

  const updateOnboardingStatus = async (value: boolean) => {
    if (user) {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), {
          hasCompletedOnboarding: value,
          updatedAt: serverTimestamp(),
          // Clear onboarding progress if complete
          ...(value ? { onboardingProgress: null, onboardingStartTime: null } : {})
        });
        
        setHasCompletedOnboardingState(value);
        
        // Clear onboarding start time when completed
        if (value) {
          setOnboardingStartTime(null);
          setOnboardingProgress(null);
        }
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
  };
  const startOnboarding = () => {
    if (!user || onboardingStartTime) return;
    
    const startTime = Date.now();
    
    // Only update Firestore, not state
    updateDoc(doc(firestore, 'users', user.uid), {
      onboardingStartTime: startTime
    }).catch(error => {
      console.error('Error saving onboarding start time:', error);
    });
  };

  /**
   * Updates the user's profile and syncs the changes to Auth and matches
   */
  const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    try {
      // 1. Update in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      
      // Only update the fields that were provided
      const updates: any = {
        updatedAt: serverTimestamp()
      };
      
      if (profileData.displayName !== undefined) {
        updates.displayName = profileData.displayName;
      }
      
      if (profileData.photoURL !== undefined) {
        updates.photoURL = profileData.photoURL;
      }
      
      await updateDoc(userRef, updates);
      
      // 2. Update in Auth
      await updateAuthProfile(
        profileData.displayName,
        profileData.photoURL
      );
      
      // 3. Sync to matches
      if (profileData.displayName) {
        await MatchSyncService.updateDisplayName(user.uid, profileData.displayName);
      }
      
      if (profileData.photoURL) {
        await MatchSyncService.updateProfilePhoto(user.uid, profileData.photoURL);
      }
      
      // 4. Ensure match list summary is up-to-date
      await MatchSyncService.ensureMatchListSummary(user.uid);
      
      // 5. Update the stored auth data to reflect profile changes
      await persistAuthData(user);
      
      console.log('Profile updated and synced successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    hasCompletedOnboarding,
    onboardingStartTime,
    signIn,
    signUp,
    signOut,
    resetAuth,
    setHasCompletedOnboarding: updateOnboardingStatus,
    startOnboarding,
    saveOnboardingProgress,
    registerListener,
    updateUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = useAuthContext;