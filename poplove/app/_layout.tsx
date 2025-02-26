// app/_layout.tsx
import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from 'react-error-boundary';
import { View, Text } from 'react-native';

// Local imports
import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider } from '../components/auth/AuthProvider';

// Gesture handling
import 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

// Error Fallback Component
function ErrorFallbackComponent({ error }) {
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
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Log any font loading errors
  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
  }, [fontError]);

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Show nothing while fonts are loading
  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary 
      FallbackComponent={ErrorFallbackComponent}
      onError={(error, errorInfo) => {
        // Optional: Log errors to an error reporting service
        console.error('Uncaught error:', error, errorInfo);
      }}
    >
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="index" />
          </Stack>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}