// components/home/TrendingProfiles.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ImageBackground 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface TrendingProfile {
  id: string;
  displayName: string;
  photoURL: string;
  distance: number;
  ageRange?: string;
}

interface TrendingProfilesProps {
  profiles: TrendingProfile[];
  onProfilePress?: (profile: TrendingProfile) => void;
}

export function TrendingProfiles({ profiles, onProfilePress }: TrendingProfilesProps) {
  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.trendingSection}>
      <Text style={styles.trendingTitle}>Trending profiles</Text>
      <View style={styles.trendingProfiles}>
        {profiles.slice(0, 4).map((profile, index) => (
          <TouchableOpacity
            key={profile.id || index}
            style={styles.trendingProfileCard}
            onPress={() => onProfilePress && onProfilePress(profile)}
          >
            <ImageBackground 
              source={{ uri: profile.photoURL }} 
              style={styles.trendingProfileImage}
              resizeMode="cover"
            >
              {/* Distance Indicator */}
              <View style={styles.distanceIndicator}>
                <BlurView intensity={60} tint="light" style={styles.blur2}>
                    <View style={styles.distanceContent}>
                    <Ionicons name="location-outline" size={10} color="white" />
                    <Text style={styles.distanceText}>{profile.distance}km</Text>
                    </View>
                </BlurView>
                </View>

              {/* Frosted Glass Name Section */}
              <View style={styles.bottomSection}>
                <BlurView style={styles.blur} intensity={80} tint="light">
                  {/* White Gradient to Ensure Visibility */}
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.6)', 'transparent']}
                    style={styles.gradientOverlay}
                  />
                  <Text style={styles.trendingProfileName} numberOfLines={1}>
                    {profile.displayName}
                  </Text>
                </BlurView>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trendingSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
  },
  trendingProfiles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendingProfileCard: {
    width: (width - 55) / 4,
    height: (width - 120) / 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingProfileImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 25,
    overflow: 'hidden',
  },
  blur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  distanceIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    zIndex: 1,
    overflow: 'hidden',
  },
  blur2: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },  
  distanceText: {
    color: '#fff',
    fontSize: 10,
  },
  distanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  trendingProfileName: {
    fontSize: 12,
    fontWeight: '400',
    color: '#fff', // Ensuring white text
    textShadowColor: 'rgba(0, 0, 0, 0.8)', // Soft shadow for better readability
    textShadowOffset: { width: 0.4, height: 0.4 },
    textShadowRadius: 1,
    textAlign: 'left', // Align text to the left
    alignSelf: 'flex-start', // Ensures text stays aligned left inside the container
    paddingLeft: 8, // Adds spacing from the left edge
    paddingBottom: 6, // More bottom padding for better visual balance
  },  
});

export default TrendingProfiles;
