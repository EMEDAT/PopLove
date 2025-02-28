// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  error: string | null;
  hasCompletedOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<FirebaseAuthTypes.User | null>;
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
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(false);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((authUser) => {
      setUser(authUser);
      
      if (authUser) {
        firestore()
          .collection('users')
          .doc(authUser.uid)
          .get()
          .then(documentSnapshot => {
            if (documentSnapshot.exists) {
              const userData = documentSnapshot.data();
              setHasCompletedOnboardingState(userData?.hasCompletedOnboarding || false);
            }
          })
          .catch(error => {
            console.error('Error fetching user data:', error);
          });
      }
      
      setLoading(false);
    });

    return subscriber;
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      
      if (userCredential.user) {
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            email: userCredential.user.email,
            createdAt: firestore.FieldValue.serverTimestamp(),
            hasCompletedOnboarding: false
          });
      }
      
      setError(null);
      return userCredential.user;
    } catch (err: any) {
      console.error('Signup Error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await auth().signInWithEmailAndPassword(email, password);
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
      await auth().signOut();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetAuth = async () => {
    try {
      if (user) {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .update({ hasCompletedOnboarding: false });
        await auth().signOut();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateOnboardingStatus = async (value: boolean) => {
    if (user) {
      try {
        await firestore()
          .collection('users')
          .doc(user.uid)
          .update({
            hasCompletedOnboarding: value,
            updatedAt: firestore.FieldValue.serverTimestamp()
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