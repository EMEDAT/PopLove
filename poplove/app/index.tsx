import React from 'react';
import { useAuthContext } from '../components/auth/AuthProvider';
import { Redirect } from '../utils/routerHelpers';

export default function Index() {
  const { user, loading } = useAuthContext();

  // If still loading, return null to prevent premature navigation
  if (loading) {
    return null;
  }

  // If no user, redirect to splash
  if (!user) {
    return <Redirect href="/(onboarding)/splash" />;
  }

  // If user exists, redirect to main app
  return <Redirect href="/(tabs)" />;
}