// components/onboarding/AgeSelection.tsx - UPDATED VERSION
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AgeSelectionProps {
  selectedAgeRange: string;
  onSelectAge: (ageRange: string) => void;
  age?: string;
  onAgeChange?: (age: string) => void;
}

export default function AgeSelection({ 
  selectedAgeRange, 
  onSelectAge, 
  age, 
  onAgeChange 
}: AgeSelectionProps) {
  // Force both fields to be required
  
  const ageRanges = [
    '18 to 24',
    '25 to 29',
    '30 to 34',
    '35 to 44',
    '45 to 54',
    '55 or older'
  ];

  // Local state for age input validation
  const [ageError, setAgeError] = useState<string | null>(null);

  // Simplified age input handling to prevent flickering
  const handleAgeChange = (value: string) => {
    // Always update parent component first
    if (onAgeChange) {
      onAgeChange(value);
    }

    // Then handle validation separately
    if (!value) {
      setAgeError(null);
      return;
    }
    
    // Validate only numeric input after updating parent
    if (!/^\d+$/.test(value)) {
      setAgeError('Please enter numbers only');
      return;
    }
    
    // Validate age range
    const ageNum = parseInt(value);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setAgeError('Age must be between 18-99');
    } else {
      setAgeError(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your age</Text>
      
      {/* New Age Input Field */}
      <View style={styles.ageInputContainer}>
        <Text style={styles.inputLabel}>Your exact age:</Text>
        <TextInput
          style={styles.ageInput}
          keyboardType="number-pad"
          placeholder="Enter your age"
          maxLength={2}
          value={age}
          onChangeText={handleAgeChange}
        />
        {ageError && <Text style={styles.errorText}>{ageError}</Text>}
      </View>
      
      <Text style={styles.subtitle}>Select your age range:</Text>
      
      <View style={styles.optionsContainer}>
        {ageRanges.map((ageRange) => {
          // Calculate if this range contains the user's age
          const isMatchingRange = age ? (() => {
            const ageNum = parseInt(age);
            const rangeParts = ageRange.split(' to ');
            if (rangeParts.length === 2) {
              const min = parseInt(rangeParts[0]);
              const max = parseInt(rangeParts[1]);
              return ageNum >= min && ageNum <= max;
            } else if (ageRange === '55 or older') {
              return ageNum >= 55;
            }
            return false;
          })() : false;
          
          return (
            <TouchableOpacity
              key={ageRange}
              onPress={() => onSelectAge(ageRange)}
              style={styles.optionButton}
              disabled={false} // Allow selection regardless of age
            >
              <LinearGradient
                colors={selectedAgeRange === ageRange ? ['#EC5F61', '#F0B433'] : 
                       isMatchingRange ? ['#FFD1D1', '#FFE3CC'] : ['#E6E9ED', '#E6E9ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[
                  styles.optionText,
                  selectedAgeRange === ageRange && styles.selectedOptionText,
                  isMatchingRange && !selectedAgeRange && styles.suggestedOptionText
                ]}>
                  {ageRange} {isMatchingRange && !selectedAgeRange && "✓"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 15,
  },
  ageInputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  ageInput: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFAFA',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  requiredText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  optionsContainer: {
    width: '100%',
    gap: 13,
  },
  optionButton: {
    width: '100%',
    height: 50,
    borderRadius: 28,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  },
  suggestedOptionText: {
    color: '#FF6B6B',
    fontWeight: '600',
  }
});