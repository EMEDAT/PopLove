// Updated components/onboarding/GenderSelection.tsx 
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

interface GenderSelectionProps {
  selectedGender: string;
  onSelectGender: (gender: string) => void;
}
export default function GenderSelection({ selectedGender, onSelectGender }: GenderSelectionProps) {
  const { user } = useAuthContext();
  const handleSelectGender = (gender: string) => {
    console.log(`Gender selected: ${gender}`);
    
    // Store the gender in Firestore immediately after selection
    if (user && user.uid) {
      updateDoc(doc(firestore, 'users', user.uid), {
        gender: gender,
        updatedAt: serverTimestamp()
      }).catch(error => {
        console.error('Error updating gender:', error);
      });
    }
    
    // Call the parent handler
    onSelectGender(gender);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select your Gender</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          onPress={() => handleSelectGender('male')}
          style={styles.optionButton}
          testID="male-option"
        >
          <LinearGradient
            colors={selectedGender === 'male' ? ['#EC5F61', '#F0B433'] : ['#E6E9ED', '#E6E9ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={[
              styles.optionText,
              selectedGender === 'male' && styles.selectedOptionText
            ]}>
              Male
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => handleSelectGender('female')}
          style={styles.optionButton}
          testID="female-option"
        >
          <LinearGradient
            colors={selectedGender === 'female' ? ['#EC5F61', '#F0B433'] : ['#E5E5E5', '#E5E5E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={[
              styles.optionText,
              selectedGender === 'female' && styles.selectedOptionText
            ]}>
              Female
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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
    marginTop: 20,
    marginBottom: 30,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    width: '100%',
    height: 56,
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
  }
});