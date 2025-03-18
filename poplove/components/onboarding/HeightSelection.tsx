// components/onboarding/HeightSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface HeightSelectionProps {
  height: string;
  onHeightChange: (height: string) => void;
}

export default function HeightSelection({ height, onHeightChange }: HeightSelectionProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Common specific heights in cm
  const commonHeights = [
    '150', '155', '160', '165', '170', 
    '175', '180', '185', '190', '195', '200'
  ];

  // Handle height input validation
  const handleHeightChange = (value: string) => {
    // Update parent state
    onHeightChange(value);
    
    // Validate input
    if (!value) {
      setError(null);
      return;
    }
    
    // Validate only numbers
    if (!/^\d+$/.test(value)) {
      setError('Please enter numbers only');
      return;
    }
    
    // Validate reasonable height
    const heightNum = parseInt(value);
    if (isNaN(heightNum) || heightNum < 100 || heightNum > 250) {
      setError('Height should be between 100-250 cm');
    } else {
      setError(null);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>How tall are you?</Text>
      
      {/* Height Input */}
      <View style={styles.heightInputContainer}>
        <Text style={styles.inputLabel}>Your exact height in cm:</Text>
        <TextInput
          style={styles.heightInput}
          keyboardType="number-pad"
          placeholder="Enter your height"
          maxLength={3}
          value={height}
          onChangeText={handleHeightChange}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.helperText}>This helps us find better matches for you</Text>
      </View>
      
      <Text style={styles.subtitle}>Or select a common height:</Text>
      
      <View style={styles.heightsContainer}>
        {commonHeights.map((heightValue) => (
          <TouchableOpacity
            key={heightValue}
            onPress={() => onHeightChange(heightValue)}
            style={styles.heightButton}
          >
            <LinearGradient
              colors={height === heightValue ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={[
                styles.heightText,
                height === heightValue && styles.selectedHeightText
              ]}>
                {heightValue} cm
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
    marginTop: 20,
    marginBottom: 15,
  },
  heightInputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  heightInput: {
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  heightsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  heightButton: {
    width: '30%',
    height: 45,
    borderRadius: 22.5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heightText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedHeightText: {
    color: 'white',
  }
});