// Enhanced FilterButton.tsx with Google Places API integration
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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DualThumbSlider from '../components/DualThumbSlider';

const { width } = Dimensions.get('window');

interface FilterState {
  location: string;
  distance: [number, number];
  ageRange: [number, number];
  height: [number, number];
  ethnicity: string[];
  hasChildren: string[];
  wantChildren: string[];
  interests: string[];
  lifestyle: string[];
  drinking: string[];
  smoking: string[];
  religiousBeliefs: string[];
  politicalBeliefs: string[];
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

// Ethnicity options from your data
const ethnicityOptions = [
  'Asian',
  'Black/African Descent',
  'Caucasian/White',
  'Hispanic/Latino',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'Multiracial',
  'Other',
  'Prefer not to say'
];

// Current children options
const currentChildrenOptions = [
  'Don\'t have children',
  'Have children',
  'Have children (not living with me)',
  'Have children (living with me)',
  'Prefer not to say'
];

// Want children options
const wantChildrenOptions = [
  'Want children someday',
  'Don\'t want children',
  'Want 1-3 children',
  'Want 4+ children',
  'Undecided',
  'Prefer not to say'
];

// Lifestyle options
const lifestyleOptions = [
  'Activity partner',
  'Long-term relationship',
  'Short-term relationship',
  'Casual dating',
  'Making new friends',
  'Marriage-minded'
];

// Drinking options
const drinkingOptions = [
  'Never',
  'Rarely',
  'Sometimes',
  'Often',
  'Prefer not to say'
];

// Smoking options
const smokingOptions = [
  'No',
  'Yes',
  'Sometimes',
  'Trying to quit',
  'Prefer not to say'
];

// Religious beliefs options
const religiousOptions = [
  'Agnostic',
  'Atheist',
  'Buddhist',
  'Christian',
  'Hindu',
  'Jewish',
  'Muslim',
  'Spiritual',
  'Other',
  'Prefer not to say'
];

// Political beliefs options
const politicalOptions = [
  'Liberal',
  'Moderate',
  'Conservative',
  'Not political',
  'Other',
  'Prefer not to say'
];

const FilterPopup: React.FC<FilterPopupProps> = ({ visible, onClose, onApply }) => {
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    distance: [0, 50],
    ageRange: [18, 65],
    height: [150, 210],
    ethnicity: [],
    hasChildren: [],
    wantChildren: [],
    interests: [],
    lifestyle: [],
    drinking: [],
    smoking: [],
    religiousBeliefs: [],
    politicalBeliefs: []
  });
  
  const [locationPredictions, setLocationPredictions] = useState<{description: string}[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch location predictions from Google Places API
  const fetchLocationPredictions = async (input: string) => {
    if (!input || input.length < 2) {
      setLocationPredictions([]);
      setShowDropdown(false);
      return;
    }
    
    setIsLoadingPredictions(true);
    
    try {
      // This would typically use your Google Places API key
      // For now, we'll use a simplified mock with a delay to simulate API fetch
      setTimeout(() => {
        // Mock some predictions based on input
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
      }, 500);
      
      /* For actual Google Places API implementation:*/
      
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${input}&key=${apiKey}`
      );
      const data = await response.json();
      
      if (data.predictions) {
        setLocationPredictions(data.predictions);
        setShowDropdown(true);
      } else {
        setLocationPredictions([]);
      }
      
      setIsLoadingPredictions(false);

      
    } catch (error) {
      console.error('Error fetching location predictions:', error);
      setIsLoadingPredictions(false);
      setLocationPredictions([]);
    }
  };

  // Common toggle function for array-based filters
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

  // Common rendering function for checkbox sections
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

  const availableInterests = [
    'Basketball', 'Soccer', 'Swimming', 'Photography', 'Shopping', 
    'Karaoke', 'Cooking', 'K-Pop', 'Table-Tennis', 'Art', 
    'Music', 'Video games', 'Fitness', 'Fashion', 'Travel',
    'Reading', 'Dancing', 'Movies', 'Hiking', 'Cycling'
  ];

  const handleDistanceChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, distance: [low, high]}));
  }, []);
  
  const handleAgeChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, ageRange: [low, high]}));
  }, []);

  const handleHeightChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, height: [low, high]}));
  }, []);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      location: '',
      distance: [0, 50],
      ageRange: [18, 65],
      height: [150, 210],
      ethnicity: [],
      hasChildren: [],
      wantChildren: [],
      interests: [],
      lifestyle: [],
      drinking: [],
      smoking: [],
      religiousBeliefs: [],
      politicalBeliefs: []
    });
  };

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
                <Text style={styles.modalTitle}>Filter</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                  style={styles.scrollContent}
                  contentContainerStyle={{paddingBottom: 30}}
                  showsVerticalScrollIndicator={true}
                  scrollEventThrottle={96} // Improve scroll responsiveness
                  decelerationRate="normal" // Normal deceleration feels more responsive
                  keyboardShouldPersistTaps="handled" // Better keyboard handling
                  scrollEnabled={true} // Explicitly enable scrolling
                  directionalLockEnabled={true} // Lock to vertical scrolling only
                  onScrollBeginDrag={() => console.log('Scroll began')} // For testing
                >
                {/* Location Section - with Google Places autocomplete */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.locationInputContainer}>
                  <TextInput
                      style={styles.textInput}
                      placeholder="Type to search locations..."
                      value={filters.location}
                      onChangeText={(text) => {
                        setFilters(prev => ({...prev, location: text}));
                        
                        // Close dropdown when input is empty
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

                {/* Age Preference */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Age Preference</Text>
                  <View style={styles.rangeContainer}>
                    <View style={styles.rangeLabels}>
                      <Text style={styles.rangeLabel}>{filters.ageRange[0]}</Text>
                      <Text style={styles.rangeLabel}>{filters.ageRange[1]}</Text>
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

                {/* Ethnicity */}
                {renderCheckboxSection("Ethnicity", ethnicityOptions, "ethnicity")}

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

                {/* Lifestyle */}
                {renderCheckboxSection("Lifestyle & Dating Intentions", lifestyleOptions, "lifestyle")}

                {/* Current Children */}
                {renderCheckboxSection("Has Children", currentChildrenOptions, "hasChildren")}

                {/* Want Children */}
                {renderCheckboxSection("Wants Children", wantChildrenOptions, "wantChildren")}

                {/* Drinking */}
                {renderCheckboxSection("Drinking Habits", drinkingOptions, "drinking")}

                {/* Smoking */}
                {renderCheckboxSection("Smoking Habits", smokingOptions, "smoking")}

                {/* Religious Beliefs */}
                {renderCheckboxSection("Religious Beliefs", religiousOptions, "religiousBeliefs")}

                {/* Political Beliefs */}
                {renderCheckboxSection("Political Beliefs", politicalOptions, "politicalBeliefs")}

                {/* Interests */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.interestContainer}>
                    {availableInterests.map(interest => (
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
                  </View>
                </View>
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
                    <Text style={styles.applyButtonText}>Apply</Text>
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
  const [originalProfiles] = useState(allProfiles || profiles);

  const handleFilterApply = (filters: FilterState) => {
    // Always use available profiles - prioritize allProfiles if provided
    const profilesToFilter = allProfiles || profiles || [];
    
    console.log("Raw Filters:", JSON.stringify(filters, null, 2));
    console.log("Total Profiles:", profilesToFilter.length);
    
    // Guard against empty profiles array
    if (profilesToFilter.length === 0) {
      console.error("No profiles available to filter!");
      return; // Don't update state with empty profiles
    }
    
    // Log a sample profile for debugging
    if (profilesToFilter[0]) {
      console.log("Sample Profile:", JSON.stringify(profilesToFilter[0], null, 2));
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
      
      // Lifestyle Filter
      if (filters.lifestyle.length > 0) {
        if (!profile.lifestyle || !profile.lifestyle.some((item: string) => 
          filters.lifestyle.includes(item)
        )) {
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
      
      // Interests Filter
      if (filters.interests.length > 0) {
        if (!profile.interests || !profile.interests.some((interest: string) => 
          filters.interests.includes(interest)
        )) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log("Filtered Profiles Count:", filteredProfiles.length);
    
    // Don't fall back to all profiles - use filtered results even if empty
    setProfiles(filteredProfiles);
    setActiveFilters(filters);
  };

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setIsFilterOpen(true)}
        style={styles.filterButton}
      >
        <Ionicons 
          name="options" 
          size={18} 
          color={activeFilters ? "#FF6B6B" : "#333"} 
        />
        {activeFilters && <View style={styles.activeDot} />}
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F1ED',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    height: '90%', // Keep this the same
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: 'flex', // Explicitly set display
    flexDirection: 'column', // Important for proper layout
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 25, // Add extra padding at the top
    marginTop: 10, // Add margin at the top
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
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
  rangeContainer: {
    marginVertical: 5,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#666',
  },
  checkboxContainer: {
    marginTop: 5,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 14,
  },
  selectedInterestTag: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FCA5A5',
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
  selectedInterestText: {
    color: '#E11D48',
  },
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
    flex: 1,
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
  },
  dropdownContainer: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
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
  }
});

export default FilterButton;