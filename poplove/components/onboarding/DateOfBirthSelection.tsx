// components/onboarding/DateOfBirthSelection.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface DateOfBirthSelectionProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  age: string;
  ageRange: string;
  onSelectAgeRange: (range: string) => void;
}

export default function DateOfBirthSelection({ 
  selectedDate, 
  onSelectDate,
  age,
  ageRange,
  onSelectAgeRange
}: DateOfBirthSelectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  
  const ageRanges = [
    '18 to 24',
    '25 to 29',
    '30 to 34',
    '35 to 44',
    '45 to 54',
    '55 or older'
  ];
  
  // Calculate min/max dates (18-100 years old)
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);
  
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  
  // Calculate age from date
  const calculateAge = (birthdate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const m = today.getMonth() - birthdate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
      age--;
    }
    return age;
  };
  
  // Determine matching age range
  const getMatchingAgeRange = (age: number): string => {
    if (age <= 24) return '18 to 24';
    if (age <= 29) return '25 to 29';
    if (age <= 34) return '30 to 34';
    if (age <= 44) return '35 to 44';
    if (age <= 54) return '45 to 54';
    return '55 or older';
  };
  
  // Update age when date changes
  useEffect(() => {
    if (selectedDate) {
      const newAge = calculateAge(selectedDate);
      setCalculatedAge(newAge);
      
      // Auto-select matching range if none selected
      if (!ageRange) {
        const matchingRange = getMatchingAgeRange(newAge);
        onSelectAgeRange(matchingRange);
      }
    }
  }, [selectedDate]);
  
  const onChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowPicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      onSelectDate(currentDate);
    }
  };

  const showDatepicker = () => {
    setShowPicker(true);
  };

  const displayDate = selectedDate 
    ? selectedDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Select your birth date';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What's your date of birth?</Text>
      <Text style={styles.subtitle}>You must be at least 18 years old to use PopLove</Text>
      
      <TouchableOpacity 
        style={styles.dateSelector} 
        onPress={showDatepicker}
      >
        <Text style={[
          styles.dateText,
          !selectedDate && styles.placeholderText
        ]}>
          {displayDate}
        </Text>
        <Ionicons name="calendar-outline" size={24} color="#666" />
      </TouchableOpacity>
      
      {calculatedAge !== null && (
        <View style={styles.ageDisplay}>
          <Text style={styles.ageText}>You are {calculatedAge} years old</Text>
        </View>
      )}
      
      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedDate || maxDate}
          mode="date"
          display="default"
          onChange={onChange}
          maximumDate={maxDate}
          minimumDate={minDate}
        />
      )}
      
      {calculatedAge !== null && (
        <>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F6F2',
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#aaa',
  },
  ageDisplay: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  ageText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FF6B6B',
  },
  rangeTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 15,
  },
  optionsContainer: {
    width: '100%',
    gap: 13,
  },
  optionButton: {
    width: '100%',
    height: 50,
    borderRadius: 28,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  },
  suggestedOptionText: {
    color: '#FF6B6B',
    fontWeight: '600',
  }
});