// components/onboarding/PronounsSelection.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Maintain compatibility with existing code
interface PronounsSelectionProps {
  selectedPronouns: string | string[];
  onSelectPronouns: (pronouns: string) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function PronounsSelection({ 
  selectedPronouns = [], 
  onSelectPronouns,
  visibleOnProfile = true,
  onToggleVisibility 
}: PronounsSelectionProps) {
  // Limited pronouns list as requested
  const PRONOUNS_LIST = ["she", "her", "hers", "he", "him"];
  
  // Convert string to array if needed
  const parsePronouns = (): string[] => {
    const validPronouns = PRONOUNS_LIST;
    
    if (!selectedPronouns) return [];
    
    if (Array.isArray(selectedPronouns)) {
      return selectedPronouns
        .filter(p => typeof p === 'string')
        .map(p => p.toLowerCase())
        .filter(p => validPronouns.includes(p))
        .slice(0, 4);
    }
    
    if (typeof selectedPronouns === 'string') {
      // Handle pre-defined options
      if (selectedPronouns === 'He/Him') return ['he', 'him'];
      if (selectedPronouns === 'She/Her') return ['she', 'her'];
      if (selectedPronouns === 'They/Them') return [];
      if (selectedPronouns === 'He/They') return ['he'];
      if (selectedPronouns === 'She/They') return ['she'];
      
      // Try to parse the string
      return selectedPronouns
        .split('/')
        .map(p => p.trim().toLowerCase())
        .filter(p => validPronouns.includes(p))
        .slice(0, 4);
    }
    
    return [];
  };
      
  const [localPronouns, setLocalPronouns] = useState<string[]>(parsePronouns());
  // Track visibility locally to ensure the switch works properly
  const [isVisible, setIsVisible] = useState<boolean>(visibleOnProfile !== false);
  
  // Initialize once on mount to handle existing data
  useEffect(() => {
    setLocalPronouns(parsePronouns());
  }, []);

  // Update local visibility state when prop changes
  useEffect(() => {
    setIsVisible(visibleOnProfile !== false);
  }, [visibleOnProfile]);

  // Toggle pronoun selection
  const handleToggle = (pronoun: string) => {
    let updated: string[];
    
    if (localPronouns.includes(pronoun)) {
      updated = localPronouns.filter(p => p !== pronoun);
    } else if (localPronouns.length < 4) {
      updated = [...localPronouns, pronoun];
    } else {
      Alert.alert("Maximum Reached", "You can only select up to 4 pronouns");
      return;
    }
    
    setLocalPronouns(updated);
    
    // Format for parent component
    const pronounString = formatForParent(updated);
    onSelectPronouns(pronounString);
  };

  // Format pronouns for parent component
  const formatForParent = (pronouns: string[]): string => {
    if (pronouns.length === 0) return 'Prefer not to say';
    
    // Check common combinations
    const hasHe = pronouns.includes('he');
    const hasHim = pronouns.includes('him');
    const hasShe = pronouns.includes('she');
    const hasHer = pronouns.includes('her');
    
    if (hasHe && hasHim && pronouns.length === 2) return 'He/Him';
    if (hasShe && hasHer && pronouns.length === 2) return 'She/Her';
    
    // Custom format
    return pronouns.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('/');
  };

  // Handle visibility toggle
  const handleVisibilityChange = (value: boolean) => {
    // Update local state first for immediate UI feedback
    setIsVisible(value);
    
    // Then call parent callback if provided
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Select up to 4</Text>
      
      {PRONOUNS_LIST.map((pronoun, i) => (
        <View key={pronoun}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => handleToggle(pronoun)}
            activeOpacity={0.7}
          >
            <Text style={styles.text}>{pronoun}</Text>
            {localPronouns.includes(pronoun) ? (
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
        <Text style={styles.feedbackText}>Feedback on pronouns?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20 
  },
  title: { 
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#161616',
  },
  subtitle: { 
    fontSize: 16, 
    color: '#888', 
    marginBottom: 24 
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
    marginTop: 20,
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