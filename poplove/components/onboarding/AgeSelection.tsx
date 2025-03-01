// components/onboarding/AgeSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AgeSelectionProps {
  selectedAgeRange: string;
  onSelectAge: (ageRange: string) => void;
}

export default function AgeSelection({ selectedAgeRange, onSelectAge }: AgeSelectionProps) {
  const ageRanges = [
    '18 to 24',
    '25 to 29',
    '30 to 34',
    '35 to 44',
    '45 to 54',
    '55 or older'
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select your age</Text>
      
      <View style={styles.optionsContainer}>
        {ageRanges.map((ageRange) => (
          <TouchableOpacity
            key={ageRange}
            onPress={() => onSelectAge(ageRange)}
            style={styles.optionButton}
          >
            <LinearGradient
              colors={selectedAgeRange === ageRange ? ['#FF6B6B', '#FFA07A'] : ['#E5E5E5', '#E5E5E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={[
                styles.optionText,
                selectedAgeRange === ageRange && styles.selectedOptionText
              ]}>
                {ageRange}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 30,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  }
});