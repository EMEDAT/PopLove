// app/(onboarding)/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthContext } from '../../components/auth/AuthProvider';

export default function OnboardingIndex() {
  const { user, loading, hasCompletedOnboarding } = useAuthContext();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Redirect href="/(onboarding)/splash" />;
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/onboarding-flow" />;
  }

  return <Redirect href="/(tabs)/" />;
}