// app/(onboarding)/index.tsx
import { Redirect } from 'expo-router';
import { useAuthContext } from '../../components/auth/AuthProvider';

export default function OnboardingIndex() {
  const { user, loading } = useAuthContext();

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