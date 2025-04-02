// FilterButton.tsx with new filters
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
  TextInput // Add this import
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
  interests: string[];
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

const ethnicityOptions = [
  'Asian',
  'Black/African',
  'Caucasian/White',
  'Hispanic/Latino',
  'Middle Eastern',
  'Native American',
  'Pacific Islander',
  'Multiracial',
  'Other',
  'Prefer not to say'
];

const childrenOptions = [
  'No children',
  'Have children',
  'Want children someday',
  'Don\'t want children',
  'Prefer not to say'
];

const FilterPopup: React.FC<FilterPopupProps> = ({ visible, onClose, onApply }) => {
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    distance: [17, 30],
    ageRange: [18, 35],
    height: [150, 200],
    ethnicity: [],
    hasChildren: [],
    interests: []
  });
  const [locations, setLocations] = useState<{name: string, code: string}[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<{name: string, code: string}[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      const countries = await getLocations();
      setLocations(countries);
    };
    
    loadLocations();
  }, []); 

  const getLocations = async () => {
    try {
      const locationService = require('../services/location').default;
      return locationService.getAllCountries();
    } catch (error) {
      console.error('Error fetching locations:', error);
      return []; 
    }
  };

  const availableInterests = [
    'Swimming', 'Photography', 'Shopping', 
    'Karaoke', 'Cooking', 'K-Pop', 
    'Table-Tennis', 'Art', 'Musics', 
    'Video games', 'Drinks'
  ];

  const toggleInterest = (interest: string) => {
    setFilters(prev => {
      if (prev.interests.includes(interest)) {
        return {
          ...prev,
          interests: prev.interests.filter(i => i !== interest)
        };
      } else {
        return {
          ...prev,
          interests: [...prev.interests, interest]
        };
      }
    });
  };

  const toggleEthnicity = (ethnicity: string) => {
    setFilters(prev => {
      if (prev.ethnicity.includes(ethnicity)) {
        return {
          ...prev,
          ethnicity: prev.ethnicity.filter(e => e !== ethnicity)
        };
      } else {
        return {
          ...prev,
          ethnicity: [...prev.ethnicity, ethnicity]
        };
      }
    });
  };

  const toggleChildren = (option: string) => {
    setFilters(prev => {
      if (prev.hasChildren.includes(option)) {
        return {
          ...prev,
          hasChildren: prev.hasChildren.filter(c => c !== option)
        };
      } else {
        return {
          ...prev,
          hasChildren: [...prev.hasChildren, option]
        };
      }
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      location: '',
      distance: [1, 100],
      ageRange: [18, 70],
      height: [140, 220],
      ethnicity: [],
      hasChildren: [],
      interests: []
    });
  };

  const handleDistanceChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, distance: [low, high]}));
  }, []);
  
  const handleAgeChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, ageRange: [low, high]}));
  }, []);

  const handleHeightChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, height: [low, high]}));
  }, []);

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
                contentContainerStyle={{paddingBottom: 0}} // Add this
              >
                {/* Location Section - with autocomplete dropdown */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <TextInput
                    style={[styles.textInput, {
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      borderRadius: 8,
                      backgroundColor: '#F9F9F9',
                      height: 50,
                      paddingHorizontal: 12
                    }]}
                    placeholder="Type to search locations..."
                    value={filters.location}
                    onChangeText={(text) => {
                      setFilters(prev => ({...prev, location: text}));
                      // Get filtered location suggestions
                      if (text.length > 0) {
                        const filtered = locations.filter(location => 
                          location.name.toLowerCase().includes(text.toLowerCase())
                        );
                        setFilteredLocations(filtered);
                        setShowDropdown(true);
                      } else {
                        setShowDropdown(false);
                      }
                    }}
                  />
                  
                  {/* Dropdown suggestions */}
                  {showDropdown && (
                    <View style={styles.dropdownContainer}>
                      <ScrollView style={styles.dropdown} nestedScrollEnabled={true}>
                        {filteredLocations.map((location, index) => (
                          <TouchableOpacity
                            key={location.code}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFilters(prev => ({...prev, location: location.name}));
                              setShowDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownText}>{location.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
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
                      min={1}
                      max={100}
                      step={1}
                      initialLow={1}
                      initialHigh={100}
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
                      initialLow={18}
                      initialHigh={70}
                      values={filters.ageRange}
                      onValueChanged={handleAgeChange}
                    />
                  </View>
                </View>

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
                      initialLow={140}
                      initialHigh={220}
                      values={filters.height}
                      onValueChanged={handleHeightChange}
                    />
                  </View>
                </View>

                {/* Ethnicity */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Ethnicity</Text>
                  <View style={styles.checkboxContainer}>
                    {ethnicityOptions.map(option => (
                      <TouchableOpacity 
                        key={option}
                        style={styles.checkboxOption}
                        onPress={() => toggleEthnicity(option)}
                      >
                        <View style={[
                          styles.checkbox,
                          filters.ethnicity.includes(option) && styles.checkboxChecked
                        ]}>
                          {filters.ethnicity.includes(option) && (
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Children */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Children</Text>
                  <View style={styles.checkboxContainer}>
                    {childrenOptions.map(option => (
                      <TouchableOpacity 
                        key={option}
                        style={styles.checkboxOption}
                        onPress={() => toggleChildren(option)}
                      >
                        <View style={[
                          styles.checkbox,
                          filters.hasChildren.includes(option) && styles.checkboxChecked
                        ]}>
                          {filters.hasChildren.includes(option) && (
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Interests */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Interest</Text>
                  <View style={styles.interestContainer}>
                    {availableInterests.map(interest => (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.interestTag,
                          filters.interests.includes(interest) && styles.selectedInterestTag
                        ]}
                        onPress={() => toggleInterest(interest)}
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
      if (filters.height[0] !== 150 || filters.height[1] !== 200) {
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
      
      // Children Filter
      if (filters.hasChildren.length > 0) {
        if (!profile.hasChildren || !filters.hasChildren.includes(profile.hasChildren)) {
          return false;
        }
      }
      
      // Interests Filter
      if (filters.interests.length > 0) {
        if (!profile.interests || !profile.interests.some(interest => 
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
  };

  return (
    <View>
      <TouchableOpacity 
        onPress={() => setIsFilterOpen(true)}
        style={styles.filterButton}
      >
        <Ionicons name="options" size={18} color="#FF6B6B" />
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '95%',  // This should be high enough
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'scroll'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  textInput: {
    fontSize: 16,
    color: '#333',
  },
  scrollContent: {
    flex: 1, // Add this
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  picker: {
    height: 50,
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
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  dropdown: {
    maxHeight: 200,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
});

export default FilterButton;