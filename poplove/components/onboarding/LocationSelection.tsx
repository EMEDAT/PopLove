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
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Define location interface with Firestore-compatible fields
interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  formattedAddress?: string;
  useExactAddress?: boolean;
}

interface LocationSelectionProps {
  selectedLocation: LocationData | null;
  onLocationSelect: (location: LocationData) => void;
  updateProfile: (field: string, value: any) => void;
}

export default function LocationSelection({
  selectedLocation,
  onLocationSelect,
  updateProfile,
}: LocationSelectionProps) {
  // Refs
  const mapRef = useRef<MapView | null>(null);
  const searchInputRef = useRef<TextInput | null>(null);
  const isAnimatingRef = useRef(false);
  
  // State management
  const [region, setRegion] = useState<Region>({
    latitude: 5.033, // Default to Uyo, Nigeria
    longitude: 7.9,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });
  const [markerPosition, setMarkerPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  // Location text states
  const [exactAddress, setExactAddress] = useState('');
  const [cityCountryAddress, setCityCountryAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [useExactAddress, setUseExactAddress] = useState(false);
  
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
      
      // Initialize address states
      if (selectedLocation.address) {
        setExactAddress(selectedLocation.address);
      }
      
      // Create city/country format
      let cityCountry = '';
      if (selectedLocation.city) {
        cityCountry = selectedLocation.city;
      }
      if (selectedLocation.state) {
        if (cityCountry) cityCountry += ', ';
        cityCountry += selectedLocation.state;
      }
      if (selectedLocation.country) {
        if (cityCountry) cityCountry += ', ';
        cityCountry += selectedLocation.country;
      }
      
      if (cityCountry) {
        setCityCountryAddress(cityCountry);
      } else if (selectedLocation.address) {
        // Fallback if no city/country
        setCityCountryAddress(selectedLocation.address);
      }
      
      // Set toggle state
      if (selectedLocation.useExactAddress !== undefined) {
        setUseExactAddress(selectedLocation.useExactAddress);
      }
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

  // Animate map to a new region WITHOUT updating state to prevent flickering
  const animateMapToRegion = (coords: { latitude: number; longitude: number }) => {
    if (isAnimatingRef.current || !mapRef.current) return;
    
    isAnimatingRef.current = true;
    
    // Only animate the map, don't update the state directly
    mapRef.current.animateToRegion({
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: LATITUDE_DELTA,
      longitudeDelta: LONGITUDE_DELTA,
    }, 500);
    
    // Reset flag after animation is likely complete
    setTimeout(() => {
      isAnimatingRef.current = false;
    }, 600);
  };

  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      // Check for permissions first
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          throw new Error('Location permission not granted');
        }
      }

      // Attempt to get current location with more relaxed accuracy requirements
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true
      }).catch(async (error) => {
        console.log('Error with high accuracy, trying lower accuracy:', error);
        // Fall back to a lower accuracy if high accuracy fails
        return await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low
        });
      });
      
      const { latitude, longitude } = location.coords;
      
      // Update marker position
      setMarkerPosition({
        latitude,
        longitude,
      });
      
      // Animate map without state update to prevent flickering
      animateMapToRegion({ latitude, longitude });
      
      // Try to get address information
      try {
        const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
          latitude, 
          longitude
        });
        
        if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
          const locationData = reverseGeocodedAddress[0];
          
          // Filter out Plus Codes (like 2W2P+WVC)
          const isPlusCode = (str) => {
            if (!str) return false;
            return /^[A-Z0-9]{4,6}\+[A-Z0-9]{2,3}$/i.test(str);
          };
          
          // Build exact address, removing plus codes
          let fullAddress = '';
          if (locationData.name && !isPlusCode(locationData.name)) {
            fullAddress += locationData.name;
          }
          
          if (locationData.street) {
            if (fullAddress) fullAddress += ', ';
            fullAddress += locationData.street;
          }
          
          if (locationData.city) {
            if (fullAddress) fullAddress += ', ';
            fullAddress += locationData.city;
          }
          
          if (locationData.region) {
            if (fullAddress) fullAddress += ', ';
            fullAddress += locationData.region;
          }
          
          if (locationData.country) {
            if (fullAddress) fullAddress += ', ';
            fullAddress += locationData.country;
          }
          
          // If we still don't have a good address, use the default format
          if (!fullAddress || fullAddress.includes("Unnamed Road") || isPlusCode(fullAddress)) {
            const defaultAddress = "16 Nung Akpa Ime Street, Uyo, Akwa Ibom, Nigeria";
            console.log("Using default address instead of:", fullAddress);
            setExactAddress(defaultAddress);
          } else {
            setExactAddress(fullAddress);
          }
          
          // Build city, country format
          let cityCountry = '';
          if (locationData.city) {
            cityCountry = locationData.city;
          }
          if (locationData.region) {
            if (cityCountry) cityCountry += ', ';
            cityCountry += locationData.region;
          }
          if (locationData.country) {
            if (cityCountry) cityCountry += ', ';
            cityCountry += locationData.country;
          }
          
          // Set city/country or default to "Uyo, Akwa Ibom, Nigeria" if not available
          if (!cityCountry) {
            cityCountry = "Uyo, Akwa Ibom, Nigeria";
          }
          setCityCountryAddress(cityCountry);
          
          // Update the selected location
          const addressToUse = fullAddress || "16 Nung Akpa Ime Street, Uyo, Akwa Ibom, Nigeria";
          updateLocationData(
            latitude, 
            longitude, 
            addressToUse,
            locationData.city || "Uyo", 
            locationData.region || "Akwa Ibom", 
            locationData.country || "Nigeria"
          );
        } else {
          // Use default address for Uyo
          const defaultAddress = "16 Nung Akpa Ime Street, Uyo, Akwa Ibom, Nigeria";
          setExactAddress(defaultAddress);
          setCityCountryAddress("Uyo, Akwa Ibom, Nigeria");
          
          // Call with default values for Uyo
          updateLocationData(
            latitude, longitude, 
            defaultAddress,
            "Uyo", 
            "Akwa Ibom", 
            "Nigeria"
          );
        }
      } catch (geocodeError) {
        console.error('Error reverse geocoding:', geocodeError);
        
        // Use default address for Uyo
        const defaultAddress = "16 Nung Akpa Ime Street, Uyo, Akwa Ibom, Nigeria";
        setExactAddress(defaultAddress);
        setCityCountryAddress("Uyo, Akwa Ibom, Nigeria");
        
        // Call with default values
        updateLocationData(
          latitude, longitude, 
          defaultAddress,
          "Uyo", 
          "Akwa Ibom", 
          "Nigeria"
        );
      }
      
    } catch (error) {
      console.error('Error getting current location:', error);
      setLocationError('Failed to get your current location. Please enter location manually.');
      
      // Even if we can't get the current location, set a default location for Uyo
      // This ensures next button can still be activated
      const defaultLat = 5.033;
      const defaultLng = 7.9;
      
      setMarkerPosition({
        latitude: defaultLat,
        longitude: defaultLng,
      });
      
      // Animate map without state update to prevent flickering
      animateMapToRegion({ latitude: defaultLat, longitude: defaultLng });
      
      // Set default values
      const defaultAddress = "16 Nung Akpa Ime Street, Uyo, Akwa Ibom, Nigeria";
      setExactAddress(defaultAddress);
      setCityCountryAddress("Uyo, Akwa Ibom, Nigeria");
      
      // Update with default values
      updateLocationData(
        defaultLat, defaultLng, 
        defaultAddress,
        "Uyo", 
        "Akwa Ibom", 
        "Nigeria"
      );
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
        
        // Update marker position first
        setMarkerPosition({
          latitude,
          longitude,
        });
        
        // Animate map without updating region state to prevent flickering
        animateMapToRegion({ latitude, longitude });
        
        // Try to reverse geocode to get full address details
        try {
          const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          
          if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
            const locationData = reverseGeocodedAddress[0];
            
            // Use the search query for the exact address
            setExactAddress(searchQuery);
            
            // Build city, country format
            let cityCountry = '';
            if (locationData.city) {
              cityCountry = locationData.city;
            }
            if (locationData.region) {
              if (cityCountry) cityCountry += ', ';
              cityCountry += locationData.region;
            }
            if (locationData.country) {
              if (cityCountry) cityCountry += ', ';
              cityCountry += locationData.country;
            }
            
            setCityCountryAddress(cityCountry || searchQuery);
            
            // Update the selected location
            updateLocationData(
              latitude, 
              longitude, 
              searchQuery, 
              locationData.city || null, 
              locationData.region || null, 
              locationData.country || null
            );
          } else {
            // Use search query for both exact and city/country
            setExactAddress(searchQuery);
            setCityCountryAddress(searchQuery);
            
            // Call with null values for geodata
            updateLocationData(latitude, longitude, searchQuery, null, null, null);
          }
        } catch (reverseError) {
          // Use search query for both exact and city/country
          setExactAddress(searchQuery);
          setCityCountryAddress(searchQuery);
          
          // Call with null values for geodata
          updateLocationData(latitude, longitude, searchQuery, null, null, null);
        }
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
    
    try {
      const reverseGeocodedAddress = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      
      if (reverseGeocodedAddress && reverseGeocodedAddress.length > 0) {
        const locationData = reverseGeocodedAddress[0];
        
        // Build exact address
        let fullAddress = '';
        if (locationData.name) {
          fullAddress += locationData.name;
        }
        if (locationData.street) {
          if (fullAddress) fullAddress += ', ';
          fullAddress += locationData.street;
        }
        if (locationData.city) {
          if (fullAddress) fullAddress += ', ';
          fullAddress += locationData.city;
        }
        if (locationData.region) {
          if (fullAddress) fullAddress += ', ';
          fullAddress += locationData.region;
        }
        if (locationData.country) {
          if (fullAddress) fullAddress += ', ';
          fullAddress += locationData.country;
        }
        
        // For a map tap, don't override user's manual entry if it exists
        if (!exactAddress) {
          setExactAddress(fullAddress);
        }
        
        // Build city, country format
        let cityCountry = '';
        if (locationData.city) {
          cityCountry = locationData.city;
        }
        if (locationData.region) {
          if (cityCountry) cityCountry += ', ';
          cityCountry += locationData.region;
        }
        if (locationData.country) {
          if (cityCountry) cityCountry += ', ';
          cityCountry += locationData.country;
        }
        
        if (!cityCountryAddress) {
          setCityCountryAddress(cityCountry);
        }
        
        // Update the selected location
        updateLocationData(
          coordinate.latitude, 
          coordinate.longitude, 
          exactAddress || fullAddress, 
          locationData.city || null, 
          locationData.region || null, 
          locationData.country || null
        );
      } else {
        // If reverse geocoding fails, just use coordinates
        if (!exactAddress) {
          const coordsString = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;
          setExactAddress(coordsString);
        }
        
        // Keep the cityCountryAddress as is
        
        // Update with existing address text
        updateLocationData(
          coordinate.latitude, 
          coordinate.longitude, 
          exactAddress, 
          null, 
          null, 
          null
        );
      }
    } catch (error) {
      console.error('Error reverse geocoding map tap:', error);
      
      // If error, maintain current address text
      updateLocationData(
        coordinate.latitude, 
        coordinate.longitude, 
        exactAddress, 
        null, 
        null, 
        null
      );
    }
  };

  // Central function to update location data with full Firestore-compatible structure
  const updateLocationData = (
    latitude: number, 
    longitude: number, 
    address: string, 
    city: string | null, 
    state: string | null, 
    country: string | null
  ) => {
    // Create a Firestore-compatible location object
    const locationData: LocationData = {
      latitude,
      longitude,
      address: address || '',
      city: city || null,
      state: state || null,
      country: country || null,
      formattedAddress: !useExactAddress ? (address || '') : (`${city || ''}, ${country || ''}`.trim()),
      useExactAddress: useExactAddress  // Keep this as-is
    };
    
    // Call the parent component's callback
    onLocationSelect(locationData);
  };

  // Zoom controls
  const zoomIn = () => {
    if (isAnimatingRef.current || !mapRef.current) return;
    
    isAnimatingRef.current = true;
    
    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    };
    
    mapRef.current.animateToRegion(newRegion, 300);
    
    // Update region state after animation completes
    setTimeout(() => {
      setRegion(newRegion);
      isAnimatingRef.current = false;
    }, 350);
  };

  const zoomOut = () => {
    if (isAnimatingRef.current || !mapRef.current) return;
    
    isAnimatingRef.current = true;
    
    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
      longitudeDelta: region.longitudeDelta * 2,
    };
    
    mapRef.current.animateToRegion(newRegion, 300);
    
    // Update region state after animation completes
    setTimeout(() => {
      setRegion(newRegion);
      isAnimatingRef.current = false;
    }, 350);
  };

  // Handle manual address edit
  const handleExactAddressChange = (text: string) => {
    setExactAddress(text);
    
    // Update the location data with the new address
    if (markerPosition) {
      updateLocationData(
        markerPosition.latitude, 
        markerPosition.longitude, 
        text,
        selectedLocation?.city || null,
        selectedLocation?.state || null,
        selectedLocation?.country || null
      );
    }
  };

  // Handle toggle change
  const handleToggleExactAddress = (value: boolean) => {
    setUseExactAddress(value);
    
    // Update the location data with the new toggle state
    if (markerPosition) {
      updateLocationData(
        markerPosition.latitude, 
        markerPosition.longitude, 
        exactAddress,
        selectedLocation?.city || null,
        selectedLocation?.state || null,
        selectedLocation?.country || null
      );
    }
  };

  // Determine display address based on toggle
  const displayAddress = useExactAddress ? exactAddress : cityCountryAddress;

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
          This helps us match you with people nearby
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search your city or address"
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
          disabled={loading || !searchQuery.trim()}
        >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchButtonGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </LinearGradient>
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
            initialRegion={region}
            onRegionChangeComplete={(newRegion) => {
              // Only update region state when not animating to prevent flickering
              if (!isAnimatingRef.current) {
                setRegion(newRegion);
              }
            }}
            onPress={handleMapPress}
            showsUserLocation={locationPermission}
            showsMyLocationButton={false}
            showsCompass={true}
            moveOnMarkerPress={false}
          >
            {markerPosition && (
              <Marker
                coordinate={markerPosition}
                title="Selected Location"
                description={displayAddress}
                pinColor="#FF6B6B"
              />
            )}
          </MapView>
          
          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={zoomIn}
              disabled={isAnimatingRef.current}
            >
              <Ionicons name="add" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.zoomButton} 
              onPress={zoomOut}
              disabled={isAnimatingRef.current}
            >
              <Ionicons name="remove" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Current Location Button */}
          <TouchableOpacity 
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={loading || isAnimatingRef.current}
          >
            <Ionicons name="locate" size={24} color={loading ? "#999" : "#333"} />
          </TouchableOpacity>
          
          {/* Info Overlay */}
          <View style={styles.zoomInfoContainer}>
            <View style={styles.zoomInfoContent}>
              <Ionicons name="information-circle" size={16} color="#fff" />
              <Text style={styles.zoomInfoText}>
                Tap the map to select your location
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Address Display & Edit */}
      <View style={styles.addressContainer}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressLabel}>Your address:</Text>
        </View>
        
        <TextInput
          style={styles.addressInput}
          value={exactAddress}
          onChangeText={handleExactAddressChange}
          placeholder="Enter your address (e.g. 16 Nung Akpa Ime, Uyo)"
          placeholderTextColor="#999"
        />
        
        {locationError && (
          <Text style={styles.errorText}>{locationError}</Text>
        )}
      </View>
      
      {/* Display toggle */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleTextContainer}>
          <Text style={styles.toggleTitle}>Show exact address</Text>
          <Text style={styles.toggleSubtitle}>
            When off, only your city and country will be shown
          </Text>
        </View>
        <Switch
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={useExactAddress ? '#fff' : '#fff'}
          ios_backgroundColor="#E5E5E5"
          onValueChange={value => {
            setUseExactAddress(value);
            updateProfile('useExactAddress', value);
          }}
          value={useExactAddress}
        />
      </View>
      
      {/* Address Preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>How others will see your location:</Text>
        <Text style={styles.previewAddress}>{displayAddress}</Text>
      </View>
      
      {/* Bottom Information */}
      <View style={styles.infoContainer}>
        <Ionicons name="shield-checkmark" size={20} color="#555" />
        <Text style={styles.infoText}>
          Your location helps find matches nearby. You can choose how much detail to share.
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
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: '#161616',
  },
  subText: {
    fontSize: 12,
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
    fontSize: 13,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  searchButton: {
    borderRadius: 8,
    minWidth: 80,
    overflow: 'hidden', // This is important for the gradient to be contained
  },
  searchButtonGradient: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  mapContainer: {
    height: 310,
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
    right: 40,
    bottom: 40,
    alignItems: 'center',
  },
  zoomInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  zoomInfoText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  addressInput: {
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  previewContainer: {
    backgroundColor: '#FFFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  previewAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#555',
  },
});