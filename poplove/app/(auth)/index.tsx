// poplove\app\(auth)\index.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function AuthIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to PopLove</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.loginButton]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.resetText}>Troubleshoot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333'
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  loginButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 40,
    padding: 10,
  },
  resetText: {
    color: '#888',
    textAlign: 'center',
  }
});