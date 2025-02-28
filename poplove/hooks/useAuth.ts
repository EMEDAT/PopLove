// hooks/useAuth.ts
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
    setError(error.message);
    setTimeout(() => setError(null), 3000);
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsAuthenticating(true);
      setError(null);
      await authService.signInWithEmail(email, password);
    } catch (error: any) {
      handleAuthError(error);
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