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
                <Text style={styles.distanceText}>{profile.distance}km</Text>
              </View>
              
              {/* Gradient overlay for better text visibility */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.imageGradient}
              >
                <Text style={styles.trendingProfileName} numberOfLines={1}>
                  {profile.displayName}
                </Text>
              </LinearGradient>
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
  imageGradient: {
    width: '100%',
    height: '50%', // Half height gradient from bottom
    justifyContent: 'flex-end',
    padding: 5,
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

export default TrendingProfiles;