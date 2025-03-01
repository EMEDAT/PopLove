// app/(onboarding)/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthContext } from '../../components/auth/AuthProvider';

export default function OnboardingIndex() {
  const { user, loading, hasCompletedOnboarding } = useAuthContext();

  if (loading) {
    return null; // Show loading indicator or splash screen
  }

  // If not authenticated, go to splash screen
  if (!user) {
    return <Redirect href="/(onboarding)/splash" />;
  }

  // If authenticated but hasn't completed onboarding
  if (!hasCompletedOnboarding) {
    // Redirect to the onboarding flow instead of profile-setup
    return <Redirect href="/(onboarding)/onboarding-flow" />;
  }

  // If fully authenticated and onboarded
  return <Redirect href="/(tabs)/" />;
}