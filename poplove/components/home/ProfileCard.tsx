// components/home/ProfileCard.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.62;

interface ProfileCardProps {
  profile: {
    id: string;
    displayName: string;
    ageRange: string;
    photoURL: string;
    location: string;
    profession?: string;
    interests?: string[];
  };
  onLike: () => void;
  onPass: () => void;
  cardStyle?: any;
  panHandlers?: any;
  likeOpacity?: Animated.AnimatedInterpolation<number>;
  dislikeOpacity?: Animated.AnimatedInterpolation<number>;
}

export function ProfileCard({ 
  profile, 
  onLike, 
  onPass, 
  cardStyle, 
  panHandlers = {},
  likeOpacity,
  dislikeOpacity
}: ProfileCardProps) {
  return (
    <Animated.View
      style={[styles.cardContainer, cardStyle]}
      {...panHandlers}
    >
      <View style={styles.card}>
        {/* Profile Image with like/dislike overlay */}
        <View style={styles.imageContainer}>
          {profile.photoURL ? (
            <Image 
              source={{ uri: profile.photoURL }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="person" size={80} color="#CCCCCC" />
              <Text style={styles.noPhotoText}>No Photo</Text>
            </View>
          )}
          
          {/* Like Overlay */}
          {likeOpacity && (
            <Animated.View 
              style={[
                styles.overlayContainer, 
                styles.likeOverlay, 
                { opacity: likeOpacity }
              ]}
            >
              <View style={styles.overlayButton}>
                <Ionicons name="heart" size={80} color="#4CAF50" />
              </View>
            </Animated.View>
          )}
          
          {/* Dislike Overlay */}
          {dislikeOpacity && (
            <Animated.View 
              style={[
                styles.overlayContainer, 
                styles.dislikeOverlay, 
                { opacity: dislikeOpacity }
              ]}
            >
              <View style={styles.overlayButton}>
                <Ionicons name="close" size={80} color="#FF6B6B" />
              </View>
            </Animated.View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.findLoveButton]}
              onPress={onLike}
            >
              <Ionicons name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Find Love</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.popButton]}
              onPress={onPass}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Pop Balloon</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.skipButton]}
            >
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.nameAgeContainer}>
            <Text style={styles.profileName}>
              {profile.displayName || 'User'}, {profile.ageRange}
            </Text>
          </View>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.locationText}>
              {profile.location || 'Unknown location'}
            </Text>
          </View>
          
          {profile.profession && (
            <View style={styles.professionContainer}>
              <Text style={styles.professionText}>{profile.profession}</Text>
            </View>
          )}
          
          {/* Interests/Tags */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              {profile.interests.slice(0, 3).map((interest: string, idx: number) => (
                <View key={idx} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: width * 0.9,
    height: CARD_HEIGHT,
    borderRadius: 20,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '80%',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 10,
    color: '#999',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  likeOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  dislikeOverlay: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
  },
  overlayButton: {
    transform: [{ rotate: '-30deg' }],
  },
  actionButtons: {
    position: 'absolute',
    right: 15,
    top: '40%',
    alignItems: 'center',
    zIndex: 10,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  findLoveButton: {
    backgroundColor: '#4CAF50',
  },
  popButton: {
    backgroundColor: '#FF6B6B',
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
    position: 'absolute',
    bottom: -20,
    width: 60,
  },
  profileInfo: {
    padding: 15,
  },
  nameAgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  professionContainer: {
    marginBottom: 5,
  },
  professionText: {
    fontSize: 14,
    color: '#666',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
});