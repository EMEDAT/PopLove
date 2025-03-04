// components/home/TrendingProfiles.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ImageBackground,
  Platform 
} from 'react-native';
import { BlurView } from 'expo-blur';

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
                <Text style={styles.distanceText}>{profile.distance}km</Text>
              </View>
              
              {/* Real blur effect at the bottom */}
              <View style={styles.bottomSection}>
                {Platform.OS === 'ios' ? (
                  // iOS uses native BlurView
                  <BlurView 
                    style={styles.blur}
                    intensity={90}
                    tint="dark"
                  >
                    <Text style={styles.trendingProfileName} numberOfLines={1}>
                      {profile.displayName}
                    </Text>
                  </BlurView>
                ) : (
                  // Android fallback with semi-transparent background
                  <View style={[styles.blur, styles.androidBlur]}>
                    <Text style={styles.trendingProfileName} numberOfLines={1}>
                      {profile.displayName}
                    </Text>
                  </View>
                )}
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  trendingProfiles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trendingProfileCard: {
    width: (width - 55) / 4,
    height: (width - 120) / 2, // Increased height for rectangular cards
    borderRadius: 12,
    overflow: 'hidden',
  },
  trendingProfileImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end', // Align children to bottom
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24, // Adjust based on your design
    overflow: 'hidden',
  },
  blur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  androidBlur: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
  },
  trendingProfileName: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
});

export default TrendingProfiles