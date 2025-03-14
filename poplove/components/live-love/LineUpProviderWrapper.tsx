// components/live-love/LineUpProviderWrapper.tsx
import React, { useRef, useEffect } from 'react';
import { LineUpProvider } from './LineUpScreens/LineUpContext';
import { serverTimestamp } from 'firebase/firestore';

// Create a logger function for this component
const logProviderWrapper = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [ProviderWrapper] 🧩 ${message}`, data ? data : '');
};

// Create properly formatted notification payload
export const createLineupTurnNotification = (userId: string, sessionId: string) => {
  return {
    userId,
    type: 'lineup_turn',
    message: "It's your turn in the Line-Up! You're now the featured contestant.",
    data: { sessionId },
    createdAt: serverTimestamp(),
    isRead: false
  };
};

// Wrapper component that won't get remounted with timer changes
const LineUpProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use a ref to ensure we only log once
  const isFirstRender = useRef(true);
  
  // Register provider with global window object for notification access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logProviderWrapper('Registering LineUpProvider with window object');
      // Will be initialized in the LineUpProvider component
      window.lineupContextRef = { current: null };
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.lineupContextRef) {
        window.lineupContextRef.current = null;
      }
    };
  }, []);
  
  // Only log on first render
  if (isFirstRender.current) {
    logProviderWrapper('Creating stable LineUpProvider instance');
    isFirstRender.current = false;
  }
  
  return <LineUpProvider>{children}</LineUpProvider>;
};

export default LineUpProviderWrapper;