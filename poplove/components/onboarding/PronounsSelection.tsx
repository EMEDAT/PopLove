// components/onboarding/PronounsSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PronounsSelectionProps {
  selectedPronouns: string[];
  onSelectPronouns: (pronouns: string[]) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function PronounsSelection({ 
  selectedPronouns = [], 
  onSelectPronouns,
  visibleOnProfile = true,
  onToggleVisibility
}: PronounsSelectionProps) {
  // Local state for visibility if not provided
  const [localVisibility, setLocalVisibility] = useState(visibleOnProfile);
  
  const pronounsOptions = [
    'she',
    'her',
    'hers',
    'he',
    'him',
    'his',
    'they',
    'them',
    'theirs'
  ];

  const togglePronoun = (pronoun: string) => {
    // If already selected, remove it
    if (selectedPronouns.includes(pronoun)) {
      onSelectPronouns(selectedPronouns.filter(p => p !== pronoun));
    } 
    // Otherwise add it if under limit
    else if (selectedPronouns.length < 4) {
      onSelectPronouns([...selectedPronouns, pronoun]);
    }
  };

  const handleVisibilityToggle = (value: boolean) => {
    setLocalVisibility(value);
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Select up to 4</Text>
      
      <View style={styles.listContainer}>
        {pronounsOptions.map((option, index) => (
          <View key={option} style={styles.optionWrapper}>
            <TouchableOpacity
              onPress={() => togglePronoun(option)}
              style={styles.optionRow}
            >
              <Text style={styles.optionText}>{option}</Text>
              <View style={[
                styles.checkbox,
                selectedPronouns.includes(option) && styles.checkboxSelected
              ]}>
                {selectedPronouns.includes(option) && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
            {index < pronounsOptions.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
      
      <View style={styles.footer}>
        <View style={styles.visibilityContainer}>
          <View style={styles.visibilityRow}>
            <Text style={styles.visibilityText}>Visible on profile</Text>
            <Switch
              value={localVisibility}
              onValueChange={handleVisibilityToggle}
              trackColor={{ false: '#E5E5E5', true: '#8A2BE2' }}
              thumbColor={'white'}
            />
          </View>
        </View>
        
        <TouchableOpacity style={styles.feedbackLink}>
          <Text style={styles.feedbackText}>Feedback on pronouns?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between', // Pushes content to top and bottom
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  optionWrapper: {
    width: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    width: '100%',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#8A2BE2',
    borderColor: '#8A2BE2',
  },
  footer: {
    marginTop: 20,
  },
  visibilityContainer: {
    marginBottom: 20,
  },
  visibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  feedbackLink: {
    marginTop: 10,
    marginBottom: 20,
  },
  feedbackText: {
    fontSize: 16,
    color: '#8A2BE2',
  }
});