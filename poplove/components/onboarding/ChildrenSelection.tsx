import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ChildrenSelectionProps {
  selectedOption: string;
  onSelectOption: (option: string) => void;
}

export default function ChildrenSelection({ 
  selectedOption, 
  onSelectOption 
}: ChildrenSelectionProps) {
  const [isVisible, setIsVisible] = useState(true);
  
  const familyPlanOptions = [
    "Don't want children",
    "Want children",
    "Open to children",
    "Not sure",
    "Prefer not to say"
  ];

  const handleOptionSelect = (option: string) => {
    onSelectOption(option);
  };

  const handleVisibilityToggle = (value: boolean) => {
    setIsVisible(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your family plans?</Text>
      
      <View style={styles.optionsContainer}>
        {familyPlanOptions.map((option) => (
          <View key={option}>
            <TouchableOpacity 
              style={styles.row} 
              onPress={() => handleOptionSelect(option)}
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
        <Text style={styles.visibilityText}>Visible on profile</Text>
        <Switch
          value={isVisible}
          onValueChange={handleVisibilityToggle}
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  visibilityText: {
    fontSize: 16,
    color: '#161616',
    fontWeight: '500',
  },
});