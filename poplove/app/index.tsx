// app/(auth)/index.tsx
import { Redirect } from 'expo-router';
import { useAuthContext } from '../components/auth/AuthProvider';

export default function Index() {
  const { user, loading, hasCompletedOnboarding } = useAuthContext();

  if (loading) {
    return null; // Or a loading screen
  }

  // No user, go to auth
  if (!user) {
    return <Redirect href="/(auth)/" />;
  }

  // User exists but hasn't completed onboarding
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/profile-setup" />;
  }

  // Fully onboarded user
  return <Redirect href="/(tabs)/" />;
}