// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Create auth context
const AuthContext = createContext<any>(null);

// Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Handle user state changes
  function onAuthStateChanged(authUser: FirebaseAuthTypes.User | null) {
    setUser(authUser);
    
    if (authUser) {
      // Check if user has completed onboarding
      firestore()
        .collection('users')
        .doc(authUser.uid)
        .get()
        .then(documentSnapshot => {
          if (documentSnapshot.exists) {
            const userData = documentSnapshot.data();
            setHasCompletedOnboarding(userData?.hasCompletedOnboarding || false);
          }
        })
        .catch(err => console.error("Error fetching user data:", err));
    }
    
    setLoading(false);
  }

  useEffect(() => {
    // Subscribe to auth state changes
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await auth().signInWithEmailAndPassword(email, password);
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
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      // Create user document in Firestore
      if (userCredential.user) {
        await firestore().collection('users').doc(userCredential.user.uid).set({
          email: userCredential.user.email,
          createdAt: firestore.FieldValue.serverTimestamp(),
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
      await auth().signOut();
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
        await firestore().collection('users').doc(user.uid).update({
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
        await firestore().collection('users').doc(user.uid).update({
          hasCompletedOnboarding: value,
          updatedAt: firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        setHasCompletedOnboarding(value);
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
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
    setHasCompletedOnboarding: updateOnboardingStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export const useAuthContext = () => {
  return useContext(AuthContext);
};

// For backward compatibility
export const useAuth = useAuthContext;