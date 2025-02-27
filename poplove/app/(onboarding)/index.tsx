// app/(onboarding)/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../../components/auth/AuthProvider';

export default function OnboardingIndex() {
  const { user, loading, hasCompletedOnboarding } = useAuth();

  if (loading) {
    return null; // Show nothing while loading
  }

  // If not authenticated, go to splash screen
  if (!user) {
    return <Redirect href="/(onboarding)/splash" />;
  }

  // If authenticated but hasn't completed onboarding
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/profile-setup" />;
  }

  // If fully authenticated and onboarded
  return <Redirect href="/(tabs)/" />;
}