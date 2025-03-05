// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, firestore, serverTimestamp } from '../../lib/firebase';
import { authService } from '../../services/auth';
import { router } from 'expo-router';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  hasCompletedOnboarding: boolean;
  onboardingStartTime: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
  startOnboarding: () => void;
  saveOnboardingProgress: (progress: any) => Promise<void>;
  registerListener: (unsubscribe: Function) => void;
};

const ONBOARDING_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

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
  registerListener: () => {}
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

  // Handle user authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
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
// In the navigation effect
useEffect(() => {
  if (loading) return;
  
  const performNavigation = async () => {
    // Always start with splash screen first time
    if (!initialNavPerformed.current) {
      router.replace('/(onboarding)/splash');
      initialNavPerformed.current = true;
      return;
    }
    
    // If no user, go directly to auth
    if (!user) {
      router.replace('/(auth)');
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
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('Signup Error:', error);
      setError(error?.message || 'Signup failed');
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await authService.signInWithEmail(email, password);
      setError(null);
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
      // Clear all listeners first
      activeListeners.forEach(unsubscribe => unsubscribe());
      setActiveListeners([]);
      
      // Wait a small delay to ensure listeners are properly closed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then sign out
      await authService.signOut();
      
      // Reset remaining state
      setHasCompletedOnboardingState(false);
      setOnboardingStartTime(null);
      setOnboardingProgress(null);
    } catch (err: any) { // Add type annotation here
      setError(err.message);
    }
  };

  const resetAuth = async () => {
    try {
      await authService.resetAuth();
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
    registerListener
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