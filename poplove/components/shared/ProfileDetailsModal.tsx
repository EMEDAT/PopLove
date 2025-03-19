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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { BlurView } from 'expo-blur';
import VibeCheck from './VibeCheck';
import { SubscriptionGate } from './SubscriptionGate';
import ProfileMediaGallery from '../profile/ProfileMediaGallery';

const { width } = Dimensions.get('window');

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
  const ageRange = profile.ageRange || '';
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
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
        
        <ScrollView style={styles.scrollView}>
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.profileImage} />
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
                    <Text style={styles.distanceText}>{profile.distance}km</Text>
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
                <Ionicons name="location-outline" size={28} color="#737373" />
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
                key={`gallery-${profile.id}`} // Add this key prop
              />
            )}
          </View>
          
          {/* Extra padding at bottom */}
          <View style={{ height: 10 }} />
        </ScrollView>
        
        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={secondaryButton?.onPress}
          >
            <Image 
              source={require('../../assets/images/main/LoveError.png')} 
              style={styles.actionIcon}
              resizeMode="contain"
            />
            <Text style={styles.actionText}>Pop Balloon</Text>
          </TouchableOpacity>
          
          <SubscriptionGate 
            requiredTier="premium" 
            featureName="Find Love"
            onClose={() => {}}
          >
            <TouchableOpacity 
              style={styles.acceptButton}
              onPress={() => {
                // Instead of the direct action, show the vibe check
                setVibeCheckVisible(true);
              }}
            >
              <Image 
                source={require('../../assets/images/main/LoveSuccess.png')} 
                style={styles.actionIcon}
                resizeMode="contain"
              />
              <Text style={styles.actionText}>Find Love</Text>
            </TouchableOpacity>
          </SubscriptionGate>
        </View>
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 15,
    paddingBottom: 0
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    padding: 20,
    alignItems: 'center',
  },
  profileImage: {
    width: width - 40,
    height: 350,
    borderRadius: 20,
  },
  placeholderImage: {
    width: width - 40,
    height: 400,
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
    fontWeight: 500,
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
    bottom: 50,
    left: '40%',
    transform: [{ translateX: -70 }], // Adjust based on actual width
    backgroundColor: 'white',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3, // For Android shadow
  },  
  rejectButton: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  acceptButton: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  actionIcon: {
    width: 35, 
    height: 35,
  },
  actionText: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '500',
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
  moreButton: {
    padding: 5,
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    backgroundColor: 'rgba(0,0,0,0.5)',
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