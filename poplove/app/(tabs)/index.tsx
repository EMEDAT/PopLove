// app/(tabs)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.62;
const SWIPE_THRESHOLD = width * 0.25;

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Swipe animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });
  
  const likeOpacity = position.x.interpolate({
    inputRange: [0, width / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const dislikeOpacity = position.x.interpolate({
    inputRange: [-width / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  
  const nextCardOpacity = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.8, 1],
    extrapolate: 'clamp'
  });
  
  const nextCardScale = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp'
  });

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  // Fetch user preferences and profiles
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // First get the user's preferences
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserPreferences(userData);
        }
        
        // Then fetch potential matches
        const profilesRef = collection(firestore, 'users');
        
        // Build query based on preferences if they exist
        let profilesQuery;
        if (userPreferences && userPreferences.gender) {
          // Get gender preference (opposite of user's gender by default)
          const genderPreference = userPreferences.gender === 'male' ? 'female' : 'male';
          
          profilesQuery = query(
            profilesRef,
            where('gender', '==', genderPreference),
            where('hasCompletedOnboarding', '==', true),
            limit(10)
          );
        } else {
          // Default query if no preferences yet
          profilesQuery = query(
            profilesRef,
            where('hasCompletedOnboarding', '==', true),
            limit(10)
          );
        }
        
        const querySnapshot = await getDocs(profilesQuery);
        
        // Map the documents to a more usable format
        const fetchedProfiles = querySnapshot.docs
        .map(doc => {
          const data = doc.data() as {
            displayName?: string;
            photoURL?: string;
            bio?: string;
            location?: string;
            ageRange?: string;
            interests?: string[];
            gender?: string;
            profession?: string;
          };
          
          return {
            id: doc.id,
            displayName: data.displayName || 'User',
            photoURL: data.photoURL,
            bio: data.bio || '',
            location: data.location || 'Unknown',
            ageRange: data.ageRange?.split(' ')[0] || '??',
            interests: data.interests || [],
            gender: data.gender || '',
            profession: data.profession || '',
            distance: Math.floor(Math.random() * 30) + 1, // Simulate distance for demo
          };
        })
        .filter(profile => profile.id !== user.uid); // Exclude current user
        
        setProfiles(fetchedProfiles);
        
        if (fetchedProfiles.length === 0) {
          setError('No profiles available right now. Check back soon!');
        }
      } catch (err: any) {
        console.error('Error fetching profiles:', err);
        setError('Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: false
    }).start();
  };

  const swipeRight = async () => {
    if (profiles.length <= currentProfileIndex) return;
    
    const currentProfile = profiles[currentProfileIndex];
    console.log('Liked profile:', currentProfile?.id);
    
    // Save the like to Firestore
    try {
      if (user && currentProfile) {
        // Create a like document
        const likeRef = doc(firestore, 'likes', `${user.uid}_${currentProfile.id}`);
        await setDoc(likeRef, {
          fromUserId: user.uid,
          toUserId: currentProfile.id,
          createdAt: serverTimestamp(),
          status: 'pending' // pending until the other user likes back
        });
        
        // Check if there's a matching like
        const matchingLikeRef = doc(firestore, 'likes', `${currentProfile.id}_${user.uid}`);
        const matchingLike = await getDoc(matchingLikeRef);
        
        if (matchingLike.exists()) {
          // Create a match
          const newMatchRef = doc(collection(firestore, 'matches'));
          await setDoc(newMatchRef, {
            users: [user.uid, currentProfile.id],
            userProfiles: {
              [user.uid]: {
                displayName: user.displayName,
                photoURL: user.photoURL,
              },
              [currentProfile.id]: {
                displayName: currentProfile.displayName,
                photoURL: currentProfile.photoURL,
              }
            },
            createdAt: serverTimestamp(),
          });
          
          // Update both likes to matched
          await updateDoc(likeRef, { status: 'matched' });
          await updateDoc(matchingLikeRef, { status: 'matched' });
          
          // TODO: Show match notification
        }
      }
    } catch (err) {
      console.error('Error saving like:', err);
    }
    
    Animated.timing(position, {
      toValue: { x: width + 100, y: 0 },
      duration: 300,
      useNativeDriver: false
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setCurrentProfileIndex(currentProfileIndex + 1);
    });
  };

  const swipeLeft = () => {
    if (profiles.length <= currentProfileIndex) return;
    
    const currentProfile = profiles[currentProfileIndex];
    console.log('Passed on profile:', currentProfile?.id);
    
    // In a real app, you could save this pass to Firestore
    
    Animated.timing(position, {
      toValue: { x: -width - 100, y: 0 },
      duration: 300,
      useNativeDriver: false
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setCurrentProfileIndex(currentProfileIndex + 1);
    });
  };

  const handleLike = () => {
    swipeRight();
  };

  const handlePass = () => {
    swipeLeft();
  };

  // Components for the top profiles row with distance indicators
  const renderTrendingProfiles = () => {
    // Taking first 4 profiles for trending
    const trendingProfiles = profiles.slice(0, 4);
    
    return (
      <View style={styles.trendingSection}>
        <Text style={styles.trendingTitle}>Trending profiles</Text>
        <View style={styles.trendingProfiles}>
          {trendingProfiles.map((profile, index) => (
            <View key={index} style={styles.trendingProfileCard}>
              <View style={styles.trendingProfileImageContainer}>
                <Image 
                  source={{ uri: profile.photoURL }} 
                  style={styles.trendingProfileImage}
                  resizeMode="cover"
                />
                <View style={styles.distanceIndicator}>
                  <Text style={styles.distanceText}>{profile.distance}km</Text>
                </View>
              </View>
              <Text style={styles.trendingProfileName} numberOfLines={1}>
                {profile.displayName}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderCard = (profile: any, index: number) => {
    if (!profile) return null;
    
    // Convert profile age from string to number for image blur effect factor
    const ageNum = parseInt(profile.ageRange) || 25;
    const blurIntensity = Math.min(100, Math.max(10, 100 - ageNum * 2));
    
    return (
      <Animated.View
      key={profile.id}
      style={[
        styles.cardContainer,
        {
          transform: [
            { rotate: index === currentProfileIndex ? rotate : '0deg' },
            ...position.getTranslateTransform(),
            { scaleX: index === currentProfileIndex ? 1 : nextCardScale },
            { scaleY: index === currentProfileIndex ? 1 : nextCardScale }
          ],
          opacity: index === currentProfileIndex ? 1 : nextCardOpacity,
          zIndex: profiles.length - index,
        }
      ]}
      {...(index === currentProfileIndex ? panResponder.panHandlers : {})}
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
            {index === currentProfileIndex && (
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
            {index === currentProfileIndex && (
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
                onPress={handleLike}
              >
                <Ionicons name="heart" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Find Love</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.popButton]}
                onPress={handlePass}
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
  };

  const renderNoMoreCards = () => (
    <View style={styles.noMoreCardsContainer}>
      <Ionicons name="search" size={50} color="#ccc" />
      <Text style={styles.noMoreCardsText}>
        No more profiles available right now
      </Text>
      <Text style={styles.noMoreCardsSubtext}>
        Check back later for more matches
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={18} color="#999" />
            </View>
          )}
          <Text style={styles.headerText}>
            Hi, {user?.displayName?.split(' ')[0] || 'User'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding people near you...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {profiles.length > 0 && renderTrendingProfiles()}
          
          <View style={styles.cardsContainer}>
            {profiles.length > currentProfileIndex ? (
              profiles
                .slice(currentProfileIndex, currentProfileIndex + 2)
                .reverse()
                .map((profile, index) => 
                  renderCard(profile, currentProfileIndex + 1 - index)
                )
            ) : (
              renderNoMoreCards()
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '500',
  },
  filterButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
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
    width: (width - 60) / 4,
    alignItems: 'center',
  },
  trendingProfileImageContainer: {
    position: 'relative',
    width: (width - 60) / 4,
    height: (width - 60) / 4,
    borderRadius: 8,
    marginBottom: 5,
    overflow: 'hidden',
  },
  trendingProfileImage: {
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
  trendingProfileName: {
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cardContainer: {
    width: width * 0.9,
    height: CARD_HEIGHT,
    position: 'absolute',
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
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  quickMatchButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickMatchText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noMoreCardsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  noMoreCardsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  noMoreCardsSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});