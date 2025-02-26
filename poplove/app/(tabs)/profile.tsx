// poplove\app\(tabs)\profile.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, signOut, resetAuth } = useAuthContext();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: () => signOut()
        }
      ]
    );
  };

  const handleResetAuth = () => {
    Alert.alert(
      "Reset Authentication",
      "This will completely reset your authentication state and clear onboarding progress. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          onPress: () => resetAuth(),
          style: "destructive"
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'Not available'}</Text>
        
        <Text style={styles.label}>User ID:</Text>
        <Text style={styles.value}>{user?.uid || 'Not available'}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleSignOut} style={styles.buttonWrapper}>
          <LinearGradient
            colors={['#FF6B6B', '#FFA07A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Sign Out</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={handleResetAuth} style={[styles.buttonWrapper, styles.resetButtonWrapper]}>
          <View style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset Authentication</Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 20,
    marginTop: 20,
  },
  buttonWrapper: {
    marginVertical: 10,
    borderRadius: 25,
    overflow: 'hidden',
  },
  button: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonWrapper: {
    marginTop: 20,
  },
  resetButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});