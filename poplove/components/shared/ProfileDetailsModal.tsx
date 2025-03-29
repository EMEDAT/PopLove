// components/shared/ProfileDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { BlurView } from 'expo-blur';
import VibeCheck from './VibeCheck';
import { SubscriptionGate } from './SubscriptionGate';
import ProfileMediaGallery from '../profile/ProfileMediaGallery';

const { width, height } = Dimensions.get('window');

// Simple version with minimal complexity and no TypeScript
export function ProfileDetailsModal(props) {
  const { visible, onClose, profile: initialProfile, actionButton, secondaryButton } = props;
  
  // Simple state for expanded sections
  const [expandedSection, setExpandedSection] = useState(null);
  // Basic profile state initialized once
  const [profile, setProfile] = useState(initialProfile || {});

  const [vibeCheckVisible, setVibeCheckVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      // Reset expanded section when modal closes
      setExpandedSection(null);
    }
  }, [visible]);
  
  // Effect to load data only when the profile ID changes
  useEffect(() => {
    if (initialProfile?.id) {
      // Start with initial data
      setProfile(initialProfile);
      
      // Fetch profile data
      const fetchProfileData = async () => {
        try {
          // Load user profile
          const userDoc = await getDoc(doc(firestore, 'users', initialProfile.id));
          if (userDoc.exists()) {
            setProfile(prev => ({
              ...prev,
              ...userDoc.data()
            }));
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      };
      
      fetchProfileData();
    }
  }, [initialProfile?.id]);
  
  // Close modal handler - ensure this is working
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  // Only render if we have a profile
  if (!profile) return null;
  
  // Function to toggle expandable sections
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  // Common helper to render section content
  const renderSectionContent = (content) => {
    if (!content) return <Text style={styles.notSpecifiedText}>Not specified</Text>;
    return <Text style={styles.sectionContent}>{content}</Text>;
  };
  
  // Extract key data with fallbacks
  const photoURL = profile.photoURL;
  const displayName = profile.displayName || 'User';
  const age = profile.age || '';
  const ethnicity = profile.ethnicity;
  const pronouns = profile.pronouns;
  const hasChildren = profile.hasChildren;
  const location = profile.location;
  const bio = profile.bio;
  const height = profile.height;
  
  // Extract interests
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  // Extract lifestyle
  const lifestyle = Array.isArray(profile.lifestyle) 
    ? profile.lifestyle.join(', ') 
    : (typeof profile.lifestyle === 'string' ? profile.lifestyle : '');
  
  // Extract prompts
  const prompts = Array.isArray(profile.prompts) ? profile.prompts : [];
  const strengthPrompt = prompts.find(p => p?.question?.toLowerCase().includes('strength'));
  const fearPrompt = prompts.find(p => p?.question?.toLowerCase().includes('fear'));
  const datingPrompt = prompts.find(p => p?.question?.toLowerCase().includes('dating'));

  // Handle action button clicks
  const handleRejectPress = () => {
    if (secondaryButton?.onPress && typeof secondaryButton.onPress === 'function') {
      secondaryButton.onPress();
    } else {
      console.log("Pop Balloon button pressed, but no handler provided");
      handleClose(); // Fallback to close if no handler
    }
  };

  const handleLovePress = () => {
    setVibeCheckVisible(true);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton} accessible={true} accessibilityLabel="Close profile">
              <View style={styles.iconCircle}>
                <Ionicons name="chevron-back" size={24} color="#344054" />
              </View>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Details</Text>
            <TouchableOpacity style={styles.moreButton}>
              <View style={styles.iconCircle}>
                <Ionicons name="ellipsis-vertical" size={24} color="#344054" />
              </View>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Image */}
            <View style={styles.imageContainer}>
              {photoURL ? (
                <Image 
                  source={{ uri: photoURL }} 
                  style={styles.profileImage} 
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person" size={60} color="#ccc" />
                </View>
              )}
              
              {/* Distance Indicator */}
              {location && (
                <View style={styles.distanceIndicator}>
                  <BlurView intensity={60} tint="light" style={styles.blur}>
                    <View style={styles.distanceContent}>
                      <Ionicons name="location-outline" size={10} color="white" />
                      <Text style={styles.distanceText}>{profile.distance || '14'}km</Text>
                    </View>
                  </BlurView>
                </View>
              )}
            </View>
            
            {/* Basic Info */}
            <View style={styles.infoSection}>
              <Text style={styles.displayName}>{displayName}{age ? `, ${age}` : ''}</Text>
              
              {location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={18} color="#737373" />
                  <Text style={styles.locationText}>{location}</Text>
                </View>
              )}
            </View>
            
            {/* Bio Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              {renderSectionContent(bio)}
            </View>

            {/* Pronouns Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pronouns</Text>
              {renderSectionContent(pronouns || 'Not specified')}
            </View>

            {/* Height Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Height</Text>
              {renderSectionContent(height ? `${height} cm` : 'Not specified')}
            </View>

            {/* Ethnicity Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ethnicity</Text>
              {renderSectionContent(ethnicity || 'Not specified')}
            </View>

            {/* Children Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Children</Text>
              {renderSectionContent(hasChildren || 'Not specified')}
            </View>

            {/* Profession Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profession</Text>
              {renderSectionContent(profile.profession || 'Not specified')}
            </View>

            {/* Strength Section */}
            <TouchableOpacity 
              style={styles.expandableSection}
              onPress={() => toggleSection('strength')}
            >
              <View style={styles.expandableHeader}>
                <Text style={styles.expandableTitle}>My greatest strength?</Text>
                <Ionicons 
                  name={expandedSection === 'strength' ? 'chevron-down' : 'chevron-forward'} 
                  size={20} 
                  color="#666" 
                />
              </View>
              
              {expandedSection === 'strength' && (
                <View style={styles.expandedContent}>
                  {renderSectionContent(strengthPrompt?.answer)}
                </View>
              )}
            </TouchableOpacity>

            {/* Fear Section */}
            <TouchableOpacity 
              style={styles.expandableSection}
              onPress={() => toggleSection('fear')}
            >
              <View style={styles.expandableHeader}>
                <Text style={styles.expandableTitle}>My most irrational fear?</Text>
                <Ionicons 
                  name={expandedSection === 'fear' ? 'chevron-down' : 'chevron-forward'} 
                  size={20} 
                  color="#666" 
                />
              </View>
              
              {expandedSection === 'fear' && (
                <View style={styles.expandedContent}>
                  {renderSectionContent(fearPrompt?.answer)}
                </View>
              )}
            </TouchableOpacity>
            
            {/* Dating Section */}
            <TouchableOpacity 
              style={styles.expandableSection}
              onPress={() => toggleSection('dating')}
            >
              <View style={styles.expandableHeader}>
                <Text style={styles.expandableTitle}>Dating me is like?</Text>
                <Ionicons 
                  name={expandedSection === 'dating' ? 'chevron-down' : 'chevron-forward'} 
                  size={20} 
                  color="#666" 
                />
              </View>
              
              {expandedSection === 'dating' && (
                <View style={styles.expandedContent}>
                  {renderSectionContent(datingPrompt?.answer)}
                </View>
              )}
            </TouchableOpacity>
            
            {/* Lifestyle Section */}
            <View style={styles.sectionNext}>
              <Text style={styles.sectionTitle}>Expectations and Lifestyle</Text>
              {renderSectionContent(lifestyle)}
            </View>
            
            {/* Interests Section */}
            <View style={styles.sectionNext}>
              <Text style={styles.sectionTitle}>Interests</Text>
              {interests.length > 0 ? (
                <View style={styles.interestContainer}>
                  {interests.map((interest, index) => (
                    <View key={index} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.notSpecifiedText}>Not specified</Text>
              )}
            </View>
            
            {/* Gallery Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              {profile.id && (
                <ProfileMediaGallery 
                  userId={profile.id} 
                  profilePhoto={profile.photoURL}
                  key={`gallery-${profile.id}`}
                />
              )}
            </View>
            
            {/* Extra padding at bottom to ensure scrolling past buttons */}
            <View style={{ height: 160 }} />
          </ScrollView>
        </View>
        
        {/* Action Buttons - Fixed at bottom */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={handleRejectPress}
            accessible={true}
            accessibilityLabel="Pop Balloon"
          >
            <Image 
              source={require('../../assets/images/main/LoveError.png')} 
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionText}>Pop Balloon</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={handleLovePress}
            accessible={true}
            accessibilityLabel="Find Love"
          >
            <Image 
              source={require('../../assets/images/main/LoveSuccess.png')} 
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionText}>Find Love</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* VibeCheck Component */}
      <VibeCheck
        visible={vibeCheckVisible}
        onClose={() => setVibeCheckVisible(false)}
        profile={profile}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  profileImage: {
    width: width - 40,
    height: 350,
    borderRadius: 20,
  },
  placeholderImage: {
    width: width - 40,
    height: 350,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  sectionNext: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  notSpecifiedText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  expandableSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandableTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expandedContent: {
    marginTop: 10,
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderColor: '#D0D5DD',
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  interestText: {
    fontSize: 12,
    color: '#667185',
  },
  actionContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    zIndex: 999,
  },  
  rejectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  acceptButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionIcon: {
    width: 50, 
    height: 50,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  iconCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#344054',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    borderRadius: 10,
    overflow: 'hidden',
  },
  blur: {
    padding: 8,
    borderRadius: 15,
  },
  distanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: 'white',
    fontSize: 10,
    marginLeft: 2,
  },
});