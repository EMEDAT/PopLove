// components/onboarding/EthnicitySelection.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EthnicitySelectionProps {
  selectedEthnicity: string;
  onSelectEthnicity: (ethnicity: string) => void;
}

export default function EthnicitySelection({ selectedEthnicity, onSelectEthnicity }: EthnicitySelectionProps) {
  // Ethnicity options
  const ethnicityOptions = [
    'Asian',
    'Black/African',
    'Caucasian/White',
    'Hispanic/Latino',
    'Middle Eastern',
    'Native American',
    'Pacific Islander',
    'Multiracial',
    'Other',
    'Prefer not to say'
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>What's your ethnicity?</Text>
      <Text style={styles.subtitle}>This helps us provide better matches</Text>
      
      <View style={styles.optionsContainer}>
        {ethnicityOptions.map((ethnicity) => (
          <TouchableOpacity
            key={ethnicity}
            onPress={() => onSelectEthnicity(ethnicity)}
            style={styles.optionButton}
          >
            <LinearGradient
              colors={selectedEthnicity === ethnicity ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={[
                styles.optionText,
                selectedEthnicity === ethnicity && styles.selectedOptionText
              ]}>
                {ethnicity}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* <Text style={styles.privacyNote}>
        You can control who sees this information in your privacy settings
      </Text> */}
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
  },
//   privacyNote: {
//     marginTop: 24,
//     marginBottom: 20,
//     fontSize: 14,
//     color: '#888',
//     fontStyle: 'italic',
//     textAlign: 'center',
//   }
});