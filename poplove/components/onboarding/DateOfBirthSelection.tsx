import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Platform,
  Modal
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface DateOfBirthSelectionProps {
    selectedDate: Date | { seconds: number, nanoseconds: number } | null;
  onSelectDate: (date: Date) => void;
  age: string;
  ageRange: string;
  onSelectAgeRange: (range: string) => void;
  onAgeConfirm?: (confirmed: boolean) => void;
}

export default function DateOfBirthSelection({ 
  selectedDate, 
  onSelectDate,
  age,
  ageRange,
  onSelectAgeRange,
  onAgeConfirm
}: DateOfBirthSelectionProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
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
      // Convert Timestamp to Date if needed
      const birthDate = selectedDate instanceof Date 
      ? selectedDate 
      : typeof selectedDate === 'object' && 'seconds' in selectedDate
        ? new Date(selectedDate.seconds * 1000)
        : new Date(selectedDate);
      
      const newAge = calculateAge(birthDate);
      setCalculatedAge(newAge);
      
      // Rest of the existing logic
      if (!ageRange) {
        const matchingRange = getMatchingAgeRange(newAge);
        onSelectAgeRange(matchingRange);
      }
      
      setShowConfirmModal(true);
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

  const handleConfirmAge = () => {
    setShowConfirmModal(false);
    onAgeConfirm && onAgeConfirm(true);
  };

  const displayDate = selectedDate 
  ? (selectedDate instanceof Date 
      ? selectedDate.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
      : typeof selectedDate === 'object' && 'seconds' in selectedDate
        ? new Date(selectedDate.seconds * 1000).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })
        : new Date(selectedDate).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }))
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
      
      {showPicker && (
        <DateTimePicker
            testID="dateTimePicker"
            value={
            selectedDate 
                ? (selectedDate instanceof Date 
                    ? selectedDate 
                    : typeof selectedDate === 'object' && 'seconds' in selectedDate
                    ? new Date(selectedDate.seconds * 1000)
                    : maxDate)
                : maxDate
            }
            mode="date"
            display="default"
            onChange={onChange}
            maximumDate={maxDate}
            minimumDate={minDate}
        />
        )}

        {/* Confirmation Modal */}
        <Modal
            visible={showConfirmModal}
            transparent={true}
            animationType="slide"
            >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                <Text style={styles.ageText}>You're {calculatedAge}</Text>
                <Text style={styles.birthdateText}>Born {displayDate}</Text>
                <Text style={styles.subtitleText}>
                    Confirm your age is correct. Let's keep our community authentic.
                </Text>
                <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={handleConfirmAge}
                >
                    <LinearGradient
                    colors={['#EC5F61', '#F0B433']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.confirmButtonGradient}
                    >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                    </LinearGradient>
                </TouchableOpacity>
                </View>
            </View>
            </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  ageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  birthdateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
  },
  subtitleText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});