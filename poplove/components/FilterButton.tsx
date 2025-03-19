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
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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
      distance: [17, 30],
      ageRange: [18, 35],
      height: [150, 200],
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
                {/* Location Section */}
                <View style={styles.filterSection}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={filters.location}
                      onValueChange={(value) => setFilters(prev => ({...prev, location: value}))}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select location" value="" />
                      {locations.map(location => (
                        <Picker.Item 
                          key={location.code} 
                          label={location.name} 
                          value={location.name} 
                        />
                      ))}
                    </Picker>
                  </View>
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
                      initialLow={filters.distance[0]}
                      initialHigh={filters.distance[1]}
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
                      initialLow={filters.height[0]}
                      initialHigh={filters.height[1]}
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
    const profilesToFilter = allProfiles || originalProfiles;
    
    const filteredProfiles = profilesToFilter.filter(profile => {
      // Location filter
      if (filters.location && profile.location !== filters.location) {
        return false;
      }
      
      // Extract numeric age
      let profileAge = 0;
      if (profile.age) {
        const ageNum = parseInt(profile.age);
        if (!isNaN(ageNum)) {
          profileAge = ageNum;
        }
      } else if (profile.ageRange) {
        const match = profile.ageRange.match(/^(\d+)/);
        if (match && match[1]) {
          profileAge = parseInt(match[1]);
        }
      }
      
      // Distance filter
      if (profile.distance !== undefined && 
          (profile.distance < filters.distance[0] || profile.distance > filters.distance[1])) {
        return false;
      }
      
      // Age filter
      if (profileAge > 0) {
        if (profileAge < filters.ageRange[0] || profileAge > filters.ageRange[1]) {
          return false;
        }
      }
      
      // Height filter
      if (profile.height) {
        const height = parseInt(profile.height);
        if (!isNaN(height) && (height < filters.height[0] || height > filters.height[1])) {
          return false;
        }
      }
      
      // Ethnicity filter
      if (filters.ethnicity.length > 0 && profile.ethnicity) {
        if (!filters.ethnicity.includes(profile.ethnicity)) {
          return false;
        }
      }
      
      // Children filter
      if (filters.hasChildren.length > 0 && profile.hasChildren) {
        if (!filters.hasChildren.includes(profile.hasChildren)) {
          return false;
        }
      }
      
      // Interests filter
      if (filters.interests.length > 0 && 
          (!profile.interests || !profile.interests.some(interest => filters.interests.includes(interest)))) {
        return false;
      }
      
      return true;
    });
    
    setProfiles(filteredProfiles);
    setActiveFilters(filters);
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
    backgroundColor: '#F9F9F9',
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
  }
});

export default FilterButton;