// components/shared/ProfileDetailsModal.tsx
import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

interface ProfileDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  profile: any;
  vibePercentage?: number;
  actionButton?: {
    text: string;
    onPress: () => void;
    color?: string[];
    textColor?: string;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
    color?: string;
    textColor?: string;
  };
}

export function ProfileDetailsModal({ 
  visible, 
  onClose, 
  profile, 
  vibePercentage,
  actionButton,
  secondaryButton
}: ProfileDetailsModalProps) {
  if (!profile) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header with close button */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Profile Image */}
            <View style={styles.modalImageContainer}>
              {profile.photoURL ? (
                <Image 
                  source={{ uri: profile.photoURL }} 
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.modalNoPhotoContainer}>
                  <Ionicons name="person" size={60} color="#CCCCCC" />
                </View>
              )}
            </View>
            
            {/* Profile Details */}
            <View style={styles.modalProfileInfo}>
              <Text style={styles.modalProfileName}>
                {profile.displayName}, {profile.ageRange}
              </Text>
              
              {profile.location && (
                <View style={styles.modalLocationContainer}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.modalLocationText}>
                    {profile.location}
                  </Text>
                </View>
              )}
              
              {profile.bio && (
                <Text style={styles.modalBio}>{profile.bio}</Text>
              )}
              
              {/* Vibe Check if provided */}
              {vibePercentage !== undefined && (
                <View style={styles.vibeContainer}>
                  <Text style={styles.vibeTitle}>Vibe Check</Text>
                  
                  <View style={styles.vibeBarContainer}>
                    <View style={[styles.vibeBar, { width: `${vibePercentage}%` }]}>
                      <LinearGradient
                        colors={['#F0B433', '#EC5F61']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.vibeGradient}
                      />
                    </View>
                    <Text style={styles.vibePercentage}>{vibePercentage}%</Text>
                  </View>
                </View>
              )}
              
              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.modalInterestsContainer}>
                  <Text style={styles.interestsTitle}>Interests</Text>
                  <View style={styles.interestTags}>
                    {profile.interests.map((interest: string, index: number) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestTagText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
          
          {/* Action Buttons */}
          {(actionButton || secondaryButton) && (
            <View style={styles.actionButtons}>
              {secondaryButton && (
                <TouchableOpacity 
                  style={[
                    styles.secondaryButton,
                    { 
                      backgroundColor: secondaryButton.color || '#F0F0F0',
                    }
                  ]}
                  onPress={secondaryButton.onPress}
                >
                  <Text style={[
                    styles.secondaryButtonText,
                    { color: secondaryButton.textColor || '#666' }
                  ]}>
                    {secondaryButton.text}
                  </Text>
                </TouchableOpacity>
              )}
              
              {actionButton && (
                <TouchableOpacity 
                  style={[
                    styles.actionButton,
                    secondaryButton ? { flex: 1 } : { width: '100%' }
                  ]}
                  onPress={actionButton.onPress}
                >
                <LinearGradient
                colors={actionButton.color && Array.isArray(actionButton.color) ? 
                    actionButton.color.length >= 2 ? 
                    actionButton.color as [string, string, ...string[]] : 
                    ['#F0B433', '#EC5F61'] 
                    : 
                    ['#F0B433', '#EC5F61']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButtonGradient}
                >
                    <Text style={[
                      styles.actionButtonText, 
                      { color: actionButton.textColor || 'white' }
                    ]}>
                      {actionButton.text}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.9,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeButton: {
    padding: 5,
  },
  modalImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalNoPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProfileInfo: {
    marginBottom: 20,
  },
  modalProfileName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalLocationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  modalBio: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 22,
  },
  vibeContainer: {
    marginBottom: 20,
  },
  vibeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  vibeBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vibeBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
    flex: 1,
    marginRight: 10,
  },
  vibeGradient: {
    height: '100%',
    width: '100%',
  },
  vibePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalInterestsContainer: {
    marginBottom: 20,
  },
  interestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestTagText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  secondaryButton: {
    width: '45%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});