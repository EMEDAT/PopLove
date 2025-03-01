// components/onboarding/OnboardingNavigation.tsx
import React from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OnboardingNavigationProps {
  onBack: () => void;
  onNext: () => void;
  canGoBack: boolean;
  canGoNext: boolean;
}

export default function OnboardingNavigation({ 
  onBack, 
  onNext, 
  canGoBack = true, 
  canGoNext = false 
}: OnboardingNavigationProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.navButton, !canGoBack && styles.disabledButton]} 
        onPress={onBack}
        disabled={!canGoBack}
      >
        <Ionicons 
          name="chevron-back" 
          size={24} 
          color={canGoBack ? "#000" : "#ccc"} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, !canGoNext && styles.disabledButton]} 
        onPress={onNext}
        disabled={!canGoNext}
      >
        <Ionicons 
          name="chevron-forward" 
          size={24} 
          color={canGoNext ? "#000" : "#ccc"} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    borderColor: '#E5E5E5',
    opacity: 0.5,
  }
});