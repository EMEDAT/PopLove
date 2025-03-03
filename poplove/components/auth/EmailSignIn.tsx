// components/auth/EmailSignIn.tsx

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuthContext } from './AuthProvider';
import { router } from 'expo-router';

interface EmailSignInProps {
  mode: 'signup' | 'login';
}

export function EmailSignIn({ mode }: EmailSignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, error } = useAuthContext();

  const handleSubmit = async () => {
    // Validate inputs
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password strength check (optional, but recommended)
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      console.log(`Attempting ${mode} with email: ${email}`);
      setLoading(true);

      if (mode === 'signup') {
        await signUp(email, password);
        console.log('Sign up successful');
        // Don't navigate here - let AuthProvider handle it
      } else {
        await signIn(email, password);
        console.log('Sign in successful');
        // Don't navigate here - let AuthProvider handle it
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      
      // More descriptive error handling
      let errorMessage = 'An unexpected error occurred';
      if (err.code) {
        switch (err.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'Email is already registered';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No user found with this email';
            break;
        }
      }

      Alert.alert('Authentication Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === 'signup' ? 'Sign Up with Email' : 'Sign In with Email'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  input: {
    width: '100%',
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});