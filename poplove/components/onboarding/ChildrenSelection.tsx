// components/onboarding/ChildrenSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ChildrenSelectionProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export default function ChildrenSelection({ selectedOption, onSelectOption }: ChildrenSelectionProps) {
  // Children status options
  const childrenOptions = [
    'No children',
    'Have children - living with me',
    'Have children - not living with me',
    'Want children someday',
    'Don\'t want children',
    'Prefer not to say'
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Do you have children?</Text>
      <Text style={styles.subtitle}>This helps in finding compatible matches</Text>
      
      <View style={styles.optionsContainer}>
        {childrenOptions.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onSelectOption(option)}
            style={styles.optionButton}
          >
            <LinearGradient
              colors={selectedOption === option ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={[
                styles.optionText,
                selectedOption === option && styles.selectedOptionText
              ]}>
                {option}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.privacyNote}>
        You can control who sees this information in your privacy settings
      </Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
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
  privacyNote: {
    marginTop: 24,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  }
});