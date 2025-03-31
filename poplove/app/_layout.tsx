// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider } from '../components/auth/AuthProvider';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { initAuthChangeHandler } from '../utils/authChangeHandler';
// Import Firebase to ensure it's initialized
import '../lib/firebase';

// Error Fallback Component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10, color: 'red' }}>
        Something went wrong
      </Text>
      <Text>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Log any font loading errors
  useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
    }
  }, [error]);

  // Initialize auth change handler to sync profile updates
  useEffect(() => {
    initAuthChangeHandler();
  }, []);

  // Show a simple loading state while fonts are loading
  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="subscription" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}