// components/live-love/LineUpMode.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLineUp } from './LineUpScreens/LineUpContext';
import LineUpProviderWrapper from './LineUpProviderWrapper';
import SelectionScreen from './LineUpScreens/SelectionScreen';
import LineUpScreen from './LineUpScreens/LineUpScreen';
import SpotlightPrivateScreen from './LineUpScreens/SpotlightPrivateScreen';
import MatchSelectionScreen from './LineUpScreens/MatchSelectionScreen';
import ConfirmationScreen from './LineUpScreens/ConfirmationScreen';
import EliminatedScreen from './LineUpScreens/EliminatedScreen';
import NoMatchesScreen from './LineUpScreens/NoMatchesScreen';
import CongratulationsScreen from './LineUpScreens/CongratulationsScreen';
import { debugLog } from './LineUpScreens/utils';

// LineUp container component
const LineUpContainer = ({ onBack }) => {
  const { step, loading } = useLineUp();
  
  // Handle back navigation
  const handleBack = () => {
    debugLog('LineUpMode', 'Back button pressed');
    onBack();
  };
  
  // Render different screens based on current step
  const renderScreen = () => {
    debugLog('LineUpMode', `Rendering screen for step: ${step}`);
    
    switch (step) {
      case 'selection':
        return <SelectionScreen onBack={handleBack} />;
      case 'lineup':
        return <LineUpScreen />;
      case 'private':
        return <SpotlightPrivateScreen />;
      case 'matches':
        return <MatchSelectionScreen />;
      case 'confirmation':
        return <ConfirmationScreen onBack={handleBack} />;
      case 'eliminated':
        return <EliminatedScreen onBack={handleBack} />;
      case 'no-matches':
        return <NoMatchesScreen />;
      case 'congratulations':
        return <CongratulationsScreen />;
      default:
        return <SelectionScreen onBack={handleBack} />;
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
      debugLog('LineUpMode', 'Setting up global LineUp context reference');
      window.lineupContextRef = { current: null };
      
      return () => {
        debugLog('LineUpMode', 'Cleaning up global LineUp context reference');
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