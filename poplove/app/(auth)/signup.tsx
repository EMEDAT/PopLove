// app/(auth)/signup.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { auth, firestore, serverTimestamp, GoogleAuthProvider } from '../../lib/firebase';
import firebase from '@react-native-firebase/auth';

// Required for Google Auth
WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { signUp, error: authError } = useAuthContext();
  const [hasAppleAuth, setHasAppleAuth] = useState(false);
  
  // Google Auth setup with correct config
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    // No expoClientId needed
  });

  // Check if Apple Authentication is available
  useEffect(() => {
    const checkAppleAuth = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setHasAppleAuth(isAvailable);
    };
    
    checkAppleAuth();
  }, []);

  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true);
      
      const { id_token } = response.params;
      
      // Create a credential from Google Auth response
      const credential = firebase.GoogleAuthProvider.credential(id_token);
      
      auth.signInWithCredential(credential)
        .then(async (result) => {
          // Check if this is a new user
          const isNewUser = result.additionalUserInfo?.isNewUser;
          
          if (isNewUser && result.user) {
            // Create user document for new users
            await firestore.collection('users').doc(result.user.uid).set({
              email: result.user.email,
              displayName: result.user.displayName,
              photoURL: result.user.photoURL,
              createdAt: serverTimestamp(),
              hasCompletedOnboarding: false,
              provider: 'google',
              status: 'active'
            }, { merge: true });
            
            // Navigate to onboarding for new users
            router.push('/(onboarding)/profile-setup');
          } else {
            // Existing user - navigate to main app
            router.push('/(tabs)');
          }
        })
        .catch((error) => {
          console.error('Google Sign-in Error:', error);
          setLocalError(error.message || 'Google sign-in failed');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [response]);

  // Handle Apple Sign In
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Use the standard Firebase authentication 
      // with native Apple authentication
      const { identityToken } = credential;
      
      if (!identityToken) {
        throw new Error('Apple Sign In failed: No identity token');
      }
      
      // Create the Apple Auth provider
      const appleCredential = firebase.AppleAuthProvider.credential(identityToken);
      
      // Sign in with credential
      const userCredential = await auth.signInWithCredential(appleCredential);
      
      // Check if this is a new user
      const isNewUser = userCredential.additionalUserInfo?.isNewUser;
      
      if (isNewUser && userCredential.user) {
        // For new Apple users, we need to save their name from the credential
        // as Apple only provides it once
        const displayName = credential.fullName 
          ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
          : '';
          
        // Create user document for new users
        await firestore.collection('users').doc(userCredential.user.uid).set({
          email: userCredential.user.email,
          displayName: displayName || userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          createdAt: serverTimestamp(),
          hasCompletedOnboarding: false,
          provider: 'apple',
          status: 'active'
        }, { merge: true });
        
        // Navigate to onboarding for new users
        router.push('/(onboarding)/profile-setup');
      } else {
        // Existing user - navigate to main app
        router.push('/(tabs)');
      }
    } catch (error: any) {
      console.error('Apple Sign-in Error:', error);
      // Only set error for real errors, not user cancellation
      if (error.code !== 'ERR_CANCELED') {
        setLocalError(error.message || 'Apple sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Sign Up
  const handleEmailSignUp = async () => {
    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }
    
    // Password validation - at least 6 characters
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setLoading(true);
      setLocalError(null);
      
      await signUp(email, password);
      console.log('Authentication successful, navigating to profile setup');
      
      // If we get here, the authentication was successful
      router.push('/(onboarding)/profile-setup');
    } catch (err: any) {
      console.error('Sign up error:', err);
      setLocalError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };
  
  // Use either local error or auth error
  const error = localError || authError;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to find your perfect match</Text>
        </View>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
            testID="email-input"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
            testID="password-input"
          />
          
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleEmailSignUp}
            disabled={loading || !email || !password}
            testID="signup-button"
          >
            <LinearGradient
              colors={['#FF6B6B', '#FFA07A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              locations={[0.3, 1]}
              style={styles.gradient}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Create with Email</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.orContainer}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>
          
          {/* Social Login Options */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Sign In Button */}
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => promptAsync()}
              disabled={loading}
            >
              <Image 
                source={require('../../assets/images/google-icon.png')}
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
            
            {/* Apple Sign In Button - Only on iOS */}
            {Platform.OS === 'ios' && hasAppleAuth && (
              <TouchableOpacity
                style={[styles.socialButton, styles.appleButton]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={24} color="#000" style={styles.appleIcon} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  titleContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    marginBottom: 30,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 4,
    fontSize: 14,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  signupButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  orText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  appleIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  linkText: {
    color: '#FF6B6B',
    fontWeight: '600',
    fontSize: 15,
  },
});