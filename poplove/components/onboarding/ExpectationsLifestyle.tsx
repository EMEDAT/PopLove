// components/onboarding/ExpectationsLifestyle.tsx
import React, { useState, useEffect } from 'react';
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
  selectedLifestyle: string[];
  onUpdateLifestyle: (lifestyle: string[]) => void;
}

export default function ExpectationsLifestyle({ selectedLifestyle, onUpdateLifestyle }: ExpectationsProps) {
  const [localSelectedOptions, setLocalSelectedOptions] = useState<string[]>(selectedLifestyle || []);

  // Sync local state with props
  useEffect(() => {
    setLocalSelectedOptions(selectedLifestyle || []);
  }, [selectedLifestyle]);

  // Sync props with local state when it changes
  useEffect(() => {
    onUpdateLifestyle(localSelectedOptions);
  }, [localSelectedOptions]);

  const options = [
    { id: 'Longterm', label: 'Long term relationship', size: 'Larger', position: { top: 40, left: 0 } },
    { id: 'Vacation', label: 'Vacation', size: 'Small', position: { top: 20, right: 110 } },
    { id: 'Romance', label: 'Romance', size: 'Large', position: { top: 0, right: 0 } },
    { id: 'Family', label: 'Start a family', size: 'Largest', position: { top: 140, left: 75 } },
    { id: 'Active', label: 'Active partner', size: 'Larger', position: { top: 250, left: 0 } },
    { id: 'Casual', label: 'Casual dating', size: 'SmallPlus', position: { top: 280, right: 115 } },
    { id: 'Friends', label: 'Friends first', size: 'Smaller', position: { top: 170, right: 30 } },
    { id: 'Friendsplus', label: 'Friends with benefit', size: 'Smaller', position: { top:103, right: 0 } },
    { id: 'Chat', label: 'Chat', size: 'Smallest', position: { top: 100, left: 180 } },
    { id: 'Touring', label: 'Touring', size: 'Smaller', position: { top: 170, left: 0 } },
    { id: 'Marriage', label: 'Marriage', size: 'small', position: { bottom: 0, left: 65 } },
    { id: 'Pets', label: 'Pets', size: 'Smallest', position: { bottom: 10, left: 0 } },
    { id: 'Surfing', label: 'Surfing', size: 'Large', position: { bottom: 75, right: 0 } },
    { id: 'Drinking', label: 'Drinking', size: 'Small', position: { bottom: 8, right: 70 } }, 
    { id: 'Dontknow', label: "Don't know", size: 'Smallest', position: { bottom: 10, right: 5 } },
    { id: 'Connects', label: "connects", size: 'Tiny', position: { top: 228, right: 0 } },
  ];

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'Largest':
        return { width: 140, height: 140, fontSize: 18 };
      case 'Larger':
        return { width: 120, height: 120, fontSize: 16 };
      case 'Large':
        return { width: 100, height: 100, fontSize: 14 };
      case 'Small':
        return { width: 90, height: 90, fontSize: 12 };
      case 'SmallPlus':
        return { width: 80, height: 80, fontSize: 12 };
      case 'Smaller':
        return { width: 70, height: 70, fontSize: 10 };
      case 'Smallest':
        return { width: 60, height: 60, fontSize: 8 };
      case 'Tiny':
        return { width: 50, height: 50, fontSize: 6 };
      default:
        return { width: 90, height: 90, fontSize: 14 };
    }
  };

  const toggleOption = (id: string) => {
    if (localSelectedOptions.includes(id)) {
      setLocalSelectedOptions(localSelectedOptions.filter(item => item !== id));
    } else {
      setLocalSelectedOptions([...localSelectedOptions, id]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your expectations & Lifestyles?</Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const sizeStyle = getSizeStyles(option.size);
          const isSelected = localSelectedOptions.includes(option.id);
          
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '400',
    marginTop: 20,
    marginBottom: 20,
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
  }
});