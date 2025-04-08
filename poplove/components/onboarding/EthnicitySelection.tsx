import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EthnicitySelectionProps {
  selectedEthnicity: string;
  onSelectEthnicity: (ethnicity: string) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function EthnicitySelection({ 
  selectedEthnicity, 
  onSelectEthnicity,
  visibleOnProfile = true,
  onToggleVisibility 
}: EthnicitySelectionProps) {
  const [isVisible, setIsVisible] = useState(visibleOnProfile);

  useEffect(() => {
    setIsVisible(visibleOnProfile);
  }, [visibleOnProfile]);

  // Handle visibility toggle
  const handleVisibilityChange = (value: boolean) => {
    // Update local state first for immediate UI feedback
    setIsVisible(value);
    
    // Then call parent callback if provided
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  const ethnicityOptions = [
    'African American',
    'African',
    'Black/African Descent',
    'Afro-Latino',
    'East Asian',
    'Chinese',
    'Japanese',
    'Korean',
    'Taiwanese',
    'Vietnamese',
    'Filipino',
    'Southeast Asian',
    'Hispanic/Latino',
    'Mexican',
    'Puerto Rican',
    'Cuban',
    'Dominican',
    'Central American',
    'South American',
    'Middle Eastern',
    'Arab',
    'Persian',
    'Turkish',
    'Kurdish',
    'Armenian',
    'Israeli',
    'Native American',
    'Indigenous',
    'First Nations',
    'Pacific Islander',
    'Hawaiian',
    'Samoan',
    'Tongan',
    'Māori',
    'South Asian',
    'Indian',
    'Pakistani',
    'Bangladeshi',
    'Sri Lankan',
    'Nepali',
    'Biracial',
    'Multiracial',
    'Mixed Race',
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your ethnicity?</Text>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {ethnicityOptions.map((ethnicity) => (
          <View key={ethnicity}>
            <TouchableOpacity 
              style={styles.row} 
              onPress={() => onSelectEthnicity(ethnicity)}
              activeOpacity={0.7}
            >
              <Text style={styles.text}>{ethnicity}</Text>
              {selectedEthnicity === ethnicity ? (
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
      </ScrollView>
      
      <View style={styles.optionRow}>
        <Text style={styles.optionText}>Visible on profile</Text>
        <Switch 
                value={isVisible}
                onValueChange={handleVisibilityChange}
                trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
                thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
              />
      </View>
      
      <TouchableOpacity style={styles.feedback}>
        <Text style={styles.feedbackText}>Feedback on ethnicity?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20 
  },
  scrollContainer: {
    maxHeight: 5 * 56, // 5 items * height of each row
  },
  scrollContent: {
    paddingBottom: 20,
  },
  title: { 
    fontSize: 26, 
    fontWeight: '600', 
    color: '#161616',
    marginBottom: 8 
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
    alignItems: 'center',
    justifyContent: 'center'
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 120,
    height: 56
  },
  optionText: {
    fontSize: 16, 
    color: '#161616',
    fontWeight: '500',
  },
  feedback: {
    marginTop: 0
  },
  feedbackText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  }
});