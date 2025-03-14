// hooks/useAuth.ts - Updated error handling
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, User } from '../lib/firebase';
import { authService } from '../services/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Get available auth methods - now only email
  const getAuthMethods = () => {
    return ['email'];
  };

  const handleAuthError = (error: any) => {
    console.log('Auth error details:', error);
    
    // More specific error messages
    let errorMessage = error.message || 'Authentication failed';
    
    if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password. Please try again or reset your password.';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email. Please sign up first.';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later.';
    }
    
    setError(errorMessage);
    
    // Clear error after 3 seconds
    setTimeout(() => setError(null), 3000);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsAuthenticating(true);
      setError(null);
      await authService.signInWithEmail(email, password);
    } catch (error: any) {
      handleAuthError(error);
      // Rethrow to let component handle it
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsAuthenticating(true);
      setError(null);
      
      const result = await authService.signUpWithEmail(email, password);
      return result;
    } catch (error: any) {
      handleAuthError(error);
      // Re-throw the error so the component can handle it
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAuthenticating,
    signIn,
    signUp,
    signOut: authService.signOut,
    getAuthMethods,
  };
}