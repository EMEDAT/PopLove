// components/onboarding/SchoolSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  Switch
} from 'react-native';

interface SchoolSelectionProps {
  school: string;
  onSchoolChange: (school: string) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function SchoolSelection({ 
  school,
  onSchoolChange,
  visibleOnProfile = true,
  onToggleVisibility = () => {}
}: SchoolSelectionProps) {
  const [isVisible, setIsVisible] = useState(visibleOnProfile);

  const handleVisibilityToggle = (value: boolean) => {
    setIsVisible(value);
    onToggleVisibility(value);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where did you go to school?</Text>
      
      <TextInput
        style={styles.input}
        value={school}
        onChangeText={onSchoolChange}
        placeholder="Add a school"
        placeholderTextColor="#999"
      />
      
      <View style={styles.visibilityContainer}>
        <Text style={styles.visibilityText}>Visible on profile</Text>
        <Switch
          value={isVisible}
          onValueChange={handleVisibilityToggle}
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F1ED',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    color: '#161616',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#777',
    fontSize: 16,
    paddingVertical: 8,
    color: '#333',
  },
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 336,
    paddingVertical: 10,
  },
  visibilityText: {
    fontSize: 16,
    color: '#161616',
    fontWeight: '500',
  }
});