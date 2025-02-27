// app/(onboarding)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: 'Onboarding' }} />
      <Stack.Screen name="splash" options={{ title: 'Splash' }} />
      <Stack.Screen name="profile-setup" options={{ title: 'Profile Setup' }} />
      <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
    </Stack>
  );
}