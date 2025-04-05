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
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

interface LocationSelectionProps {
  selectedLocation: {
    latitude: number;
    longitude: number;
    address: string;
    formattedAddress?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    formattedAddress?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    country?: string;
  }) => void;
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
  const [rawAddress, setRawAddress] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15); // Used for neighborhood detection

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status === 'granted');
        
        if (status === 'granted') {
          await getCurrentLocation();
        } else {
          setLocationError('Location permission not granted');
          // Set default location if permission not granted
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
            setRawAddress(selectedLocation.address);
            setFormattedAddress(selectedLocation.formattedAddress || formatAddressFromRaw(selectedLocation.address));
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Failed to get your location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
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
      
      // Reverse geocode to get address details
      const addressDetails = await reverseGeocode(latitude, longitude);
      setRawAddress(addressDetails.address);
      setFormattedAddress(formatAddressFromRaw(addressDetails.address));
      
      // Populate the selected location
      onLocationSelect({
        latitude,
        longitude,
        address: addressDetails.address,
        formattedAddress: formatAddressFromRaw(addressDetails.address),
        neighborhood: addressDetails.neighborhood,
        city: addressDetails.city,
        state: addressDetails.state,
        country: addressDetails.country,
      });
      
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError('Failed to get your current location');
      
      // Fall back to default or selected location
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
        setRawAddress(selectedLocation.address);
        setFormattedAddress(selectedLocation.formattedAddress || formatAddressFromRaw(selectedLocation.address));
      }
    } finally {
      setLoading(false);
    }
  };

  // Parse and format address to remove coordinates and unnecessary details
  const formatAddressFromRaw = (address: string): string => {
    // Remove coordinate patterns like "2W4W+79X, "
    const withoutCoordinates = address.replace(/\b[A-Z0-9]{4}\+[A-Z0-9]{3}\b,?\s*/g, '');
    
    // Remove "Unnamed Road", "Unknown Location", etc.
    const withoutUnnamed = withoutCoordinates
      .replace(/unnamed road,?\s*/gi, '')
      .replace(/unknown location,?\s*/gi, '');
    
    // Split by commas to get components
    const components = withoutUnnamed.split(',').map(c => c.trim()).filter(Boolean);
    
    // If we have at least city, state/region, country
    if (components.length >= 3) {
      return components.slice(-3).join(', ');
    }
    
    // If we have at least city, country
    if (components.length >= 2) {
      return components.slice(-2).join(', ');
    }
    
    // Return whatever we have left
    return withoutUnnamed;
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
        const location = reverseGeocodedAddress[0];
        const address = formatAddress(location);
        
        return {
          address,
          neighborhood: location.district || location.subregion || '',
          city: location.city || '',
          state: location.region || '',
          country: location.country || '',
        };
      }
      
      return {
        address: 'Unknown location',
        neighborhood: '',
        city: '',
        state: '',
        country: '',
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return {
        address: 'Error getting address',
        neighborhood: '',
        city: '',
        state: '',
        country: '',
      };
    }
  };

  // Format address from location object
  const formatAddress = (location: Location.LocationGeocodedAddress) => {
    const parts = [
      location.name,
      location.street,
      location.district,
      location.city,
      location.region,
      location.country,
    ].filter(Boolean);
    
    return parts.join(', ');
  };

  // Forward geocode to get coordinates from address
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setShowSearchResults(false);
    
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
        
        // Reverse geocode to get address details
        const addressDetails = await reverseGeocode(latitude, longitude);
        setRawAddress(addressDetails.address);
        setFormattedAddress(formatAddressFromRaw(addressDetails.address));
        
        // Update selected location
        onLocationSelect({
          latitude,
          longitude,
          address: addressDetails.address,
          formattedAddress: formatAddressFromRaw(addressDetails.address),
          neighborhood: addressDetails.neighborhood,
          city: addressDetails.city,
          state: addressDetails.state,
          country: addressDetails.country,
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
      Alert.alert('Error', 'Failed to search location');
    } finally {
      setLoading(false);
    }
  };

  // Handle map press to drop pin
  const handleMapPress = async (event: any) => {
    const { coordinate } = event.nativeEvent;
    
    setMarkerPosition(coordinate);
    
    // Reverse geocode to get address
    const addressDetails = await reverseGeocode(
      coordinate.latitude,
      coordinate.longitude
    );
    
    setRawAddress(addressDetails.address);
    const processed = formatAddressFromRaw(addressDetails.address);
    setFormattedAddress(processed);
    
    // Update selected location
    onLocationSelect({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      address: addressDetails.address,
      formattedAddress: processed,
      neighborhood: addressDetails.neighborhood,
      city: addressDetails.city,
      state: addressDetails.state,
      country: addressDetails.country,
    });
  };

  // Handle region change (when user moves or zooms the map)
  const handleRegionChange = (newRegion: Region) => {
    setRegion(newRegion);
    
    // Adjust zoomLevel based on latitudeDelta
    // Lower latitudeDelta = higher zoom
    if (newRegion.latitudeDelta < 0.01) {
      setZoomLevel(18); // Very close (neighborhood)
    } else if (newRegion.latitudeDelta < 0.05) {
      setZoomLevel(15); // Close (town/district)
    } else if (newRegion.latitudeDelta < 0.1) {
      setZoomLevel(12); // Medium (city)
    } else if (newRegion.latitudeDelta < 1) {
      setZoomLevel(8); // Far (region)
    } else {
      setZoomLevel(5); // Very far (country)
    }
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

  // Handle manual location edit
  const handleEditLocation = () => {
    setIsEditingAddress(true);
  };

  // Save edited location
  const handleSaveLocation = () => {
    setIsEditingAddress(false);
    
    if (!formattedAddress.trim()) {
      // Don't allow empty address
      setFormattedAddress(formatAddressFromRaw(rawAddress));
      return;
    }
    
    // Update location with manual edit
    if (markerPosition) {
      onLocationSelect({
        latitude: markerPosition.latitude,
        longitude: markerPosition.longitude,
        address: rawAddress,
        formattedAddress: formattedAddress,
        city: selectedLocation?.city || '',
        state: selectedLocation?.state || '',
        country: selectedLocation?.country || ''
      });
    }
  };

  // Check if we have enough information to proceed
  const hasValidLocation = () => {
    return (
      markerPosition &&
      formattedAddress &&
      formattedAddress.trim() !== 'Unknown location' &&
      formattedAddress.trim() !== 'Error getting address'
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
          Only the neighborhood name will appear on your profile.
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Enter your city, neighborhood, or area"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={searchAddress}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            onFocus={() => setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
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
            onRegionChangeComplete={handleRegionChange}
            onPress={handleMapPress}
            showsUserLocation={locationPermission}
            showsMyLocationButton={false}
            showsCompass={true}
          >
            {markerPosition && (
              <Marker
                coordinate={markerPosition}
                title="Selected Location"
                description={formattedAddress}
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
          
          {/* Zoom Info Overlay */}
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

      {/* Address Display & Edit */}
      <View style={styles.addressContainer}>
        {formattedAddress ? (
          <>
            <View style={styles.addressHeader}>
              <Text style={styles.addressLabel}>Your location:</Text>
              {!isEditingAddress ? (
                <TouchableOpacity onPress={handleEditLocation}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSaveLocation}>
                  <Text style={styles.saveButton}>Save</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingAddress ? (
              <TextInput
                style={styles.addressInput}
                value={formattedAddress}
                onChangeText={setFormattedAddress}
                autoFocus={true}
                onBlur={handleSaveLocation}
                onSubmitEditing={handleSaveLocation}
              />
            ) : (
              <Text style={styles.addressText}>{formattedAddress}</Text>
            )}
          </>
        ) : locationError ? (
          <Text style={styles.errorText}>{locationError}</Text>
        ) : (
          <Text style={styles.promptText}>
            Tap on the map to select your location
          </Text>
        )}
      </View>
      
      {/* Bottom Information */}
      <View style={styles.infoContainer}>
        <Ionicons name="shield-checkmark" size={20} color="#555" />
        <Text style={styles.infoText}>
          We use your location to help you find matches nearby.
          Only your neighborhood will be shown on your profile.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 14,
    color: '#666',
  },
  editButton: {
    color: '#FF6B6B',
    fontWeight: '500',
    fontSize: 14,
  },
  saveButton: {
    color: '#4CAF50',
    fontWeight: '500',
    fontSize: 14,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
  },
  addressInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    padding: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  promptText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#555',
  },
});