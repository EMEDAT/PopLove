// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { auth, firestore, serverTimestamp } from '../../lib/firebase';
import { authService } from '../../services/auth';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  hasCompletedOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  hasCompletedOnboarding: false,
  signIn: async () => {},
  signUp: async () => null,
  signOut: async () => {},
  resetAuth: async () => {},
  setHasCompletedOnboarding: async () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(firestore, 'users', authUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setHasCompletedOnboardingState(userData?.hasCompletedOnboarding || false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Network Configuration:', {
        EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'Set' : 'Not Set',
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Set' : 'Not Set',
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 'Set' : 'Not Set'
      });
  
      const userCredential = await authService.signUpWithEmail(email, password);
      return userCredential;
    } catch (error: any) {
      console.error('Detailed Signup Error:', {
        fullError: error,
        errorCode: error?.code,
        errorMessage: error?.message
      });
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

  const signOut = async () => {
    try {
      await authService.signOut();
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
    if (user) {
      try {
        await updateDoc(doc(firestore, 'users', user.uid), {
          hasCompletedOnboarding: value,
          updatedAt: serverTimestamp()
        });
        
        setHasCompletedOnboardingState(value);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    hasCompletedOnboarding,
    signIn,
    signUp,
    signOut,
    resetAuth,
    setHasCompletedOnboarding: updateOnboardingStatus
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