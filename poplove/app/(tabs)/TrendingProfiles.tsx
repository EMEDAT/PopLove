// components/home/TrendingProfiles.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Dimensions 
} from 'react-native';

const { width } = Dimensions.get('window');

interface TrendingProfile {
  id: string;
  name: string;
  photoURL: string;
  distance: number;
}

interface TrendingProfilesProps {
  profiles: TrendingProfile[];
  onProfilePress: (profile: TrendingProfile) => void;
}

export function TrendingProfiles({ profiles, onProfilePress }: TrendingProfilesProps) {
  if (!profiles || profiles.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trending profiles</Text>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {profiles.map((profile) => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => onProfilePress(profile)}
          >
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: profile.photoURL }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
              <View style={styles.distanceIndicator}>
                <Text style={styles.distanceText}>{profile.distance}km</Text>
              </View>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  profileCard: {
    width: (width - 60) / 3.5,
    marginHorizontal: 5,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  distanceIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
  },
  profileName: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default TrendingProfiles;