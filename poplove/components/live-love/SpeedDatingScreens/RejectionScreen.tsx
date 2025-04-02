// components/live-love/SpeedDatingScreens/RejectionScreen.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  KeyboardAvoidingView, 
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  TextInput,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Match } from '../SpeedDatingMode';

interface RejectionScreenProps {
  match: Match | null;
  onSubmitReason: (reason: string, feedbackData?: any) => void;
  onBack: () => void;
}

export default function RejectionScreen({ 
  match, 
  onSubmitReason, 
  onBack 
}: RejectionScreenProps) {
  const [reason, setReason] = useState<string>('');
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReview, setCustomReview] = useState<string>('');
  
  // Common rejection reasons
  const commonReasons = [
    'No spark in conversation',
    'Different conversation interests',
    'Communication style mismatch',
    'Not my type',
    "Didn't feel a connection",
    'Looking for someone different',
  ];
  
  if (!match) return null;
  
  // Handle reason selection
  const handleReasonSelect = (selectedText: string) => {
    setSelectedReason(selectedText);
    setReason(selectedText);
  };
  
  // Handle submission
  const handleSubmit = () => {
    // Prepare a structured feedback object
    const rejectionFeedback = {
      selectedReason: selectedReason,
      customReview: customReview.trim(),
      timestamp: new Date().toISOString(),
      matchPercentage: match?.matchPercentage || 0
    };
    
    // Combine text for the direct submission
    let finalReason = selectedReason || '';
    if (customReview.trim()) {
      finalReason += finalReason ? ` - ${customReview.trim()}` : customReview.trim();
    }
    
    // Pass both the text and structured data to parent
    onSubmitReason(finalReason || 'No reason provided', rejectionFeedback);
  };
  
  // Find next match
  const handleFindNext = () => {
    handleSubmit();
    // Additional logic for finding next match
  };
  
  return (
    <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView 
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.content}>
        <View style={styles.profileContainer}>
          <Image 
            source={{ uri: match.photoURL }} 
            style={styles.profileImage}
            resizeMode="cover"
          />
          <View style={styles.xIcon}>
            <Ionicons name="close" size={50} color="white" />
          </View>
        </View>
        
        <Text style={styles.rejectionTitle}>
          You have rejected {match.displayName.split(' ')[0]}
        </Text>
        
        {/* Reason Chips - Arranged with 2 per row */}
        <View style={styles.reasonChipsContainer}>
          {commonReasons.map((text) => (
            <TouchableOpacity
              key={text}
              style={[
                styles.reasonChip,
                selectedReason === text && styles.selectedReasonChip
              ]}
              onPress={() => handleReasonSelect(text)}
            >
              <Text 
                style={[
                  styles.reasonChipText,
                  selectedReason === text && styles.selectedReasonChipText
                ]}
              >
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.customReviewContainer}>
          <TextInput
            style={styles.customReviewInput}
            placeholder="Add your personal feedback here..."
            value={customReview}
            onChangeText={setCustomReview}
            multiline
            maxLength={200}
          />
        </View>
        
        {/* Linear Gradient Button */}
        <TouchableOpacity 
          style={styles.sendFeedbackButton}
          onPress={handleSubmit}
        >
        <LinearGradient
          colors={['#EC5F61', '#F0B433']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
            <Text style={styles.sendFeedbackText}>Send Feedback</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Find Next Match Button */}
        <TouchableOpacity 
          style={styles.findNextButton}
          onPress={handleFindNext}
        >
          <LinearGradient
            colors={['#FFF', '#FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradientButton, styles.findNextGradient]}
          >
            <Text style={styles.findNextText}>Find Next Match</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={() => onSubmitReason('No reason provided')}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
    marginLeft: -20,
    marginRight: -20,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    paddingBottom: 40, // Add extra padding at the bottom
  },
  profileContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    borderRadius: 50,
    marginBottom: 15,
    marginTop: 30,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  xIcon: {
    position: 'absolute',
    top: 85,
    left: 85,
    width: 60,
    height: 60,
    borderRadius: 35,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 25,
    textAlign: 'center',
  },
  reasonChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  reasonChip: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    width: '48%', // Set to slightly less than 50% to account for spacing
    justifyContent: 'center', // Add this to center text vertically
    alignItems: 'flex-start', // Add this to center text horizontally
    height: 45, // Set a fixed height for consistent sizing
  },
  selectedReasonChip: {
    backgroundColor: '#FFE4E4',
    borderColor: '#FF6B6B',
  },
  reasonChipText: {
    color: '#333',
    fontSize: 10,
  },
  selectedReasonChipText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  customReviewContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 20,
  },
  customReviewInput: {
    width: '100%',
    height: 120, // Slightly reduced height to give more space
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    textAlignVertical: 'top',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  sendFeedbackButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findNextButton: {
    width: '100%',
    height: 40,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findNextGradient: {
    backgroundColor: 'transparent',
  },
  sendFeedbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  findNextText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -30, // Add negative margin to move it up towards the Find Next button
    marginBottom: 15,
  },
  skipButton: {
    padding: 10,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 12,
  }
});