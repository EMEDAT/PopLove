// components/onboarding/LocationSelectionModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  StyleSheet,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import CountryItem from './CountryItem';
import CityItem from './CityItem';

// Import the LocationService
import LocationService from '../../services/location';

const ITEM_HEIGHT = 50; 

interface LocationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    country: string;
    city?: string;
    customLocation?: string;
  }) => void;
}

export function LocationSelectionModal({ 
  visible, 
  onClose, 
  onSelectLocation 
}: LocationSelectionModalProps) {
  // State management
  const [allCountries] = useState(() => LocationService.getAllCountries());
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'countries' | 'cities' | 'custom'>('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [customLocation, setCustomLocation] = useState('');

  // Handle search with debounce
  const handleSearch = debounce((query) => {
    setSearchQuery(query);
    
    if (view === 'countries') {
      const filtered = allCountries.filter(country => 
        country.name.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredItems(filtered);
    } else if (view === 'cities') {
      setLoading(true);
      // Search cities based on query
      const filteredCities = LocationService.searchCities(query);
      setFilteredItems(filteredCities);
      setLoading(false);
    }
  }, 300);

  // Set filtered items based on current view
  useMemo(() => {
    if (view === 'countries') {
      if (!searchQuery) {
        setFilteredItems(allCountries);
      } else {
        const filtered = allCountries.filter(country => 
          country.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredItems(filtered);
      }
    } else if (view === 'cities' && selectedCountry) {
      setLoading(true);
      
      // Show cities based on search query
      if (searchQuery) {
        const cities = LocationService.searchCities(searchQuery);
        setFilteredItems(cities);
      } else {
        // Without search, we show an empty array
        // You might want to show popular cities here in the future
        setFilteredItems([]);
      }
      
      setLoading(false);
    }
  }, [view, searchQuery, selectedCountry]);

  // Handle country selection
  const handleCountrySelect = (countryName: string) => {
    setSelectedCountry(countryName);
    setSearchQuery('');
    setView('cities');
  };

  // Handle city selection
  const handleCitySelect = (cityName: string) => {
    if (selectedCountry) {
      onSelectLocation({ 
        country: selectedCountry,
        city: cityName 
      });
      onClose();
    }
  };

  // Handle custom location submission
  const handleCustomLocationSubmit = () => {
    if (customLocation.trim()) {
      onSelectLocation({
        country: 'Custom',
        customLocation: customLocation.trim(),
      });
      onClose();
    }
  };
  
  // Set up FlatList item layout
  const getItemLayout = (_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  // Render list items based on current view
  const renderItem = ({ item }: { item: any }) => {
    if (view === 'countries') {
      return <CountryItem item={item} onSelect={handleCountrySelect} />;
    } else if (view === 'cities') {
      return <CityItem item={item} onSelect={handleCitySelect} />;
    }
    return null;
  };

  // Render content based on current view
  const renderContent = () => {
    if (view === 'custom') {
      return (
        <View style={styles.customLocationContainer}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setView('countries')}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
            <Text style={styles.backButtonText}>Back to Countries</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.customLocationInput}
            placeholder="Enter your specific location"
            value={customLocation}
            onChangeText={setCustomLocation}
            onSubmitEditing={handleCustomLocationSubmit}
            placeholderTextColor="#aaa"
          />
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleCustomLocationSubmit}
            disabled={!customLocation.trim()}
          >
            <Text style={[
              styles.submitButtonText,
              !customLocation.trim() && { opacity: 0.5 }
            ]}>
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {/* Custom Location Option at the Top */}
        <TouchableOpacity 
          style={styles.customLocationButton}
          onPress={() => setView('custom')}
        >
          <View style={styles.customLocationContent}>
            <Ionicons name="location-outline" size={24} color="#FF6B6B" />
            <Text style={styles.customLocationText}>Enter Custom Location</Text>
          </View>
        </TouchableOpacity>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#aaa" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={view === 'countries' ? "Search countries" : "Search cities"}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Navigation header for cities view */}
        {view === 'cities' && selectedCountry && (
          <TouchableOpacity 
            style={styles.navigationHeader} 
            onPress={() => {
              setView('countries');
              setSelectedCountry(null);
              setSearchQuery('');
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#000" />
            <Text style={styles.navigationHeaderText}>
              {selectedCountry} - Select a City
            </Text>
          </TouchableOpacity>
        )}

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Loading locations...</Text>
          </View>
        )}

        {/* List of items */}
        {!loading && (
          <>
            {filteredItems.length > 0 ? (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => view === 'countries' ? item.code : item.name}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={21}
                getItemLayout={getItemLayout}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {view === 'countries' 
                    ? "No countries found. Try a different search." 
                    : view === 'cities' && !searchQuery
                    ? "Type to search for cities in " + selectedCountry
                    : "No cities found. Try a different search."
                  }
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  customLocationButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customLocationText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navigationHeaderText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  customLocationContainer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  customLocationInput: {
    margin: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  submitButton: {
    marginHorizontal: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});