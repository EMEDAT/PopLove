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
    { id: 'Long-term relationship open-to-short', label: 'Long-term relationship, open-to-short', size: 'Larger', position: { top: 20, left: 0 } },
    { id: 'Life Partner', label: 'Life Partner', size: 'Small', position: { top: 0, right: 110 } },
    { id: 'Long-term relationship', label: 'Long-term relationship', size: 'Large', position: { top: -20, right: 0 } },
    { id: 'Family', label: 'Start a family', size: 'Largest', position: { top: 120, left: 75 } },
    { id: 'Short-term relationship (open to Long)', label: 'Short-term relationship, open-to-Long', size: 'Larger', position: { top: 240, left: 0 } },
    { id: 'Casual', label: 'Casual dating', size: 'SmallPlus', position: { top: 265, right: 115 } },
    { id: 'Friends', label: 'Friends first', size: 'Smaller', position: { top: 150, right: 30 } },
    { id: 'Friendsplus', label: 'Friends with benefit', size: 'Smaller', position: { top: 83, right: 0 } },
    { id: 'Chat Mate', label: 'Chat Mate', size: 'Smallest', position: { top: 80, left: 180 } },
    { id: 'Flirting', label: 'Flirting', size: 'Smaller', position: { top: 160, left: 0 } },
    { id: 'Marriage', label: 'Marriage', size: 'small', position: { bottom: 30, left: 65 } },
    { id: 'Type Myself', label: 'Type It MYSELF', size: 'Smallest', position: { bottom: 40, left: 0 } },
    { id: 'Short-term relationship', label: 'Short-term relationship', size: 'Large', position: { bottom: 115, right: 0 } },
    { id: 'Figuring out my dating goals', label: 'Figuring out my dating goals', size: 'Small', position: { bottom: 38, right: 70 } }, 
    { id: 'Prefer not to say', label: "Prefer not to say", size: 'Smallest', position: { bottom: 40, right: 5 } },
    { id: 'Networking', label: "Networking", size: 'Tiny', position: { top: 208, right: -10 } },
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
        return { width: 48, height: 48, fontSize: 5 };
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
      <Text style={styles.title}>What is your dating intention?</Text>
      
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
    color: '#F2F1ED',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 0,
    color: '#161616',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
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
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
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