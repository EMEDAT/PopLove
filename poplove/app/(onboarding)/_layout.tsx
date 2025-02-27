// app/(onboarding)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="profile-setup" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}