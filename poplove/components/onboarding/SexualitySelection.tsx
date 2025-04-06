// components/onboarding/SexualitySelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SexualitySelectionProps {
  selectedSexuality: string;
  onSelectSexuality: (sexuality: string) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  onBack: () => void;
}

export default function SexualitySelection({ 
  selectedSexuality,
  onSelectSexuality,
  visibleOnProfile = true,
  onToggleVisibility,
  onBack
}: SexualitySelectionProps) {
  const [isVisible, setIsVisible] = useState(visibleOnProfile);

  const handleVisibilityChange = (value: boolean) => {
    setIsVisible(value);
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  const sexualityOptions = [
    'Straight',
    'Gay',
    'Lesbian',
    'Bisexual',
    'Allosexual',
    'Androsexual'
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>What's your sexuality?</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        {sexualityOptions.map((sexuality) => (
          <TouchableOpacity
            key={sexuality}
            onPress={() => onSelectSexuality(sexuality)}
            style={[
              styles.optionButton,
              selectedSexuality === sexuality && styles.selectedOptionButton
            ]}
          >
            <Text style={styles.optionText}>{sexuality}</Text>
            <View style={[
              styles.radioCircle,
              selectedSexuality === sexuality && styles.selectedRadioCircle
            ]}>
              {selectedSexuality === sexuality && (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientDot}
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.visibilityContainer}>
        <Text style={styles.visibilityText}>Visible on profile</Text>
        <Switch 
          value={isVisible}
          onValueChange={handleVisibilityChange}
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
      
      <TouchableOpacity style={styles.feedback}>
        <Text style={styles.feedbackText}>Feedback on sexuality?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 24,
    backgroundColor: '#F2F1ED',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#161616',
  },
  scrollContainer: {
    maxHeight: 4 * 56, // Show 4 items at a time
  },
  scrollContent: {
    paddingBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedOptionButton: {
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 17,
    color: '#333333',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioCircle: {
    borderColor: '#FF6B6B',
  },
  gradientDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 30,
    marginBottom: 20,
  },
  visibilityText: {
    marginRight: 10,
    fontSize: 15,
    color: '#333',
  },
  feedback: {
    marginTop: 20,
  },
  feedbackText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  }
});