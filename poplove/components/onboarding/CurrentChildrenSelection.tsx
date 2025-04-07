import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface CurrentChildrenSelectionProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export default function CurrentChildrenSelection({ 
  selectedOption, 
  onSelectOption 
}: CurrentChildrenSelectionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showChildCount, setShowChildCount] = useState(false);
  
  const childrenOptions = [
    'Don\'t have children',
    'Have children',
    'Prefer not to say'
  ];

  const childCountOptions = ['1', '2', '3', '4+'];

  const handleOptionSelect = (option: string) => {
    if (option === 'Have children') {
      setShowChildCount(true);
    } else {
      setShowChildCount(false);
      onSelectOption(option);
    }
  };

  const handleChildCountSelect = (count: string) => {
    onSelectOption(`Have ${count} children`);
    setShowChildCount(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {!showChildCount ? 'Do you have children?' : 'How many children do you have?'}
      </Text>
      
      {!showChildCount ? (
        <View style={styles.optionsContainer}>
          {childrenOptions.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => handleOptionSelect(option)}
              style={styles.row}
            >
              <Text style={styles.text}>{option}</Text>
              <View style={styles.checkboxContainer}>
              {(selectedOption === option || 
                (selectedOption.startsWith('Have ') && option === 'Have children')) ? (
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
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.optionsContainer}>
          {childCountOptions.map((count) => (
            <TouchableOpacity
              key={count}
              onPress={() => handleChildCountSelect(count)}
              style={styles.row}
            >
              <Text style={styles.text}>{count}</Text>
              <View style={styles.checkboxContainer}>
              {selectedOption === `Have ${count} children` ? (
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
              </View>
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
      
      {!showChildCount && (
        <View style={styles.visibilityContainer}>
            <Text style={styles.visibilityText}>Visible on profile</Text>
            <Switch
            value={isVisible}
            onValueChange={setIsVisible}
            trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
            thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
            />
        </View>
        )}
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
    gap: 13,
  },
  // Added new styles
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
  checkboxChecked: {
    width: 24, 
    height: 24,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center', // Center vertically
    alignItems: 'center',     // Center horizontally
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  // Kept existing styles
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
    fontSize: 16,
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
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 200,
    paddingVertical: 10,
  },
  visibilityText: {
    fontSize: 16,
    color: '#161616',
    fontWeight: '500',
  },
});