// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../lib/firebase';

// Create auth context
type AuthContextType = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  resetAuth: () => Promise<void>;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Handle user state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // Check if user has completed onboarding
        const userDocRef = doc(firestore, 'users', authUser.uid);
        getDoc(userDocRef)
          .then(documentSnapshot => {
            if (documentSnapshot.exists()) {
              const userData = documentSnapshot.data();
              setHasCompletedOnboarding(userData?.hasCompletedOnboarding || false);
            }
          })
          .catch(err => console.error("Error fetching user data:", err));
      }
      
      setLoading(false);
    });

    return unsubscribe; // unsubscribe on unmount
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err.message);
      throw err;
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      if (userCredential.user) {
        const userDocRef = doc(firestore, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          createdAt: serverTimestamp(),
          hasCompletedOnboarding: false
        });
      }
      
      return userCredential.user;
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Reset auth state (for testing)
  const resetAuth = async () => {
    try {
      if (user) {
        // Update Firestore data
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
          hasCompletedOnboarding: false
        });
        
        // Update local state
        setHasCompletedOnboarding(false);
        
        // Sign out
        await signOut();
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Update onboarding status
  const updateOnboardingStatus = async (value: boolean) => {
    if (user) {
      try {
        // Update Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
          hasCompletedOnboarding: value,
          updatedAt: serverTimestamp()
        });
        
        // Update local state
        setHasCompletedOnboarding(value);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetAuth,
    hasCompletedOnboarding,
    setHasCompletedOnboarding: updateOnboardingStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// For backward compatibility
export const useAuth = useAuthContext;