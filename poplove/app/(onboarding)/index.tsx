// app/(onboarding)/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../../hooks/useAuth'; // Updated import

export default function OnboardingIndex() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  // If no user, go to splash
  if (!user) {
    return <Redirect href="/(onboarding)/splash" />;
  }

  // If user exists but hasn't completed onboarding
  return <Redirect href="/(onboarding)/profile-setup" />;
}