// components/onboarding/GenderSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GenderSelectionProps {
  selectedGender: string;
  onSelectGender: (gender: string) => void;
}

export default function GenderSelection({ selectedGender, onSelectGender }: GenderSelectionProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select your Gender</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          onPress={() => onSelectGender('male')}
          style={styles.optionButton}
        >
          <LinearGradient
            colors={selectedGender === 'male' ? ['#FF6B6B', '#FFA07A'] : ['#E5E5E5', '#E5E5E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={[
              styles.optionText,
              selectedGender === 'male' && styles.selectedOptionText
            ]}>
              Male
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => onSelectGender('female')}
          style={styles.optionButton}
        >
          <LinearGradient
            colors={selectedGender === 'female' ? ['#FF6B6B', '#FFA07A'] : ['#E5E5E5', '#E5E5E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={[
              styles.optionText,
              selectedGender === 'female' && styles.selectedOptionText
            ]}>
              Female
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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