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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import CountryItem from './CountryItem';

// Import countries from a country list library
import { countries } from 'countries-list';

const ITEM_HEIGHT = 50; 

interface LocationSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    country: string;
    customLocation?: string;
  }) => void;
}

export function LocationSelectionModal({ 
  visible, 
  onClose, 
  onSelectLocation 
}: LocationSelectionModalProps) {
  // Convert countries object to array and sort by name
  const [allCountries] = useState(() => {
    const countryArray = Object.entries(countries).map(([code, details]) => ({
      code,
      name: details.name
    }));
    
    return countryArray.sort((a, b) => {
      const cleanName = (name: string) => 
        name.replace(/^(The |A |An )/, '').trim();
      
      return cleanName(a.name).localeCompare(cleanName(b.name), undefined, { sensitivity: 'base' });
    });
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'countries' | 'custom'>('countries');

  // Filtered countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return allCountries;
    
    const cleanQuery = searchQuery.toLowerCase().trim();
    return allCountries.filter(country => 
      country.name.toLowerCase().includes(cleanQuery)
    );
  }, [allCountries, searchQuery]);

  const handleCountrySelect = (countryName: string) => {
    onSelectLocation({ country: countryName });
    onClose();
  };

  const [customLocation, setCustomLocation] = useState('');

  const handleCustomLocationSubmit = () => {
    if (customLocation.trim()) {
      onSelectLocation({
        country: 'Custom',
        customLocation: customLocation.trim(),
      });
      onClose();
    }
  };
  
  const getItemLayout = (_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const renderCountryItem = ({ item }: { item: any }) => (
    <CountryItem item={item} onSelect={handleCountrySelect} />
  );

  const handleSearch = debounce((query) => {
    setSearchQuery(query);
  }, 300);

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
      <View style={styles.countriesContainer}>
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
            placeholder="Search countries"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Countries List */}
        <FlatList
          data={filteredCountries}
          keyExtractor={(item) => item.code}
          renderItem={renderCountryItem}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={21}
          getItemLayout={getItemLayout}
        />
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
  countriesContainer: {
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
  customLocationContainer: {
    flex: 1,
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