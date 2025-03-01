// components/onboarding/ExpectationsLifestyle.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface ExpectationsProps {
  onNext: (selectedOptions: string[]) => void;
}

export default function ExpectationsLifestyle({ onNext }: ExpectationsProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const options = [
    { id: 'longterm', label: 'Long term relationship', size: 'medium', position: { top: 80, left: 40 } },
    { id: 'vacation', label: 'Vacation', size: 'small', position: { top: 80, right: 120 } },
    { id: 'romance', label: 'Romance', size: 'medium', position: { top: 60, right: 40 } },
    { id: 'family', label: 'Start a family', size: 'large', position: { top: 180, left: 140 } },
    { id: 'active', label: 'Active partner', size: 'medium', position: { top: 300, left: 60 } },
    { id: 'casual', label: 'Casual dating', size: 'medium', position: { top: 250, right: 80 } },
    { id: 'friends', label: 'Friends first', size: 'small', position: { top: 180, right: 30 } },
    { id: 'friendsplus', label: 'Friends with benefit', size: 'small', position: { top: 130, right: 30 } },
    { id: 'chat', label: 'Chat', size: 'small', position: { top: 130, left: 140 } },
    { id: 'touring', label: 'Touring', size: 'small', position: { top: 220, left: 30 } },
    { id: 'marriage', label: 'Marriage', size: 'small', position: { bottom: 100, left: 120 } },
    { id: 'pets', label: 'Pets', size: 'small', position: { bottom: 60, left: 50 } },
    { id: 'surfing', label: 'Surfing', size: 'small', position: { bottom: 120, right: 50 } },
    { id: 'drinking', label: 'Drinking', size: 'small', position: { bottom: 100, right: 160 } },
    { id: 'dontknow', label: "Don't know", size: 'small', position: { bottom: 60, right: 80 } },
  ];

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'large':
        return { width: 160, height: 160, fontSize: 18 };
      case 'medium':
        return { width: 120, height: 120, fontSize: 16 };
      case 'small':
        return { width: 90, height: 90, fontSize: 14 };
      default:
        return { width: 90, height: 90, fontSize: 14 };
    }
  };

  const toggleOption = (id: string) => {
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter(item => item !== id));
    } else {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  const handleContinue = () => {
    if (selectedOptions.length > 0) {
      onNext(selectedOptions);
    } else {
      // Alert user to select at least one option
      alert('Please select at least one option');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your expectations & Lifestyles?</Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const sizeStyle = getSizeStyles(option.size);
          const isSelected = selectedOptions.includes(option.id);
          
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => toggleOption(option.id)}
              style={[
                styles.optionButton,
                sizeStyle,
                option.position,
                isSelected ? styles.selectedOption : styles.unselectedOption
              ]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#FF6B6B', '#FFA07A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.optionGradient, { width: sizeStyle.width, height: sizeStyle.height }]}
                >
                  <Text style={[styles.optionText, { fontSize: sizeStyle.fontSize, color: 'white' }]}>
                    {option.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.optionContent, { width: sizeStyle.width, height: sizeStyle.height }]}>
                  <Text style={[styles.optionText, { fontSize: sizeStyle.fontSize }]}>
                    {option.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      <TouchableOpacity 
        style={styles.continueButton}
        onPress={handleContinue}
        disabled={selectedOptions.length === 0}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FFA07A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradientButton,
            selectedOptions.length === 0 && styles.disabledButton
          ]}
        >
          <Text style={styles.continueText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
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
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 30,
  },
  optionsContainer: {
    flex: 1,
    position: 'relative',
  },
  optionButton: {
    position: 'absolute',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedOption: {
    borderWidth: 0,
  },
  unselectedOption: {
    backgroundColor: '#F3F3F3',
  },
  optionGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  optionContent: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  optionText: {
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  continueButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  }
});