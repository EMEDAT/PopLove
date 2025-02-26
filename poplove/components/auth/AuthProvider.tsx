// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { authService } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const pathname = usePathname();

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('onboardingCompleted');
        setHasCompletedOnboarding(status === 'true');
      } catch (e) {
        console.error('Error checking onboarding status:', e);
      } finally {
        setOnboardingChecked(true);
      }
    };
    
    checkOnboardingStatus();
  }, []);

// Listen for auth state changes
useEffect(() => {
  const subscriber = auth().onAuthStateChanged((authUser) => {
    console.log('Firebase Auth State Changed:', {
      user: authUser ? {
        uid: authUser.uid,
        email: authUser.email,
        emailVerified: authUser.emailVerified
      } : null,
      timestamp: new Date().toISOString()
    });

    if (authUser) {
      setUser(authUser);
      
      // More defensive Firestore update
      firestore()
        .collection('users')
        .doc(authUser.uid)
        .set({
          email: authUser.email || '',
          lastLogin: firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .catch(error => {
          console.error('Error updating user document:', {
            errorCode: error.code,
            errorMessage: error.message,
            errorStack: error.stack
          });
        });
    } else {
      setUser(null);
    }
    
    setAuthChecked(true);
  });

  return () => subscriber();
}, []);


  // Combine loading states
  useEffect(() => {
    if (authChecked && onboardingChecked) {
      setLoading(false);
    }
  }, [authChecked, onboardingChecked]);

  // Routing logic
  useEffect(() => {
    if (loading) return;

    console.log('Redirect Logic:', {
      user: user ? user.uid : 'No User',
      hasCompletedOnboarding,
      pathname,
    });

    if (!user) {
      // No user, navigate to auth
      router.replace('/(auth)/');
      return;
    }

    // User exists, check onboarding
    if (!hasCompletedOnboarding && !pathname.includes('profile-setup')) {
      console.log('Redirecting to profile setup');
      router.replace('/(onboarding)/profile-setup');
    }
  }, [user, hasCompletedOnboarding, loading, pathname]);

  // Authentication methods
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await authService.signInWithEmail(email, password);
    } catch (err: any) {
      console.error('Sign In Error:', err);
      setError(err.message);
      throw err;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      await authService.signUpWithEmail(email, password);
    } catch (err: any) {
      console.error('Sign Up Error:', err);
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
      router.replace('/(auth)/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetAuth = async () => {
    try {
      await authService.resetAuth();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateOnboardingStatus = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', value ? 'true' : 'false');
      setHasCompletedOnboarding(value);
    } catch (e) {
      console.error('Error setting onboarding status:', e);
    }
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetAuth,
    hasCompletedOnboarding,
    setHasCompletedOnboarding: updateOnboardingStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};