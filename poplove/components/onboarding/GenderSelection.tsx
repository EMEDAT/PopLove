// components/onboarding/GenderSelection.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import SexualitySelection from './SexualitySelection';

interface GenderSelectionProps {
  selectedGender: string;
  onSelectGender: (gender: string) => void;
  sexuality?: string;
  onSelectSexuality?: (sexuality: string) => void;
  sexualityVisible?: boolean;
  onToggleSexualityVisibility?: (visible: boolean) => void;
}

export default function GenderSelection({ 
  selectedGender, 
  onSelectGender,
  sexuality = '',
  onSelectSexuality = () => {},
  sexualityVisible = true,
  onToggleSexualityVisibility = () => {}
}: GenderSelectionProps) {
  const { user } = useAuthContext();
  const [showSexualityPage, setShowSexualityPage] = useState(false);
  
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

  const navigateToSexuality = () => {
    setShowSexualityPage(true);
  };

  const handleBackFromSexuality = () => {
    setShowSexualityPage(false);
  };

  // If sexuality page is shown, render it
  if (showSexualityPage) {
    return (
      <SexualitySelection
        selectedSexuality={sexuality}
        onSelectSexuality={onSelectSexuality}
        visibleOnProfile={sexualityVisible}
        onToggleVisibility={onToggleSexualityVisibility}
        onBack={handleBackFromSexuality}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which gender best describes you?</Text>
      <Text style={styles.subtitle}>
        We match daters using 3 broad gender groups.
        You can add more about your gender later.
      </Text>
      
      <View style={styles.optionsContainer}>
        <View>
          <TouchableOpacity
            onPress={() => handleSelectGender('male')}
            style={[
              styles.optionButton,
              selectedGender === 'male' && styles.selectedOptionButton
            ]}
            testID="male-option"
          >
            <Text style={styles.optionText}>Man</Text>
            <View style={[
              styles.radioCircle,
              selectedGender === 'male' && styles.selectedRadioCircle
            ]}>
              {selectedGender === 'male' && (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientDot}
                />
              )}
            </View>
          </TouchableOpacity>
          {selectedGender === 'male' && (
            <TouchableOpacity
              onPress={navigateToSexuality}
              style={styles.identityButton}
              testID="identity-option-male"
            >
              <Text style={styles.identityText}>Add your gender identity <Text style={styles.arrowIcon}>›</Text></Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View>
          <TouchableOpacity
            onPress={() => handleSelectGender('female')}
            style={[
              styles.optionButton,
              selectedGender === 'female' && styles.selectedOptionButton
            ]}
            testID="female-option"
          >
            <Text style={styles.optionText}>Woman</Text>
            <View style={[
              styles.radioCircle,
              selectedGender === 'female' && styles.selectedRadioCircle
            ]}>
              {selectedGender === 'female' && (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientDot}
                />
              )}
            </View>
          </TouchableOpacity>
          {selectedGender === 'female' && (
            <TouchableOpacity
              onPress={navigateToSexuality}
              style={styles.identityButton}
              testID="identity-option-female"
            >
              <Text style={styles.identityText}>Add your gender identity <Text style={styles.arrowIcon}>›</Text></Text>
            </TouchableOpacity>
          )}
        </View>

        <View>
          <TouchableOpacity
            onPress={() => handleSelectGender('non-binary')}
            style={[
              styles.optionButton,
              selectedGender === 'non-binary' && styles.selectedOptionButton
            ]}
            testID="non-binary-option"
          >
            <Text style={styles.optionText}>Nonbinary</Text>
            <View style={[
              styles.radioCircle,
              selectedGender === 'non-binary' && styles.selectedRadioCircle
            ]}>
              {selectedGender === 'non-binary' && (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientDot}
                />
              )}
            </View>
          </TouchableOpacity>
          {selectedGender === 'non-binary' && (
            <TouchableOpacity
              onPress={navigateToSexuality}
              style={styles.identityButton}
              testID="identity-option-nonbinary"
            >
              <Text style={styles.identityText}>Add your gender identity <Text style={styles.arrowIcon}>›</Text></Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.visibilityRow}
          activeOpacity={0.7}
        >
          <Ionicons name="eye-outline" size={20} color="#333" />
          <Text style={styles.visibilityText}>Always visible on profile</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 12,
    color: '#161616',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14,
    color: '#595959',
    marginBottom: 40,
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFAFA',
  },
  selectedOptionButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '500',
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
  identityButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: '#FFF5F5',
    borderColor: '#FF6B6B',
    borderWidth: 1,
    borderTopWidth: 0,
    marginTop: -20,
  },
  identityText: {
    fontSize: 14,
    color: '#8E44AD',
    fontWeight: '500',
  },
  arrowIcon: {
    fontSize: 18,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  visibilityText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
});