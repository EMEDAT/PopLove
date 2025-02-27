// services/auth.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { auth, firestore, serverTimestamp } from '../lib/firebase';

class AuthService {
  // Sign in with email and password
  async signInWithEmail(email: string, password: string) {
    try {
      const response = await auth.signInWithEmailAndPassword(email, password);
      console.log('Sign in successful:', response.user.uid);
      return response;
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      
      // More detailed error handling
      if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('No user found with this email');
      }
      
      throw error;
    }
  }

  // Sign up with email and password
  async signUpWithEmail(email: string, password: string) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      
      if (userCredential.user) {
        try {
          // More defensive Firestore document creation
          const uid = userCredential.user.uid;
          
          // Create a user document
          await firestore.collection('users').doc(uid).set({
            email: email,
            createdAt: serverTimestamp(),
            hasCompletedOnboarding: false,
            status: 'active'
          }, { merge: true });
        } catch (firestoreError: any) {
          console.error('Firestore Document Creation Error:', {
            errorCode: firestoreError.code,
            errorMessage: firestoreError.message,
            errorStack: firestoreError.stack
          });
        }
      }
  
      return userCredential.user;
    } catch (error: any) {
      console.error('Sign Up Error:', error);
      throw error;
    }
  }

  // Sign out method
  async signOut() {
    try {
      await auth.signOut();
      console.log('Sign out successful');
      
      // Optional: Clear any local storage or async storage
      await AsyncStorage.removeItem('onboardingCompleted');
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Reset authorization state completely
  async resetAuth() {
    try {
      // Clear onboarding status from AsyncStorage
      await AsyncStorage.removeItem('onboardingCompleted');
      
      // Clear any other auth-related items in AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('auth') || 
        key.includes('user') || 
        key.includes('firebase') ||
        key.includes('onboarding')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
      
      // Try to delete the current user if it exists
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          await currentUser.delete();
        }
      } catch (e) {
        console.log("Could not delete user", e);
      }
      
      // Sign out from Firebase
      await this.signOut();
      
      console.log('Auth reset successful');
      
      // Navigate to auth
      router.replace('/(auth)/');
    } catch (error) {
      console.error('Error resetting auth:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();