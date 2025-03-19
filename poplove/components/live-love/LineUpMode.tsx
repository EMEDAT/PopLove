// components/live-love/LineUpMode.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLineUp } from './LineUpScreens/LineUpContext';
import LineUpProviderWrapper from './LineUpProviderWrapper';
import SelectionScreen from './LineUpScreens/SelectionScreen';
import LineUpScreen from './LineUpScreens/LineUpScreen';
import ContestantPrivateScreen from './LineUpScreens/SpotlightPrivateScreen';
import MatchSelectionScreen from './LineUpScreens/MatchSelectionScreen';
import ConfirmationScreen from './LineUpScreens/ConfirmationScreen';
import EliminatedScreen from './LineUpScreens/EliminatedScreen';
import NoMatchesScreen from './LineUpScreens/NoMatchesScreen';

// LineUp container component
const LineUpContainer = ({ onBack }) => {
  const { step, loading } = useLineUp();
  
  // Render different screens based on current step
  const renderScreen = () => {
    console.log(`[${new Date().toISOString()}] [LineUpMode] 🎯 Rendering screen for step: ${step}`);
    
    switch (step) {
      case 'selection':
        return <SelectionScreen onBack={onBack} />;
      case 'lineup':
        return <LineUpScreen />;
      case 'private':
        return <ContestantPrivateScreen />;
      case 'matches':
        return <MatchSelectionScreen />;
      case 'confirmation':
        return <ConfirmationScreen onBack={onBack} />;
      case 'eliminated':
        return <EliminatedScreen onBack={onBack} />;
      case 'no-matches':
        return <NoMatchesScreen />;
      default:
        return <SelectionScreen onBack={onBack} />;
    }
  };
  
  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
};

// Main LineUpMode component wrapped with provider
export default function LineUpMode({ onBack }) {
  // Create global reference for direct navigation from other components
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`[${new Date().toISOString()}] [LineUpMode] Setting up global LineUp context reference`);
      window.lineupContextRef = { current: null };
      
      return () => {
        console.log(`[${new Date().toISOString()}] [LineUpMode] Cleaning up global LineUp context reference`);
        if (window.lineupContextRef) {
          window.lineupContextRef.current = null;
        }
      };
    }
  }, []);
  
  return (
    <LineUpProviderWrapper>
      <LineUpContainer onBack={onBack} />
    </LineUpProviderWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  }
});