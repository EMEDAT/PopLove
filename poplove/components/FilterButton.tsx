import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  ScrollView,
  TouchableWithoutFeedback,
  Dimensions,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';

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

const FilterPopup = ({ visible, onClose, onApply }) => {
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

  const getLocations = async (): Promise<LocationData[]> => {
    try {
      const locationService = require('../../services/location').default;
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

  return (
    <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
    statusBarTranslucent={true} // Add this
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
                    onValueChange={(value) => setFilters({...filters, location: value})}
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
                    <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1} // Add this line
                    value={filters.distance[1]}
                    onValueChange={(value) => setFilters({...filters, distance: [filters.distance[0], Math.round(value)]})}
                    minimumTrackTintColor="#FF6B6B"
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor="#FF6B6B"
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
                    <View style={styles.doubleSliderContainer}>
                    <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1} // Add this line
                    value={filters.distance[1]}
                    onValueChange={(value) => setFilters({...filters, distance: [filters.distance[0], Math.round(value)]})}
                    minimumTrackTintColor="#FF6B6B"
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor="#FF6B6B"
                    />
                    <Slider
                    style={styles.slider}
                    minimumValue={1}
                    maximumValue={100}
                    step={1} // Add this line
                    value={filters.distance[1]}
                    onValueChange={(value) => setFilters({...filters, distance: [filters.distance[0], Math.round(value)]})}
                    minimumTrackTintColor="#FF6B6B"
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor="#FF6B6B"
                    />
                    </View>
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
const FilterButton = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);

  const handleFilterApply = (filters) => {
    // Apply filters to your data
    const filteredProfiles = yourProfiles.filter(profile => {
      // Apply location filter
      if (filters.location && profile.location !== filters.location) {
        return false;
      }
      
      // Apply distance filter
      if (profile.distance < filters.distance[0] || profile.distance > filters.distance[1]) {
        return false;
      }
      
      // Apply age filter
      if (profile.age < filters.ageRange[0] || profile.age > filters.ageRange[1]) {
        return false;
      }
      
      // Apply interests filter
      if (filters.interests.length > 0 && !filters.interests.some(interest => profile.interests.includes(interest))) {
        return false;
      }
      
      return true;
    });
    
    // Update your state with filtered profiles
    setProfiles(filteredProfiles);
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
    justifyContent: 'flex-end', // Change to flex-end
    alignItems: 'center',
  },
  modalContent: {
    width: '100%', // Full width
    height: '85%', // Limit height
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
    marginBottom: 5,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#666',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  doubleSliderContainer: {
    flexDirection: 'column',
  },
  doubleSlider: {
    width: '100%',
    height: 40,
  },
  interestContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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