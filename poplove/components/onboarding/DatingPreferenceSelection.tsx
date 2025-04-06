// components/onboarding/DatingPreferenceSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DatingPreferenceSelectionProps {
  selectedPreferences: string[];
  onSelectPreferences: (preferences: string[]) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  onNext?: () => void;
}

export default function DatingPreferenceSelection({ 
  selectedPreferences = [], 
  onSelectPreferences,
  visibleOnProfile = true,
  onToggleVisibility 
}: DatingPreferenceSelectionProps) {
  const [isVisible, setIsVisible] = useState(visibleOnProfile);

  const handleTogglePreference = (preference: string) => {
    if (selectedPreferences.includes(preference)) {
      onSelectPreferences(selectedPreferences.filter(p => p !== preference));
    } else {
      onSelectPreferences([...selectedPreferences, preference]);
    }
  };

  const handleVisibilityChange = (value: boolean) => {
    setIsVisible(value);
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Who do you want to date?</Text>
      <Text style={styles.subtitle}>Select all who you're open to meeting</Text>
      
      <View style={styles.optionsContainer}>
        <PreferenceOption 
          label="Men"
          selected={selectedPreferences.includes('men')}
          onToggle={() => handleTogglePreference('men')}
        />
        
        <PreferenceOption 
          label="Women"
          selected={selectedPreferences.includes('women')}
          onToggle={() => handleTogglePreference('women')}
        />
        
        <PreferenceOption 
          label="Nonbinary people"
          selected={selectedPreferences.includes('nonbinary')}
          onToggle={() => handleTogglePreference('nonbinary')}
        />
        
        <PreferenceOption 
          label="Everyone"
          selected={selectedPreferences.includes('everyone')}
          onToggle={() => handleTogglePreference('everyone')}
        />
      </View>
      
      <View style={styles.visibilityContainer}>
        <Text style={styles.visibilityText}>Visible on profile</Text>
        <Switch 
          value={isVisible}
          onValueChange={handleVisibilityChange}
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
      
      <TouchableOpacity style={styles.feedbackButton}>
        <Text style={styles.feedbackText}>Feedback on dating preferences?</Text>
      </TouchableOpacity>
    </View>
  );
}

interface PreferenceOptionProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
}

function PreferenceOption({ label, selected, onToggle }: PreferenceOptionProps) {
  return (
    <TouchableOpacity 
      style={styles.optionRow} 
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.optionText}>{label}</Text>
      {selected ? (
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F2F1ED',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#161616',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  optionsContainer: {
    marginBottom: 40,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  optionText: {
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
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  visibilityText: {
    fontSize: 16, 
    color: '#161616',
    fontWeight: '500',
  },
  feedbackButton: {
    marginTop: 5,
  },
  feedbackText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  }
});