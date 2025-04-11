// components/shared/PrivateProfileDetailsModal.tsx
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
import ProfileMediaGallery from '../profile/ProfileMediaGallery';

const { width } = Dimensions.get('window');

export function PrivateProfileDetailsModal(props) {
  const { visible, onClose, profile: initialProfile, actionButton, secondaryButton } = props;
  
  // State for expanded sections and profile data
  const [expandedSection, setExpandedSection] = useState(null);
  const [profile, setProfile] = useState(initialProfile || {});
  const [vibeCheckVisible, setVibeCheckVisible] = useState(false);

  // Reset expanded sections when modal closes
  useEffect(() => {
    if (!visible) {
      setExpandedSection(null);
    }
  }, [visible]);
  
  // Fetch full profile data when profile ID changes
  useEffect(() => {
    if (initialProfile?.id) {
      // Start with initial data
      setProfile(initialProfile);
      
      // Fetch complete profile data
      const fetchProfileData = async () => {
        try {
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
  
  // Handle modal close
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  // Function to toggle expandable sections
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  // Check if a field is visible
  const isFieldVisible = (field, defaultValue = true) => {
    // Check if field has a visibility toggle
    const visibilityField = `${field}Visible`;
    
    // If visibility field exists in profile, use it, otherwise use default
    if (visibilityField in profile) {
      return profile[visibilityField] !== false;
    }
    
    return defaultValue;
  };
  
  // Helper to render section content with visibility check
  const renderSectionContent = (content, isVisible = true) => {
    if (!isVisible) {
      return <Text style={styles.hiddenText}>This information is hidden</Text>;
    }
    
    if (!content) {
      return <Text style={styles.notSpecifiedText}>Not specified</Text>;
    }
    
    return <Text style={styles.sectionContent}>{content}</Text>;
  };
  
  // Extract profile data with fallbacks
  const photoURL = profile.photoURL;
  const displayName = profile.displayName || 'User';
  const age = profile.age || '';
  const ethnicity = profile.ethnicity;
  const ethnicityVisible = isFieldVisible('ethnicity');
  const pronouns = profile.pronouns;
  const pronounsVisible = isFieldVisible('pronouns');
  const currentChildren = profile.currentChildren;
  const childrenVisible = isFieldVisible('children');
  const wantChildren = profile.wantChildren;
  const location = profile.location;
  const useExactAddress = profile.useExactAddress !== false; // Default to true if not specified
  const bio = profile.bio;
  const height = profile.height;
  
  // Work and education with visibility checks
  const workplace = profile.workplace;
  const workplaceVisible = isFieldVisible('workplace');
  const jobTitle = profile.jobTitle;
  const jobTitleVisible = isFieldVisible('jobTitle');
  const school = profile.school;
  const schoolVisible = isFieldVisible('school');
  const education = profile.education;
  const educationVisible = isFieldVisible('education', false); // Default false for education
  
  // Habits with visibility checks
  const drinking = profile.drinking;
  const drinkingVisible = isFieldVisible('drinking');
  const smoking = profile.smoking;
  const smokingVisible = isFieldVisible('smoking');
  const drugUsage = profile.drugUsage;
  const drugUsageVisible = isFieldVisible('drugUsage');
  
  // Beliefs with visibility checks
  const religiousBeliefs = profile.religiousBeliefs;
  const religiousBeliefsVisible = isFieldVisible('religiousBeliefs');
  const politicalBeliefs = profile.politicalBeliefs;
  const politicalBeliefsVisible = isFieldVisible('politicalBeliefs');
  
  // Dating preferences
  const datingPreferences = profile.datingPreferences || [];
  const datingPreferencesVisible = isFieldVisible('datingPreferences');
  
  // Extract interests
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  
  // Extract lifestyle
  const lifestyle = Array.isArray(profile.lifestyle) 
    ? profile.lifestyle.join(', ') 
    : (typeof profile.lifestyle === 'string' ? profile.lifestyle : '');
  
  const lifestyleVisible = isFieldVisible('lifestyle');
  
  // Extract relationshipType
  const relationshipType = profile.relationshipType;
  const relationshipTypeVisible = isFieldVisible('relationshipType');
  
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
            <Text style={styles.headerTitle}>Profile Details</Text>
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
              
              {/* Location - respect location privacy */}
              {location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={18} color="#737373" />
                  <Text style={styles.locationText}>
                    {/* Show either exact address or just city/country based on user preference */}
                    {useExactAddress ? location : location.split(',').slice(-2).join(',')}
                    {!useExactAddress && <Text style={styles.privacyNote}> · Approximate location</Text>}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Bio Section */}
            {bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                {renderSectionContent(bio)}
              </View>
            )}

            {/* Gender & Pronouns Section - merged */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gender & Pronouns</Text>
              <View style={styles.inlineDetailRow}>
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {profile.gender 
                      ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) 
                      : 'Not specified'}
                  </Text>
                </View>
                
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Pronouns</Text>
                  {pronounsVisible 
                    ? <Text style={styles.detailValue}>{pronouns || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
              </View>
            </View>

            {/* Physical Attributes Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Physical Attributes</Text>
              <View style={styles.inlineDetailRow}>
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Height</Text>
                  <Text style={styles.detailValue}>{height ? `${height} cm` : 'Not specified'}</Text>
                </View>
                
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Ethnicity</Text>
                  {ethnicityVisible 
                    ? <Text style={styles.detailValue}>{ethnicity || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
              </View>
            </View>

            {/* Family Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Family</Text>
              <View style={styles.inlineDetailRow}>
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Has Children</Text>
                  {childrenVisible 
                    ? <Text style={styles.detailValue}>{currentChildren || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
                
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Wants Children</Text>
                  {childrenVisible 
                    ? <Text style={styles.detailValue}>{wantChildren || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
              </View>
            </View>

            {/* Work & Education */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work & Education</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Workplace</Text>
                {workplaceVisible 
                  ? <Text style={styles.detailValue}>{workplace || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Job Title</Text>
                {jobTitleVisible 
                  ? <Text style={styles.detailValue}>{jobTitle || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>School</Text>
                {schoolVisible 
                  ? <Text style={styles.detailValue}>{school || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Education</Text>
                {educationVisible 
                  ? <Text style={styles.detailValue}>{education || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
            </View>

            {/* Lifestyle Habits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lifestyle Habits</Text>
              
              <View style={styles.inlineDetailRow}>
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Drinking</Text>
                  {drinkingVisible 
                    ? <Text style={styles.detailValue}>{drinking || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
                
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Smoking</Text>
                  {smokingVisible 
                    ? <Text style={styles.detailValue}>{smoking || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Drug Usage</Text>
                {drugUsageVisible 
                  ? <Text style={styles.detailValue}>{drugUsage || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
            </View>

            {/* Beliefs Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Beliefs</Text>
              
              <View style={styles.inlineDetailRow}>
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Religious Beliefs</Text>
                  {religiousBeliefsVisible 
                    ? <Text style={styles.detailValue}>{religiousBeliefs || 'Not specified'}
                    
</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
                
                <View style={styles.inlineDetail}>
                  <Text style={styles.detailLabel}>Political Beliefs</Text>
                  {politicalBeliefsVisible 
                    ? <Text style={styles.detailValue}>{politicalBeliefs || 'Not specified'}</Text>
                    : <Text style={styles.hiddenText}>Hidden</Text>}
                </View>
              </View>
            </View>

            {/* Dating Preferences Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dating Preferences</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Looking for</Text>
                {datingPreferencesVisible && datingPreferences.length > 0 
                  ? <Text style={styles.detailValue}>{datingPreferences.join(', ')}</Text>
                  : <Text style={datingPreferencesVisible ? styles.notSpecifiedText : styles.hiddenText}>
                      {datingPreferencesVisible ? 'Not specified' : 'Hidden'}
                    </Text>}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Relationship Type</Text>
                {relationshipTypeVisible 
                  ? <Text style={styles.detailValue}>{relationshipType || 'Not specified'}</Text>
                  : <Text style={styles.hiddenText}>Hidden</Text>}
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dating Intentions</Text>
                {lifestyleVisible && lifestyle 
                  ? <Text style={styles.detailValue}>{lifestyle}</Text>
                  : <Text style={lifestyleVisible ? styles.notSpecifiedText : styles.hiddenText}>
                      {lifestyleVisible ? 'Not specified' : 'Hidden'}
                    </Text>}
              </View>
            </View>
            
            {/* Prompts Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile Prompts</Text>
              
              {/* Strength Prompt */}
              {strengthPrompt ? (
                <TouchableOpacity 
                  style={styles.expandableSection}
                  onPress={() => toggleSection('strength')}
                >
                  <View style={styles.expandableHeader}>
                    <Text style={styles.expandableTitle}>{strengthPrompt.question}</Text>
                    <Ionicons 
                      name={expandedSection === 'strength' ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#666" 
                    />
                  </View>
                  
                  {expandedSection === 'strength' && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.promptAnswer}>{strengthPrompt.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
              
              {/* Fear Prompt */}
              {fearPrompt ? (
                <TouchableOpacity 
                  style={styles.expandableSection}
                  onPress={() => toggleSection('fear')}
                >
                  <View style={styles.expandableHeader}>
                    <Text style={styles.expandableTitle}>{fearPrompt.question}</Text>
                    <Ionicons 
                      name={expandedSection === 'fear' ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#666" 
                    />
                  </View>
                  
                  {expandedSection === 'fear' && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.promptAnswer}>{fearPrompt.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
              
              {/* Dating Prompt */}
              {datingPrompt ? (
                <TouchableOpacity 
                  style={styles.expandableSection}
                  onPress={() => toggleSection('dating')}
                >
                  <View style={styles.expandableHeader}>
                    <Text style={styles.expandableTitle}>{datingPrompt.question}</Text>
                    <Ionicons 
                      name={expandedSection === 'dating' ? 'chevron-down' : 'chevron-forward'} 
                      size={20} 
                      color="#666" 
                    />
                  </View>
                  
                  {expandedSection === 'dating' && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.promptAnswer}>{datingPrompt.answer}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
              
              {/* Show note if no prompts */}
              {!prompts.length && (
                <Text style={styles.notSpecifiedText}>No profile prompts available</Text>
              )}
            </View>
            
            {/* Interests Section */}
            <View style={styles.section}>
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
                <Text style={styles.notSpecifiedText}>No interests specified</Text>
              )}
            </View>
            
            {/* Gallery Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              {profile.id ? (
                <ProfileMediaGallery 
                  userId={profile.id} 
                  profilePhoto={profile.photoURL}
                  key={`gallery-${profile.id}`}
                />
              ) : (
                <Text style={styles.notSpecifiedText}>No gallery photos available</Text>
              )}
            </View>
            
            {/* Extra padding at bottom to ensure scrolling past buttons */}
            <View style={{ height: 160 }} />
          </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
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
    color: '#333',
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
  privacyNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
    paddingBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  notSpecifiedText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  hiddenText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    backgroundColor: '#f5f5f5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  // Inline details style (for side-by-side display)
  inlineDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  inlineDetail: {
    width: '48%',
  },
  // Regular detail row style
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  // Expandable section styles
  expandableSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  expandableTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  expandedContent: {
    padding: 12,
    backgroundColor: '#fff',
  },
  promptAnswer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  interestText: {
    fontSize: 14,
    color: '#666',
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

export default PrivateProfileDetailsModal;