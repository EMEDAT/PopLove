// components/onboarding/LocationSelection.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Define simplified location interface
interface LocationData {
  // Basic location info
  address: string;
  
  // Coordinates (for mapping)
  latitude: number;
  longitude: number;
}

interface LocationSelectionProps {
  selectedLocation: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
}

export default function LocationSelection({
  selectedLocation,
  onLocationSelect,
}: LocationSelectionProps) {
  // Refs
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  
  // State management
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128, // Default to New York
    longitude: -74.006,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [markerPosition, setMarkerPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  // Location text state
  const [manualLocationText, setManualLocationText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Initialize with existing data if available
  useEffect(() => {
    if (selectedLocation) {
      setMarkerPosition({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });
      
      setRegion({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
      
      // Initialize the manual location text from selected location
      setManualLocationText(selectedLocation.address || '');
    }
    
    // Request location permissions
    requestLocationPermission();
  }, []);
  
  // Request location permission
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted' && !selectedLocation) {
        getCurrentLocation();
      }
    } catch (error) {
      console.log('Error requesting location permission:', error);
      setLocationError('Failed to request location permission');
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Lower accuracy to avoid errors
      });
      
      const { latitude, longitude } = location.coords;
      
      // Update region and marker position
      setRegion({
        latitude,
        longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
      
      setMarkerPosition({
        latitude,
        longitude,
      });
      
      // Try to get address information, but handle errors gracefully
      try {
        const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
          const location = reverseGeocodedAddress[0];
          
          // Construct location string
          let locationString = '';
          
          if (location.name) {
            locationString += location.name;
          }
          
          if (location.city) {
            if (locationString) locationString += ', ';
            locationString += location.city;
          }
          
          if (location.region) {
            if (locationString) locationString += ', ';
            locationString += location.region;
          }
          
          if (location.country) {
            if (locationString) locationString += ', ';
            locationString += location.country;
          }
          
          // Set the manual location text and update parent
          setManualLocationText(locationString);
          
          // Update the selected location with simplified data structure
          onLocationSelect({
            latitude,
            longitude,
            address: locationString
          });
        } else {
          // Fallback to coordinates
          const coordsString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setManualLocationText('');
          onLocationSelect({
            latitude,
            longitude,
            address: ''  // Empty string to prompt user to enter an address
          });
        }
      } catch (geocodeError) {
        console.error('Error reverse geocoding:', geocodeError);
        
        // If reverse geocoding fails, just use coordinates and let user edit manually
        setManualLocationText('');
        
        // Update the location with coordinates only
        onLocationSelect({
          latitude,
          longitude,
          address: ''  // Empty string to prompt user to enter an address
        });
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError('Failed to get your current location. Please enter location manually.');
    } finally {
      setLoading(false);
    }
  };

  // Forward geocode (search by address)
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    try {
      const geocodedLocations = await Location.geocodeAsync(searchQuery);
      
      if (geocodedLocations && geocodedLocations.length > 0) {
        const { latitude, longitude } = geocodedLocations[0];
        
        // Update region and marker position
        setRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
        
        setMarkerPosition({
          latitude,
          longitude,
        });
        
        // Just use the search query as the location
        setManualLocationText(searchQuery);
        
        // Update the selected location with simplified data
        onLocationSelect({
          latitude,
          longitude,
          address: searchQuery
        });
        
        // Animate to the new region
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        });
      } else {
        Alert.alert('Location not found', 'Please try a different search term');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      Alert.alert('Error', 'Failed to search location. Please try again or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  // Handle map press to drop pin
  const handleMapPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    setMarkerPosition(coordinate);
    
    // Update location with current manual text and new coordinates
    onLocationSelect({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      address: manualLocationText
    });
  };

  // Zoom controls
  const zoomIn = () => {
    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    };
    
    mapRef.current?.animateToRegion(newRegion);
  };

  const zoomOut = () => {
    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
      longitudeDelta: region.longitudeDelta * 2,
    };
    
    mapRef.current?.animateToRegion(newRegion);
  };

  // Handle manual location changes
  const handleLocationTextChange = (text: string) => {
    setManualLocationText(text);
    
    // Update the selected location with the manual text
    if (markerPosition) {
      onLocationSelect({
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
        address: text
      });
    }
  };

  // Check if we have enough information to proceed
  const hasValidLocation = () => {
    return (
      markerPosition &&
      manualLocationText &&
      manualLocationText.trim() !== ''
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Where do you live?</Text>
        <Text style={styles.subText}>
          Enter your address to help us find matches nearby
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search for your location"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchAddress}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.searchButton} 
          onPress={searchAddress}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      {loading && !markerPosition ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            showsUserLocation={locationPermission}
            showsMyLocationButton={false}
            showsCompass={true}
          >
            {markerPosition && (
              <Marker
                coordinate={markerPosition}
                title="Selected Location"
                description={manualLocationText}
                pinColor="#FF6B6B"
              />
            )}
          </MapView>
          
          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
              <Ionicons name="remove" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Current Location Button */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="#333" />
          </TouchableOpacity>
          
          {/* Info Overlay */}
          <View style={styles.zoomInfoContainer}>
            <View style={styles.zoomInfoContent}>
              <Ionicons name="information-circle" size={20} color="#fff" />
              <Text style={styles.zoomInfoText}>
                Tap the map to select your location
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Location Display & Edit */}
      <View style={styles.addressContainer}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressLabel}>Your address:</Text>
        </View>
        
        <TextInput
          style={styles.addressInput}
          value={manualLocationText}
          onChangeText={handleLocationTextChange}
          placeholder="Enter your address (e.g. 16 Nung Akpa Ime, Uyo)"
          placeholderTextColor="#999"
        />
        
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
      </View>
      
      {/* Helper Text */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#555" />
        <Text style={styles.infoText}>
          Please enter your complete address including street, number, and city. You can edit it manually to ensure accuracy.
        </Text>
      </View>
      
      {/* Bottom Information */}
      <View style={styles.infoContainer}>
        <Ionicons name="shield-checkmark" size={20} color="#555" />
        <Text style={styles.infoText}>
          Your exact address won't be shown to other users. We use it only for matching and distance calculations.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F2F1ED',
  },
  header: {
    marginBottom: 15,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  searchButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 15,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e1e1e1',
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  zoomInfoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60,
    alignItems: 'center',
  },
  zoomInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoomInfoText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
  },
  addressContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  addressHeader: {
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  addressInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#555',
  },
});