// contexts/SubscriptionContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuthContext } from '../components/auth/AuthProvider';

interface SubscriptionContextType {
  currentTier: string;
  isLoading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  hasSufficientTier: (requiredTier: 'basic' | 'premium' | 'vip') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  currentTier: 'basic',
  isLoading: false,
  error: null,
  refreshSubscription: async () => {},
  hasSufficientTier: () => false,
});

export const useSubscription = () => useContext(SubscriptionContext);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const { user } = useAuthContext();
  const [currentTier, setCurrentTier] = useState<string>('basic');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to determine if user has sufficient tier
  const hasSufficientTier = (requiredTier: 'basic' | 'premium' | 'vip'): boolean => {
    const tierPriority: Record<string, number> = {
      'basic': 1,
      'premium': 2,
      'vip': 3
    };

    return tierPriority[currentTier] >= tierPriority[requiredTier];
  };
  
  // Function to fetch user's subscription
  const fetchSubscription = async () => {
    if (!user) {
      setCurrentTier('basic');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setCurrentTier(userData.subscriptionPlan || 'basic');
      } else {
        setCurrentTier('basic');
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Subscribe to firestore updates for real-time subscription changes
  useEffect(() => {
    if (!user) {
      setCurrentTier('basic');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          setCurrentTier(doc.data().subscriptionPlan || 'basic');
        } else {
          setCurrentTier('basic');
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error setting up subscription listener:', err);
        setError('Failed to listen for subscription updates');
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [user]);
  
  return (
    <SubscriptionContext.Provider 
      value={{ 
        currentTier, 
        isLoading, 
        error,
        refreshSubscription: fetchSubscription,
        hasSufficientTier
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};