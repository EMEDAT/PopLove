// FilterButton.tsx with dual-thumb slider implementation
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import DualThumbSlider from '../components/DualThumbSlider';

// Get device dimensions
const { width } = Dimensions.get('window');

// Define the filter state interface
interface FilterState {
  location: string;
  distance: [number, number];
  ageRange: [number, number];
  interests: string[];
}

// Define location interface
interface LocationData {
  name: string;
  code: string;
}

// Define profile interface
interface Profile {
  id: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  location?: string;
  distance?: number;
  age?: string;
  ageRange?: string;
  interests?: string[];
  gender?: string;
  profession?: string;
}

// FilterPopup props interface
interface FilterPopupProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
}

// FilterButton props interface
interface FilterButtonProps {
  profiles: Profile[];
  setProfiles: React.Dispatch<React.SetStateAction<Profile[]>>;
  allProfiles?: Profile[]; // Optional original unfiltered profiles
}

const FilterPopup: React.FC<FilterPopupProps> = ({ visible, onClose, onApply }) => {
  // Initial filter state
  const [filters, setFilters] = useState<FilterState>({
    location: '',
    distance: [17, 30],
    ageRange: [18, 35],
    interests: []
  });
  const [locations, setLocations] = useState<LocationData[]>([]);

  useEffect(() => {
    const loadLocations = async () => {
      const countries = await getLocations();
      setLocations(countries);
    };
    
    loadLocations();
  }, []); 

  console.log("Slider values:", filters.distance, filters.ageRange);

  const getLocations = async (): Promise<LocationData[]> => {
    try {
      const locationService = require('../services/location').default;
      const countries = locationService.getAllCountries();
      return countries;
    } catch (error) {
      console.error('Error fetching locations:', error);
      return []; 
    }
  };

  // Available interests for selection
  const availableInterests = [
    'Swimming', 'Photography', 'Shopping', 
    'Karaoke', 'Cooking', 'K-Pop', 
    'Table-Tennis', 'Art', 'Musics', 
    'Video games', 'Drinks'
  ];

  // Toggle interest selection
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

  // Handle applying filters
  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Reset filters to initial state
  const handleReset = () => {
    setFilters({
      location: '',
      distance: [17, 30],
      ageRange: [18, 35],
      interests: []
    });
  };

  // Handle distance slider change
  const handleDistanceChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, distance: [low, high]}));
  }, []);
  
  // Handle age slider change
  const handleAgeChange = useCallback((low: number, high: number) => {
    setFilters(prev => ({...prev, ageRange: [low, high]}));
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

              <ScrollView style={styles.scrollContent}>
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

// Main filter button component that toggles the popup
const FilterButton: React.FC<FilterButtonProps> = ({ profiles, setProfiles, allProfiles }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | null>(null);
  
  // Store original profiles if allProfiles not provided
  const [originalProfiles] = useState(allProfiles || profiles);

  const handleFilterApply = (filters: FilterState) => {
    // Get the profiles to filter (either from allProfiles prop or original stored profiles)
    const profilesToFilter = allProfiles || originalProfiles;
    
    // Apply filters to your data
    const filteredProfiles = profilesToFilter.filter(profile => {
      // Apply location filter
      if (filters.location && profile.location !== filters.location) {
        return false;
      }
      
      // Extract numeric age from ageRange or age field
      let profileAge = 0;
      if (profile.age) {
        const ageNum = parseInt(profile.age);
        if (!isNaN(ageNum)) profileAge = ageNum;
      } else if (profile.ageRange) {
        // Try to extract from ageRange (assuming format like "25 to 30")
        const match = profile.ageRange.match(/^(\d+)/);
        if (match && match[1]) {
          const ageNum = parseInt(match[1]);
          if (!isNaN(ageNum)) profileAge = ageNum;
        }
      }
      
      // Apply distance filter
      if (profile.distance !== undefined && 
          (profile.distance < filters.distance[0] || profile.distance > filters.distance[1])) {
        return false;
      }
      
      // Apply age filter if we have a valid age
      if (profileAge > 0 && (profileAge < filters.ageRange[0] || profileAge > filters.ageRange[1])) {
        return false;
      }
      
      // Apply interests filter
      if (filters.interests.length > 0 && 
          (!profile.interests || !profile.interests.some(interest => filters.interests.includes(interest)))) {
        return false;
      }
      
      return true;
    });
    
    // Update profiles state with filtered profiles
    setProfiles(filteredProfiles);
    
    // Store active filters
    setActiveFilters(filters);
  };

  return (
    <View>
      {/* Filter Button */}
      <TouchableOpacity 
        onPress={() => setIsFilterOpen(true)}
        style={styles.filterButton}
      >
        <Ionicons name="options" size={18} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Filter Popup */}
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
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
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
  slider: {
    width: '100%',
    height: 40,
    marginTop: 5,
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
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