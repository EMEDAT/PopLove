// components/FilterButton.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DualThumbSlider from './DualThumbSlider';

const { width } = Dimensions.get('window');

// Comprehensive filter state interface
interface FilterState {
  // Basic filters
  location: string;
  distance: [number, number];
  ageRange: [number, number];
  height: [number, number];
  
  // Demographics
  gender: string[];
  sexuality: string[];
  pronouns: string[];
  ethnicity: string[];
  
  // Family
  hasChildren: string[];
  wantChildren: string[];
  
  // Relationships
  relationshipType: string[];
  lifestyle: string[];
  
  // Interests
  interests: string[];
  
  // Habits
  drinking: string[];
  smoking: string[];
  drugUsage: string[];
  
  // Beliefs
  religiousBeliefs: string[];
  politicalBeliefs: string[];
  
  // Education & Work
  education: string[];
  school: string[];
  workplace: string[];
  jobTitle: string[];
  
  // Filter visibility toggle
  showPersonalFilters: boolean;
  showFamilyFilters: boolean;
  showRelationshipFilters: boolean;
  showInterestFilters: boolean;
  showHabitFilters: boolean;
  showBeliefFilters: boolean;
  showWorkFilters: boolean;
}

interface FilterPopupProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}

interface FilterButtonProps {
  profiles: any[];
  setProfiles: React.Dispatch<React.SetStateAction<any[]>>;
  allProfiles?: any[];
}

// All filter options
const filterOptions = {
  // Gender options
  gender: [
    'male',
    'female',
    'non-binary'
  ],
  
  // Sexuality options
  sexuality: [
    'Straight',
    'Gay',
    'Lesbian',
    'Bisexual',
    'Pansexual',
    'Asexual',
    'Demisexual',
    'Queer',
    'Questioning',
    'Fluid'
  ],
  
  // Pronouns options
  pronouns: [
    'He/Him',
    'She/Her',
    'They/Them',
    'He/They',
    'She/They'
  ],
  
  // Ethnicity options
  ethnicity: [
    'African American',
    'African',
    'Black/African Descent',
    'Afro-Latino',
    'East Asian',
    'Caucasian/White',
    'Chinese',
    'Japanese',
    'Korean',
    'Filipino',
    'Southeast Asian',
    'Hispanic/Latino',
    'Middle Eastern',
    'Native American',
    'Indigenous',
    'Pacific Islander',
    'South Asian',
    'Indian',
    'Biracial',
    'Multiracial',
    'Mixed Race'
  ],
  
  // Current children options
  hasChildren: [
    'Don\'t have children',
    'Have children',
    'Have 1 children',
    'Have 2 children',
    'Have 3 children',
    'Have 4+ children'
  ],
  
  // Want children options
  wantChildren: [
    'Want children someday',
    'Don\'t want children',
    'Open to children',
    'Not sure',
    'Want 1 children',
    'Want 2 children',
    'Want 3 children',
    'Want 4+ children'
  ],
  
  // Relationship Type options
  relationshipType: [
    'monogamy',
    'non-monogamy',
    'Figuring out my relationship type'
  ],
  
  // Lifestyle/dating intention options
  lifestyle: [
    'Activity partner',
    'Long-term relationship',
    'Short-term relationship',
    'Casual dating',
    'Friends first',
    'Marriage',
    'Family',
    'Faith-based partnership',
    'Post-breakup exploration',
    'Friends with benefit',
    'Chat Mate'
  ],
  
  // Interest options
  interests: [
    'Hiking',
    'Camping',
    'Cycling',
    'Beach',
    'Fishing',
    'Gardening',
    'Rock climbing',
    'Surfing',
    'Kayaking',
    'Sailing',
    'Running',
    'Fitness',
    'Yoga',
    'Swimming',
    'Basketball',
    'Football',
    'Soccer',
    'Volleyball',
    'Tennis',
    'Golf',
    'Cricket',
    'Rugby',
    'Table tennis',
    'Martial arts',
    'Skiing',
    'Snowboarding',
    'Cooking',
    'Foodie',
    'Coffee',
    'Wine tasting',
    'Craft beer',
    'Baking',
    'BBQ',
    'Vegan cuisine',
    'Tea culture',
    'Mixology',
    'Photography',
    'Art',
    'Painting',
    'Music',
    'Dancing',
    'Concerts',
    'Writing',
    'DIY',
    'Fashion',
    'Pottery',
    'Knitting',
    'Movies',
    'Gaming',
    'Reading',
    'Podcasts',
    'Streaming',
    'Comedy',
    'Theater',
    'Board games',
    'Karaoke',
    'Anime',
    'Travel',
    'Road trips',
    'Backpacking',
    'Cultural exploration',
    'Language learning',
    'History',
    'Architecture',
    'Meditation',
    'Volunteering',
    'Sustainable living',
    'Minimalism',
    'Spirituality',
    'Dogs',
    'Cats',
    'Pet lover',
    'Family time',
    'Networking',
    'Political activism',
    'Community service',
    'Science',
    'Technology',
    'Philosophy',
    'Psychology',
    'Chess',
    'Debate',
    'Investing',
    'Social media',
    'Blogging',
    'Podcasting',
    'Graphic design',
    'Coding',
    'Cryptocurrency',
    'Game Development',
    'Digital art',
    'Virtual reality',
    'Content creation'
  ],
  
  // Drinking options
  drinking: [
    'Yes',
    'Sometimes',
    'No'
  ],
  
  // Smoking options
  smoking: [
    'Yes',
    'Sometimes',
    'No'
  ],
  
  // Drug usage options
  drugUsage: [
    'Yes',
    'Sometimes',
    'No'
  ],
  
  // Religious beliefs options
  religiousBeliefs: [
    'Agnostic',
    'Atheist',
    'Buddhist',
    'Catholic',
    'Christian',
    'Hindu',
    'Jewish',
    'Muslim',
    'Protestant',
    'Orthodox',
    'Sikh',
    'Mormon',
    'Jehovah\'s Witness',
    'Baha\'i',
    'Jain',
    'Shinto',
    'Taoist',
    'Zoroastrian',
    'Pagan',
    'Wiccan',
    'Spiritualist',
    'Rastafarian',
    'Scientologist',
    'Unitarian',
    'Confucianist',
    'Deist',
    'Pantheist',
    'Humanist',
    'New Age',
    'Traditional Indigenous',
    'Shamanism',
    'Druze',
    'Alevi',
    'Yazidi',
    'Gnostic',
    'Quaker',
    'Mennonite',
    'Amish'
  ],
  
  // Political beliefs options
  politicalBeliefs: [
    'Liberal',
    'Moderate',
    'Conservative',
    'Progressive',
    'Libertarian',
    'Socialist',
    'Social Democrat',
    'Communist',
    'Anarchist',
    'Centrist',
    'Independent',
    'Green/Environmentalist',
    'Nationalist',
    'Populist',
    'Democratic Socialist',
    'Classical Liberal',
    'Apolitical',
    'Not Political'
  ],
  
  // Education level options
  education: [
    'High School',
    'Undergrad',
    'Postgrad'
  ]
};

const FilterPopup: React.FC<FilterPopupProps> = ({ visible, onClose, onApply }) => {
  const [filters, setFilters] = useState<FilterState>({
    // Basic filters
    location: '',
    distance: [0, 50],
    ageRange: [18, 65],
    height: [150, 210],
    
    // Demographics
    gender: [],
    sexuality: [],
    pronouns: [],
    ethnicity: [],
    
    // Family
    hasChildren: [],
    wantChildren: [],
    
    // Relationships
    relationshipType: [],
    lifestyle: [],
    
    // Interests
    interests: [],
    
    // Habits
    drinking: [],
    smoking: [],
    drugUsage: [],
    
    // Beliefs
    religiousBeliefs: [],
    politicalBeliefs: [],
    
    // Education & Work
    education: [],
    school: [],
    workplace: [],
    jobTitle: [],
    
    // Filter visibility toggles
    showPersonalFilters: true,
    showFamilyFilters: true,
    showRelationshipFilters: true,
    showInterestFilters: true,
    showHabitFilters: true,
    showBeliefFilters: true,
    showWorkFilters: true
  });
  
  const [locationPredictions, setLocationPredictions] = useState<{description: string}[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Calculate active filter count
  useEffect(() => {
    let count = 0;
    
    // Basic filters
    if (filters.location) count++;
    if (filters.distance[0] > 0 || filters.distance[1] < 50) count++;
    if (filters.ageRange[0] > 18 || filters.ageRange[1] < 65) count++;
    if (filters.height[0] > 150 || filters.height[1] < 210) count++;
    
    // Count array filters
    const countArrayFilter = (arr: string[]) => arr.length > 0 ? 1 : 0;
    
    // Demographics
    count += countArrayFilter(filters.gender);
    count += countArrayFilter(filters.sexuality);
    count += countArrayFilter(filters.pronouns);
    count += countArrayFilter(filters.ethnicity);
    
    // Family
    count += countArrayFilter(filters.hasChildren);
    count += countArrayFilter(filters.wantChildren);
    
    // Relationships
    count += countArrayFilter(filters.relationshipType);
    count += countArrayFilter(filters.lifestyle);
    
    // Interests
    count += countArrayFilter(filters.interests);
    
    // Habits
    count += countArrayFilter(filters.drinking);
    count += countArrayFilter(filters.smoking);
    count += countArrayFilter(filters.drugUsage);
    
    // Beliefs
    count += countArrayFilter(filters.religiousBeliefs);
    count += countArrayFilter(filters.politicalBeliefs);
    
    // Education & Work
    count += countArrayFilter(filters.education);
    count += countArrayFilter(filters.school);
    count += countArrayFilter(filters.workplace);
    count += countArrayFilter(filters.jobTitle);
    
    setActiveFilterCount(count);
  }, [filters]);

  // Fetch location predictions (API call simulation)
  const fetchLocationPredictions = async (input: string) => {
    if (!input || input.length < 2) {
      setLocationPredictions([]);
      setShowDropdown(false);
      return;
    }
    
    setIsLoadingPredictions(true);
    
    try {
      // Mock location predictions
      setTimeout(() => {
        const mockPredictions = [
          { description: `${input} City, United States` },
          { description: `${input}ville, Canada` },
          { description: `${input} District, United Kingdom` },
          { description: `${input} Region, Australia` },
          { description: `${input} Area, Nigeria` },
        ];
        
        setLocationPredictions(mockPredictions);
        setIsLoadingPredictions(false);
        setShowDropdown(true);
      }, 300);
    } catch (error) {
      console.error('Error fetching location predictions:', error);
      setIsLoadingPredictions(false);
      setLocationPredictions([]);
    }
  };

  // Toggle filter item in array
  const toggleFilterItem = (field: keyof FilterState, item: string) => {
    setFilters(prev => {
      // Make sure the field is an array
      const currentArray = Array.isArray(prev[field]) ? prev[field] as string[] : [];
      
      if (currentArray.includes(item)) {
        return {
          ...prev,
          [field]: currentArray.filter(i => i !== item)
        };
      } else {
        return {
          ...prev,
          [field]: [...currentArray, item]
        };
      }
    });
  };

  // Toggle filter section visibility
  const toggleFilterSection = (section: keyof FilterState) => {
    setFilters(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Render checkbox filter section
  const renderCheckboxSection = (title: string, options: string[], field: keyof FilterState) => (
    <View style={styles.filterSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.checkboxContainer}>
        {options.map(option => (
          <TouchableOpacity 
            key={option}
            style={styles.checkboxOption}
            onPress={() => toggleFilterItem(field, option)}
          >
            <View style={[
              styles.checkbox,
              (filters[field] as string[]).includes(option) && styles.checkboxChecked
            ]}>
              {(filters[field] as string[]).includes(option) && (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render collapsible section
  const renderCollapsibleSection = (
    title: string, 
    content: React.ReactNode, 
    isVisible: boolean, 
    toggleVisibility: () => void,
    activeCount: number = 0
  ) => (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={toggleVisibility}
      >
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
          {activeCount > 0 && (
            <View style={styles.activeFilterBadge}>
              <Text style={styles.activeFilterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
        <Ionicons 
          name={isVisible ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
      
      {isVisible && (
        <View style={styles.sectionContent}>
          {content}
        </View>
      )}
    </View>
  );

  // Slider value change handlers
  const handleDistanceChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, distance: [low, high]}));
  }, []);
  
  const handleAgeChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, ageRange: [low, high]}));
  }, []);

  const handleHeightChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, height: [low, high]}));
  }, []);

  // Apply filters
  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({
      // Basic filters
      location: '',
      distance: [0, 50],
      ageRange: [18, 65],
      height: [150, 210],
      
      // Demographics
      gender: [],
      sexuality: [],
      pronouns: [],
      ethnicity: [],
      
      // Family
      hasChildren: [],
      wantChildren: [],
      
      // Relationships
      relationshipType: [],
      lifestyle: [],
      
      // Interests
      interests: [],
      
      // Habits
      drinking: [],
      smoking: [],
      drugUsage: [],
      
      // Beliefs
      religiousBeliefs: [],
      politicalBeliefs: [],
      
      // Education & Work
      education: [],
      school: [],
      workplace: [],
      jobTitle: [],
      
      // Keep section visibility states
      showPersonalFilters: filters.showPersonalFilters,
      showFamilyFilters: filters.showFamilyFilters,
      showRelationshipFilters: filters.showRelationshipFilters,
      showInterestFilters: filters.showInterestFilters,
      showHabitFilters: filters.showHabitFilters,
      showBeliefFilters: filters.showBeliefFilters,
      showWorkFilters: filters.showWorkFilters
    });
  };

  // Count active filters in a section
  const countActiveSectionFilters = (filterKeys: (keyof FilterState)[]) => {
    return filterKeys.reduce((count, key) => {
      if (Array.isArray(filters[key])) {
        return count + ((filters[key] as string[]).length > 0 ? 1 : 0);
      }
      return count;
    }, 0);
  };
  
  // Section active counts
  const personalFilterCount = countActiveSectionFilters(['gender', 'sexuality', 'pronouns', 'ethnicity']);
  const familyFilterCount = countActiveSectionFilters(['hasChildren', 'wantChildren']);
  const relationshipFilterCount = countActiveSectionFilters(['relationshipType', 'lifestyle']);
  const interestFilterCount = countActiveSectionFilters(['interests']);
  const habitFilterCount = countActiveSectionFilters(['drinking', 'smoking', 'drugUsage']);
  const beliefFilterCount = countActiveSectionFilters(['religiousBeliefs', 'politicalBeliefs']);
  const workFilterCount = countActiveSectionFilters(['education', 'school', 'workplace', 'jobTitle']);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.activeFilterCountBar}>
                <Text style={styles.activeFilterCountText}>
                  {activeFilterCount === 0 
                    ? 'No active filters' 
                    : `${activeFilterCount} active filter${activeFilterCount !== 1 ? 's' : ''}`
                  }
                </Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetAllText}>Reset All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView 
                style={styles.scrollContent}
                contentContainerStyle={{paddingBottom: 30}}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Basic Filters */}
                <View style={styles.basicFiltersSection}>
                  {/* Location Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Location</Text>
                    <View style={styles.locationInputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Search by city or location..."
                        value={filters.location}
                        onChangeText={(text) => {
                          setFilters(prev => ({...prev, location: text}));
                          
                          if (!text || text.length === 0) {
                            setShowDropdown(false);
                            setLocationPredictions([]);
                          } else {
                            fetchLocationPredictions(text);
                          }
                        }}
                      />
                      {isLoadingPredictions && (
                        <ActivityIndicator size="small" color="#FF6B6B" style={styles.locationLoader} />
                      )}
                    </View>
                    
                    {/* Location Predictions Dropdown */}
                    {showDropdown && (
                      <View style={styles.dropdownContainer}>
                        {locationPredictions.length > 0 ? (
                          <ScrollView 
                            style={styles.dropdown} 
                            nestedScrollEnabled={true}
                            keyboardShouldPersistTaps="handled"
                          >
                            {locationPredictions.map((prediction, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setFilters(prev => ({...prev, location: prediction.description}));
                                  setShowDropdown(false);
                                }}
                              >
                                <Ionicons name="location-outline" size={16} color="#666" style={styles.locationIcon} />
                                <Text style={styles.dropdownText}>{prediction.description}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <View style={styles.noResults}>
                            <Text style={styles.noResultsText}>No locations found</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Distance Range */}
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Distance</Text>
                    <View style={styles.rangeContainer}>
                      <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabel}>{filters.distance[0]}km</Text>
                        <Text style={styles.rangeLabel}>{filters.distance[1]}km</Text>
                      </View>
                      <DualThumbSlider
                        min={0}
                        max={100}
                        step={5}
                        initialLow={filters.distance[0]}
                        initialHigh={filters.distance[1]}
                        values={filters.distance}
                        onValueChanged={handleDistanceChange}
                      />
                    </View>
                  </View>

                  {/* Age Range */}
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Age</Text>
                    <View style={styles.rangeContainer}>
                      <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabel}>{filters.ageRange[0]} years</Text>
                        <Text style={styles.rangeLabel}>{filters.ageRange[1]} years</Text>
                      </View>
                      <DualThumbSlider
                        min={18}
                        max={70}
                        step={1}
                        initialLow={filters.ageRange[0]}
                        initialHigh={filters.ageRange[1]}
                        values={filters.ageRange}
                        onValueChanged={handleAgeChange}
                      />
                    </View>
                  </View>

                {/* Personal Attributes Section */}
                {renderCollapsibleSection(
                  'Personal Attributes',
                  <>
                    {renderCheckboxSection("Gender", filterOptions.gender, "gender")}
                    {renderCheckboxSection("Sexuality", filterOptions.sexuality, "sexuality")}
                    {renderCheckboxSection("Pronouns", filterOptions.pronouns, "pronouns")}
                    {renderCheckboxSection("Ethnicity", filterOptions.ethnicity, "ethnicity")}
                  </>,
                  filters.showPersonalFilters,
                  () => toggleFilterSection('showPersonalFilters'),
                  personalFilterCount
                )}

                  {/* Height Range */}
                  <View style={styles.filterSection}>
                    <Text style={styles.sectionTitle}>Height (cm)</Text>
                    <View style={styles.rangeContainer}>
                      <View style={styles.rangeLabels}>
                        <Text style={styles.rangeLabel}>{filters.height[0]} cm</Text>
                        <Text style={styles.rangeLabel}>{filters.height[1]} cm</Text>
                      </View>
                      <DualThumbSlider
                        min={140}
                        max={220}
                        step={5}
                        initialLow={filters.height[0]}
                        initialHigh={filters.height[1]}
                        values={filters.height}
                        onValueChanged={handleHeightChange}
                      />
                    </View>
                  </View>
                </View>
                
                {/* Family Section */}
                {renderCollapsibleSection(
                  'Family',
                  <>
                    {renderCheckboxSection("Has Children", filterOptions.hasChildren, "hasChildren")}
                    {renderCheckboxSection("Wants Children", filterOptions.wantChildren, "wantChildren")}
                  </>,
                  filters.showFamilyFilters,
                  () => toggleFilterSection('showFamilyFilters'),
                  familyFilterCount
                )}
                
                {/* Relationship Preferences Section */}
                {renderCollapsibleSection(
                  'Relationship Preferences',
                  <>
                    {renderCheckboxSection("Relationship Type", filterOptions.relationshipType, "relationshipType")}
                    {renderCheckboxSection("Dating Intentions", filterOptions.lifestyle, "lifestyle")}
                  </>,
                  filters.showRelationshipFilters,
                  () => toggleFilterSection('showRelationshipFilters'),
                  relationshipFilterCount
                )}
                
                {/* Interests Section */}
                {renderCollapsibleSection(
                  'Interests',
                  <View style={styles.interestContainer}>
                    {filterOptions.interests.map(interest => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.interestTag,
                          filters.interests.includes(interest) && styles.selectedInterestTag
                        ]}
                        onPress={() => toggleFilterItem("interests", interest)}
                      >
                        <Text style={[
                          styles.interestText,
                          filters.interests.includes(interest) && styles.selectedInterestText
                        ]}>
                          {interest}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>,
                  filters.showInterestFilters,
                  () => toggleFilterSection('showInterestFilters'),
                  interestFilterCount
                )}
                
                {/* Lifestyle Habits Section */}
                {renderCollapsibleSection(
                  'Lifestyle Habits',
                  <>
                    {renderCheckboxSection("Drinking", filterOptions.drinking, "drinking")}
                    {renderCheckboxSection("Smoking", filterOptions.smoking, "smoking")}
                    {renderCheckboxSection("Drug Usage", filterOptions.drugUsage, "drugUsage")}
                  </>,
                  filters.showHabitFilters,
                  () => toggleFilterSection('showHabitFilters'),
                  habitFilterCount
                )}
                
                {/* Beliefs Section */}
                {renderCollapsibleSection(
                  'Beliefs',
                  <>
                    {renderCheckboxSection("Religious Beliefs", filterOptions.religiousBeliefs, "religiousBeliefs")}
                    {renderCheckboxSection("Political Beliefs", filterOptions.politicalBeliefs, "politicalBeliefs")}
                  </>,
                  filters.showBeliefFilters,
                  () => toggleFilterSection('showBeliefFilters'),
                  beliefFilterCount
                )}
                
                {/* Education & Work Section */}
                {renderCollapsibleSection(
                  'Education & Work',
                  <>
                    {renderCheckboxSection("Education Level", filterOptions.education, "education")}
                    
                    {/* Text input filters */}
                    <View style={styles.filterSection}>
                      <Text style={styles.sectionTitle}>School</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Filter by school name..."
                        value={filters.school.length > 0 ? filters.school[0] : ''}
                        onChangeText={(text) => {
                          if (text) {
                            setFilters(prev => ({...prev, school: [text]}));
                          } else {
                            setFilters(prev => ({...prev, school: []}));
                          }
                        }}
                      />
                    </View>
                    
                    <View style={styles.filterSection}>
                      <Text style={styles.sectionTitle}>Workplace</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Filter by workplace..."
                        value={filters.workplace.length > 0 ? filters.workplace[0] : ''}
                        onChangeText={(text) => {
                          if (text) {
                            setFilters(prev => ({...prev, workplace: [text]}));
                          } else {
                            setFilters(prev => ({...prev, workplace: []}));
                          }
                        }}
                      />
                    </View>
                    
                    <View style={styles.filterSection}>
                      <Text style={styles.sectionTitle}>Job Title</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Filter by job title..."
                        value={filters.jobTitle.length > 0 ? filters.jobTitle[0] : ''}
                        onChangeText={(text) => {
                          if (text) {
                            setFilters(prev => ({...prev, jobTitle: [text]}));
                          } else {
                            setFilters(prev => ({...prev, jobTitle: []}));
                          }
                        }}
                      />
                    </View>
                  </>,
                  filters.showWorkFilters,
                  () => toggleFilterSection('showWorkFilters'),
                  workFilterCount
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={handleReset}
                >
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.applyButton}
                  onPress={handleApply}
                >
                  <LinearGradient
                    colors={['#EC5F61', '#F0B433']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const FilterButton: React.FC<FilterButtonProps> = ({ profiles, setProfiles, allProfiles }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);

  const handleFilterApply = (filters: FilterState) => {
    // Always use available profiles - prioritize allProfiles if provided
    const profilesToFilter = allProfiles || profiles || [];
    
    console.log("Applying comprehensive filters");
    console.log("Total Profiles to filter:", profilesToFilter.length);
    
    // Guard against empty profiles array
    if (profilesToFilter.length === 0) {
      console.error("No profiles available to filter!");
      return;
    }
  
    const filteredProfiles = profilesToFilter.filter(profile => {
      // Location Filter
      if (filters.location) {
        const profileLocation = profile.location?.toLowerCase() || '';
        const filterLocation = filters.location.toLowerCase();
        if (!profileLocation.includes(filterLocation)) {
          return false;
        }
      }
      
      // Distance Filter
      if (profile.distance !== undefined && 
          (profile.distance < filters.distance[0] || profile.distance > filters.distance[1])) {
        return false;
      }
      
      // Age Filter with Robust Extraction
      let profileAge = 0;
      if (profile.age) {
        const ageNum = parseInt(profile.age);
        if (!isNaN(ageNum)) profileAge = ageNum;
      } else if (profile.ageRange) {
        const match = profile.ageRange.match(/^(\d+)/);
        if (match && match[1]) profileAge = parseInt(match[1]);
      }
      
      if (profileAge > 0) {
        if (profileAge < filters.ageRange[0] || profileAge > filters.ageRange[1]) {
          return false;
        }
      }
      
      // Height Filter
      if (filters.height[0] !== 150 || filters.height[1] !== 210) {
        if (profile.height) {
          const height = parseInt(profile.height);
          if (!isNaN(height) && (height < filters.height[0] || height > filters.height[1])) {
            return false;
          }
        }
      }
      
      // Gender Filter
      if (filters.gender.length > 0) {
        if (!profile.gender || !filters.gender.includes(profile.gender)) {
          return false;
        }
      }
      
      // Sexuality Filter
      if (filters.sexuality.length > 0) {
        if (!profile.sexuality || !filters.sexuality.includes(profile.sexuality)) {
          return false;
        }
      }
      
      // Pronouns Filter
      if (filters.pronouns.length > 0) {
        if (!profile.pronouns || !filters.pronouns.includes(profile.pronouns)) {
          return false;
        }
      }
      
      // Ethnicity Filter
      if (filters.ethnicity.length > 0) {
        if (!profile.ethnicity || !filters.ethnicity.includes(profile.ethnicity)) {
          return false;
        }
      }
      
      // Current Children Filter
      if (filters.hasChildren.length > 0) {
        if (!profile.currentChildren || !filters.hasChildren.includes(profile.currentChildren)) {
          return false;
        }
      }
      
      // Want Children Filter
      if (filters.wantChildren.length > 0) {
        if (!profile.wantChildren || !filters.wantChildren.includes(profile.wantChildren)) {
          return false;
        }
      }
      
      // Relationship Type Filter
      if (filters.relationshipType.length > 0) {
        if (!profile.relationshipType || !filters.relationshipType.includes(profile.relationshipType)) {
          return false;
        }
      }
      
      // Lifestyle Filter
      if (filters.lifestyle.length > 0) {
        if (!profile.lifestyle || (Array.isArray(profile.lifestyle) && 
            !profile.lifestyle.some((item: string) => filters.lifestyle.includes(item)))) {
          return false;
        }
      }
      
      // Drinking Filter
      if (filters.drinking.length > 0) {
        if (!profile.drinking || !filters.drinking.includes(profile.drinking)) {
          return false;
        }
      }
      
      // Smoking Filter
      if (filters.smoking.length > 0) {
        if (!profile.smoking || !filters.smoking.includes(profile.smoking)) {
          return false;
        }
      }
      
      // Drug Usage Filter
      if (filters.drugUsage.length > 0) {
        if (!profile.drugUsage || !filters.drugUsage.includes(profile.drugUsage)) {
          return false;
        }
      }
      
      // Religious Beliefs Filter
      if (filters.religiousBeliefs.length > 0) {
        if (!profile.religiousBeliefs || !filters.religiousBeliefs.includes(profile.religiousBeliefs)) {
          return false;
        }
      }
      
      // Political Beliefs Filter
      if (filters.politicalBeliefs.length > 0) {
        if (!profile.politicalBeliefs || !filters.politicalBeliefs.includes(profile.politicalBeliefs)) {
          return false;
        }
      }
      
      // Education Filter
      if (filters.education.length > 0) {
        if (!profile.education || !filters.education.includes(profile.education)) {
          return false;
        }
      }
      
      // School Filter (text-based)
      if (filters.school.length > 0 && filters.school[0]) {
        const schoolFilter = filters.school[0].toLowerCase();
        const profileSchool = profile.school?.toLowerCase() || '';
        if (!profileSchool.includes(schoolFilter)) {
          return false;
        }
      }
      
      // Workplace Filter (text-based)
      if (filters.workplace.length > 0 && filters.workplace[0]) {
        const workplaceFilter = filters.workplace[0].toLowerCase();
        const profileWorkplace = profile.workplace?.toLowerCase() || '';
        if (!profileWorkplace.includes(workplaceFilter)) {
          return false;
        }
      }
      
      // Job Title Filter (text-based)
      if (filters.jobTitle.length > 0 && filters.jobTitle[0]) {
        const jobTitleFilter = filters.jobTitle[0].toLowerCase();
        const profileJobTitle = profile.jobTitle?.toLowerCase() || '';
        if (!profileJobTitle.includes(jobTitleFilter)) {
          return false;
        }
      }
      
      // Interests Filter
      if (filters.interests.length > 0) {
        if (!profile.interests || !Array.isArray(profile.interests) ||
            !profile.interests.some((interest: string) => filters.interests.includes(interest))) {
          return false;
        }
      }
      
      return true;
    });
    
    const originalCount = profilesToFilter.length;
    const newCount = filteredProfiles.length;
    
    console.log(`Filtered from ${originalCount} to ${newCount} profiles`);
    setFilteredCount(newCount);
    
    // Don't fall back to all profiles - use filtered results even if empty
    setProfiles(filteredProfiles);
    setActiveFilters(filters);
  };

  // Calculate total active filters
  const getActiveFilterCount = () => {
    if (!activeFilters) return 0;
    
    let count = 0;
    
    // Count non-empty array filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        count++;
      }
    });
    
    // Count non-default range filters
    if (activeFilters.distance[0] > 0 || activeFilters.distance[1] < 50) count++;
    if (activeFilters.ageRange[0] > 18 || activeFilters.ageRange[1] < 65) count++;
    if (activeFilters.height[0] > 150 || activeFilters.height[1] < 210) count++;
    
    // Count location
    if (activeFilters.location) count++;
    
    return count;
  };

  const activeFilterCount = activeFilters ? getActiveFilterCount() : 0;

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setIsFilterOpen(true)}
        style={styles.filterButton}
      >
        <Ionicons 
          name="options" 
          size={22} 
          color={activeFilterCount > 0 ? "#FF6B6B" : "#333"} 
        />
        {activeFilterCount > 0 && (
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>{activeFilterCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <FilterPopup 
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleFilterApply}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Filter button styles
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2.5,
    position: 'relative',
  },
  filterCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeFilterBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  activeFilterBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#161616',
  },
  closeButton: {
    padding: 5,
  },
  
  // Active filter count bar
  activeFilterCountBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7F7F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  activeFilterCountText: {
    fontSize: 14,
    color: '#666',
  },
  resetAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  
  // Scroll content
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Basic filters section
  basicFiltersSection: {
    marginBottom: 15,
  },
  
  // Filter section styles
  filterSection: {
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  
  // Location input
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  locationLoader: {
    marginLeft: 10,
  },
  
  // Location dropdown
  dropdownContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    maxHeight: 200,
  },
  dropdown: {
    maxHeight: 200,
    backgroundColor: 'white',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  noResults: {
    padding: 10,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#999',
  },
  
  // Range styles
  rangeContainer: {
    marginVertical: 5,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#666',
  },
  
  // Checkbox styles
  checkboxContainer: {
    marginTop: 5,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F9F9F9',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#444',
  },
  
  // Interest tag styles
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 10,
  },
  selectedInterestTag: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FCA5A5',
  },
  interestText: {
    fontSize: 13,
    color: '#666',
  },
  selectedInterestText: {
    color: '#E11D48',
  },
  
  // Collapsible section styles
  collapsibleSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F9F9F9',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionContent: {
    padding: 15,
    backgroundColor: '#fff',
  },
  
  // Button styles
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  resetButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 10,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  }
});

export default FilterButton;