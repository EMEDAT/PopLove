// components/onboarding/EducationLevelSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface EducationLevelSelectionProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export default function EducationLevelSelection({ 
  selectedOption, 
  onSelectOption
}: EducationLevelSelectionProps) {
  const options = [
    'High School',
    'Undergrad',
    'Postgrad',
    'Prefer not to say'
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's the highest level you attained?</Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <View key={option}>
            <TouchableOpacity 
              style={styles.row} 
              onPress={() => onSelectOption(option)}
              activeOpacity={0.7}
            >
              <Text style={styles.text}>{option}</Text>
              {selectedOption === option ? (
                <View style={styles.checkboxContainer}>
                  <LinearGradient
                    colors={['#EC5F61', '#F0B433']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientCheckbox}
                  >
                    <Text style={styles.checkmark}>✓</Text>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.checkbox} />
              )}
            </TouchableOpacity>
            <View style={styles.divider} />
          </View>
        ))}
      </View>
      
      <View style={styles.visibilityContainer}>
        <Ionicons name="eye-off-outline" size={20} color="#333" />
        <Text style={styles.visibilityText}>Hidden on profile</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F1ED',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    color: '#161616',
  },
  optionsContainer: {
    width: '100%',
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    height: 56,
  },
  text: { 
    fontSize: 16, 
    color: '#161616',
    fontWeight: '500',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientCheckbox: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24, 
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#F9F6F2',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 137,
  },
  visibilityText: {
    fontSize: 14,
    color: '#161616',
    marginLeft: 8,
  }
});