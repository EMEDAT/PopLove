// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider } from '../components/auth/AuthProvider';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { initAuthChangeHandler } from '../utils/authChangeHandler';
import '../lib/firebase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) console.error('Font loading error:', error);
  }, [error]);

  useEffect(() => {
    initAuthChangeHandler();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(onboarding)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="subscription" />
            </Stack>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </SubscriptionProvider>
        </AuthProvider>
    </SafeAreaProvider>
  );
}