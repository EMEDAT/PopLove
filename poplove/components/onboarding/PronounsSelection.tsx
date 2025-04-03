// components/onboarding/PronounsSelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,

} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PronounsSelectionProps {
  selectedPronouns: string;
  onSelectPronouns: (pronouns: string) => void;
}

export default function PronounsSelection({ selectedPronouns, onSelectPronouns }: PronounsSelectionProps) {
  const pronounsOptions = [
    'He/Him',
    'She/Her',
    'They/Them',
    'He/They',
    'She/They',
    'Other',
    'Prefer not to say'
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Pronouns</Text>
      <Text style={styles.subtitle}>How would you like to be referred to?</Text>
      
      <View style={styles.optionsContainer}>
        {pronounsOptions.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => onSelectPronouns(option)}
            style={styles.optionButton}
          >
            <LinearGradient
              colors={selectedPronouns === option ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={[
                styles.optionText,
                selectedPronouns === option && styles.selectedOptionText
              ]}>
                {option}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
  },
  optionsContainer: {
    width: '100%',
    gap: 13,
    marginBottom: 30,
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
  }
});