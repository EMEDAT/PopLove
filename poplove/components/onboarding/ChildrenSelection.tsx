import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChildrenSelection({ selectedOption, onSelectOption }) {
  const [showChildCount, setShowChildCount] = useState(false);
  
  const childrenOptions = [
    'No children',
    'Have children',
    'Want children someday',
    'Don\'t want children',
    'Prefer not to say'
  ];
  
  const childCountOptions = ['1', '2', '3', '4+'];

  const handleOptionSelect = (option) => {
    if (option === 'Have children') {
      setShowChildCount(true);
      // Don't change selection if user already has a number selected
      if (!selectedOption.startsWith('Have ') || selectedOption === 'Have children') {
        onSelectOption(option);
      }
    } else {
      setShowChildCount(false);
      onSelectOption(option);
    }
  };
  
  const handleChildCountSelect = (count) => {
    onSelectOption(`Have ${count} children`);
    setShowChildCount(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Do you have children?</Text>
      <Text style={styles.subtitle}>This helps in finding compatible matches</Text>
      
      {!showChildCount ? (
        <View style={styles.optionsContainer}>
          {childrenOptions.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => handleOptionSelect(option)}
              style={styles.optionButton}
            >
              <LinearGradient
                colors={selectedOption === option || (selectedOption.startsWith('Have ') && option === 'Have children') 
                  ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[
                  styles.optionText,
                  (selectedOption === option || (selectedOption.startsWith('Have ') && option === 'Have children')) && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          <Text style={styles.countTitle}>How many children do you have?</Text>
          {childCountOptions.map((count) => (
            <TouchableOpacity
              key={count}
              onPress={() => handleChildCountSelect(count)}
              style={styles.optionButton}
            >
              <LinearGradient
                colors={selectedOption === `Have ${count} children` ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[
                  styles.optionText,
                  selectedOption === `Have ${count} children` && styles.selectedOptionText
                ]}>
                  {count}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowChildCount(false)}
          >
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
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
    fontSize: 13,
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
  countTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
    color: '#333',
  },
  backButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  backText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  privacyNote: {
    marginTop: 24,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  }
});