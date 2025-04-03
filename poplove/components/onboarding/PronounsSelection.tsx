import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Switch,
  ScrollView,
  Dimensions
} from 'react-native';

const { height } = Dimensions.get('window');

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
  const [localVisibility, setLocalVisibility] = useState(visibleOnProfile);
  
  const pronounsOptions = [
    'she',
    'her',
    'hers',
    'he',
    'him',
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
      <View style={styles.header}>
        <Text style={styles.title}>What are your pronouns?</Text>
        <Text style={styles.subtitle}>Select up to 4</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {pronounsOptions.map((option, index) => (
          <View key={option}>
            <TouchableOpacity
              onPress={() => togglePronoun(option)}
              style={styles.optionRow}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>{option}</Text>
              <TouchableOpacity 
                style={[
                  styles.checkbox,
                  selectedPronouns.includes(option) && styles.checkboxSelected
                ]}
                onPress={() => togglePronoun(option)}
              >
                {selectedPronouns.includes(option) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            </TouchableOpacity>
            {index < pronounsOptions.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
        
        <View style={styles.divider} />
        
        <View style={styles.visibilityRow}>
          <Text style={styles.visibilityText}>Visible on profile</Text>
          <Switch
            value={localVisibility}
            onValueChange={handleVisibilityToggle}
            trackColor={{ false: '#E5E5E5', true: '#710014' }}
            thumbColor={'white'}
          />
        </View>
        
        <TouchableOpacity style={styles.feedbackLink}>
          <Text style={styles.feedbackText}>Feedback on pronouns?</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  header: {
    padding: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#161616',
    paddingRight: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
    height: height * 0.6, // Set to show only a portion of the list initially
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F9F6F2',
    borderColor: '#8A2BE2',
  },
  checkmark: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    width: '100%',
  },
  visibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 70,
  },
  visibilityText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  feedbackLink: {
    paddingVertical: 15,
  },
  feedbackText: {
    fontSize: 16,
    color: '#8A2BE2',
  }
});