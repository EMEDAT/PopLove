// components/auth/AuthProvider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

// Change the import to use useAuth since that's what your code expects
export const useAuthContext = () => {
  // Dummy implementation until Firebase is properly integrated
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Simple auth methods until Firebase is properly integrated
  const signIn = async (email: string, password: string) => {
    console.log('Signing in with:', email);
    // This is a placeholder until Firebase is properly integrated
  };

  const signUp = async (email: string, password: string) => {
    console.log('Signing up with:', email);
    // This is a placeholder until Firebase is properly integrated
    return null;
  };

  const signOut = async () => {
    console.log('Signing out');
    // This is a placeholder until Firebase is properly integrated
  };

  const updateOnboardingStatus = async (value: boolean) => {
    setHasCompletedOnboarding(value);
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    hasCompletedOnboarding,
    setHasCompletedOnboarding: updateOnboardingStatus,
    resetAuth: () => {}
  };
};

// AuthProvider component (placeholder)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// For backward compatibility
export const useAuth = useAuthContext;