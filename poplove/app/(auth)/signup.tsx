// app/(auth)/signup.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../components/auth/AuthProvider';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signUp, error: authError } = useAuth();

  const validateInputs = () => {
    // Clear previous error
    setValidationError(null);
    
    // Check empty fields
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setValidationError('All fields are required');
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    
    // Check password length
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSignUp = async () => {
    console.log('Attempting signup validation');
    
    // Validate inputs first
    if (!validateInputs()) {
      return;
    }
    
    try {
      setLoading(true);
      console.log('Validation passed, attempting signup');
      
      const user = await signUp(email, password);
      console.log('Signup successful, user:', user?.uid);
      
      // Navigate to profile setup
      router.push('/(onboarding)/onboarding-flow');
    } catch (err: any) {
      console.error('Signup error:', err);
      
      let errorMessage = 'Sign up failed';
      
      // Handle specific Firebase auth errors
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection';
          break;
        case 'permission-denied':
          errorMessage = 'Permission denied. Please try again later';
          break;
        default:
          errorMessage = err.message || 'An unexpected error occurred';
      }
      
      Alert.alert('Sign Up Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            {/* <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity> */}
            <View style={styles.headerRight} />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Join PopLove</Text>
            <Text style={styles.subtitle}>Sign up to start making real connections</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setValidationError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setValidationError(null);
                }}
                secureTextEntry
                placeholderTextColor="#aaa"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setValidationError(null);
                }}
                secureTextEntry
                placeholderTextColor="#aaa"
              />
            </View>

            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}

            {authError && (
              <Text style={styles.errorText}>{authError}</Text>
            )}

            <TouchableOpacity 
              style={[styles.signupButton, loading && styles.disabledButton]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <LinearGradient
                colors={['#EC5F61', '#F0B433'] }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Account</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.loginText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 24, // Balance the header
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
  },
  signupButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    opacity: 0.7,
  },
  gradient: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 15,
  },
  loginText: {
    color: '#FF6B6B',
    fontSize: 15,
    fontWeight: '600',
  },
});