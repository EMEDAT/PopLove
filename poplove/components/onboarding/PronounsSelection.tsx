import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';

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
  // Convert string to array if needed
  const initialValue = Array.isArray(selectedPronouns) ? 
    selectedPronouns : 
    (typeof selectedPronouns === 'string' ? 
      selectedPronouns.split('/') : 
      []);
      
  const [localPronouns, setLocalPronouns] = useState<string[]>(initialValue);
  
  // Initialize once on mount
  useEffect(() => {
    console.log("INITIAL SET:", selectedPronouns);
    setLocalPronouns(selectedPronouns || []);
  }, []);
  
  // Log when props change
  useEffect(() => {
    console.log("PROPS CHANGED:", { 
      selectedPronouns, 
      visibleOnProfile,
      localPronouns
    });
  }, [selectedPronouns, visibleOnProfile]);

  const handleToggle = (pronoun: string) => {
    console.log("TOGGLE:", { 
      pronoun, 
      current: localPronouns,
      selectedPronouns
    });
    
    let updated: string[];
    
    if (localPronouns.includes(pronoun)) {
      console.log("REMOVING pronoun");
      updated = localPronouns.filter(p => p !== pronoun);
    } else if (localPronouns.length < 4) {
      console.log("ADDING pronoun");
      updated = [...localPronouns, pronoun];
    } else {
      console.log("MAX REACHED");
      Alert.alert("Maximum Reached", "You can only select up to 4 pronouns");
      return;
    }
    
    console.log("UPDATED local to:", updated);
    setLocalPronouns(updated);
    
    console.log("CALLING parent callback with:", updated);
    onSelectPronouns(updated);
  };

  const handleVisibilityChange = (value: boolean) => {
    console.log("VISIBILITY TOGGLE:", { 
      from: visibleOnProfile, 
      to: value,
      currentPronouns: localPronouns
    });
    
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Component JSX remains the same */}
      <Text style={styles.title}>What are your pronouns?</Text>
      <Text style={styles.subtitle}>Select up to 4</Text>
      
      {["she", "her", "hers", "he", "him"].map((pronoun, i) => (
        <View key={pronoun}>
          <TouchableOpacity 
            style={styles.row} 
            onPress={() => handleToggle(pronoun)}
            activeOpacity={0.7}
          >
            <Text style={styles.text}>{pronoun}</Text>
            <View style={[
              styles.checkbox, 
              localPronouns.includes(pronoun) && styles.checked
            ]}>
              {localPronouns.includes(pronoun) && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
        </View>
      ))}
      
      <View style={styles.optionRow}>
        <Text style={styles.optionText}>Visible on profile</Text>
        <Switch 
          value={visibleOnProfile} 
          onValueChange={handleVisibilityChange}
          trackColor={{ false: '#E5E5E5', true: '#0080FF' }}
        />
      </View>
      
      <TouchableOpacity style={styles.feedback}>
        <Text style={styles.feedbackText}>Feedback on pronouns?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 24 },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    height: 56,
  },
  text: { fontSize: 16 },
  checkbox: {
    width: 24, 
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checked: {
    backgroundColor: '#0080FF',
    borderColor: '#0080FF'
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
    fontSize: 16
  },
  feedback: {
    marginTop: 16
  },
  feedbackText: {
    color: '#0080FF',
    fontSize: 16
  }
});