// app/(tabs)/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,
  Alert,  
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, limit, where, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import TrendingProfiles from '../../components/home/TrendingProfiles';
import { ProfileDetailsModal } from '../../components/shared/ProfileDetailsModal';
import ProfilePopup from '../../components/home/ProfilePopup';
import { MessageStatus } from '../../components/chat/MessageStatus';
import NotificationBadge from '../../components/shared/NotificationBadge';
import { router } from 'expo-router';
import FilterButton from '../../components/FilterButton';
import { filterProfilesByDistance } from '../../utils/distance';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [originalProfiles, setOriginalProfiles] = useState<any[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [userLocation, setUserLocation] = useState({ lat: 0, lon: 0 });
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [profilePopupVisible, setProfilePopupVisible] = useState(false);
  const [popupProfile, setPopupProfile] = useState<any>(null);
 
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

  // Fixed PanResponder - only handle horizontal swipes on the card, not blocking vertical scrolling
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal movements for card swiping
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
      },
      onPanResponderMove: Animated.event([null, { dx: position.x }], { useNativeDriver: false }),
      onPanResponderRelease: (evt, gestureState) => {
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
    let isMounted = true;
    
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Log user details for debugging
        console.log('USER DETAILS FOR MATCHING:', {
          uid: user.uid,
          email: user.email
        });
        
        // Fetch user document
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        
        if (!userDoc.exists()) {
          console.error('NO USER DOCUMENT FOUND');
          setError('User profile not found');
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        console.log('USER DATA FOR MATCHING:', userData);
        
        // Validate critical profile data
        if (!userData.gender) {
          console.error('NO GENDER SPECIFIED');
          setError('Please complete your profile setup');
          setLoading(false);
          return;
        }
        
        // Determine opposite gender for matching
        const genderPreference = userData.gender === 'male' ? 'female' : 'male';
        console.log('MATCHING GENDER:', genderPreference);
        
        // Location logging
        console.log('USER LOCATION:', {
          latitude: userData.latitude,
          longitude: userData.longitude,
          location: userData.location
        });
        
        // Construct advanced profiles query with more robust filtering
        const profilesQuery = query(
          collection(firestore, 'users'),
          where('gender', '==', genderPreference),
          where('hasCompletedOnboarding', '==', true),
          limit(50) // Fetch more profiles to allow for comprehensive filtering
        );
        
        const querySnapshot = await getDocs(profilesQuery);
        console.log(`FOUND ${querySnapshot.size} POTENTIAL PROFILES`);
        
        // Detailed profile processing with extensive logging
        const fetchedProfiles = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            console.log('POTENTIAL PROFILE:', {
              id: doc.id,
              gender: data.gender,
              location: data.location,
              latitude: data.latitude,
              longitude: data.longitude
            });
            
            return {
              id: doc.id,
              displayName: data.displayName || 'User',
              photoURL: data.photoURL,
              bio: data.bio || '',
              location: data.location || 'Unknown',
              age: data.age || 0,
              ageRange: data.ageRange?.split(' ')[0] || '??',
              interests: data.interests || [],
              gender: data.gender || '',
              latitude: data.latitude,
              longitude: data.longitude,
            };
          })
          .filter(profile => {
            // Exclude self and handle missing data gracefully
            return profile.id !== user.uid && 
                   profile.latitude !== undefined && 
                   profile.longitude !== undefined;
          });
        
        console.log(`AFTER BASIC FILTERING: ${fetchedProfiles.length} PROFILES`);
        
        // Location-based sophisticated matching
        const profilesWithDistance = filterProfilesByDistance(
          fetchedProfiles,
          userData.latitude,
          userData.longitude,
          100 // Max distance in kilometers
        );
        
        console.log(`PROFILES AFTER DISTANCE FILTERING: ${profilesWithDistance.length}`);
        
        // Sort by distance and log details
        profilesWithDistance.sort((a, b) => a.distance - b.distance);
        
        profilesWithDistance.forEach(profile => {
          console.log('MATCHED PROFILE:', {
            name: profile.displayName,
            distance: profile.distance,
            location: profile.location
          });
        });
        
        setProfiles(profilesWithDistance);
        setOriginalProfiles(profilesWithDistance);
        setLoading(false);
        
        if (profilesWithDistance.length === 0) {
          console.warn('NO MATCHING PROFILES FOUND');
          setError('No profiles available right now. Check back soon!');
        }
      } catch (err) {
        console.error('COMPLETE ERROR IN PROFILE LOADING:', err);
        setError('Failed to load profiles');
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (profiles.length > 0) {
      console.log(`PROFILE INDEX: ${currentProfileIndex} of ${profiles.length}`);
      
      // Log info about the current profile
      if (currentProfileIndex < profiles.length) {
        const currentProfile = profiles[currentProfileIndex];
        console.log(`CURRENT PROFILE: ${currentProfile.displayName} (ID: ${currentProfile.id}, Gender: ${currentProfile.gender})`);
      } else {
        console.log('No more profiles to display');
      }
    }
  }, [currentProfileIndex, profiles]);

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
    
    // Create a variable to track if we need to show a match dialog
    let isMatch = false;
    let matchId: string | null = null;
    
    // Save the like to Firestore
    try {
      if (user && currentProfile) {
        // Create a like document with a predictable ID format for easy querying
        const likeId = `${user.uid}_${currentProfile.id}`;
        const likeRef = doc(firestore, 'likes', likeId); // Use consistent ID format
        
        await setDoc(likeRef, {
          fromUserId: user.uid,
          toUserId: currentProfile.id,
          createdAt: serverTimestamp(),
          status: 'pending',
          // Store profile data directly for easy access
          profileData: {
            id: currentProfile.id,
            displayName: currentProfile.displayName,
            photoURL: currentProfile.photoURL,
            age: currentProfile.age,
            ageRange: currentProfile.ageRange,
            location: currentProfile.location,
            interests: currentProfile.interests,
            bio: currentProfile.bio
          }
        });
        
        // Check if there's a matching like (when the other person already liked current user)
        const matchingLikeId = `${currentProfile.id}_${user.uid}`;
        const matchingLikeRef = doc(firestore, 'likes', matchingLikeId);
        const matchingLike = await getDoc(matchingLikeRef);
        
        if (matchingLike.exists()) {
          // It's a match!
          isMatch = true;
          
          // Create a match
          const newMatchRef = doc(collection(firestore, 'matches'));
          matchId = newMatchRef.id;
          
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
            lastMessageTime: serverTimestamp()
          });
          
          // Add an initial system message
          await addDoc(collection(firestore, 'matches', matchId, 'messages'), {
            text: "You matched! Start a conversation.",
            senderId: "system",
            createdAt: serverTimestamp()
          });
          
          // Update both likes to matched
          await updateDoc(likeRef, { status: 'matched' });
          await updateDoc(matchingLikeRef, { status: 'matched' });
        }
      }
    } catch (err) {
      console.error('Error saving like:', err);
    } finally {
      // Always advance to the next profile, even if there was an error
      setCurrentProfileIndex(prevIndex => prevIndex + 1);
      
      // If it was a match, show the match dialog
      if (isMatch && matchId) {
        Alert.alert(
          "It's a Match! 💖",
          `You and ${currentProfile.displayName} like each other!`,
          [
            { 
              text: "Keep Browsing", 
              style: "cancel" 
            },
            { 
              text: "Message Now", 
              onPress: () => {
                // Use direct linking to chat route instead of router.replace
                router.push({
                  pathname: '/chat/[id]',
                  params: { id: matchId }
                });
              }
            }
          ]
        );
      }
    }
  };

  const swipeLeft = async () => {
    if (profiles.length <= currentProfileIndex) return;
    
    const currentProfile = profiles[currentProfileIndex];
    console.log('Passed on profile:', currentProfile?.id);
    
    // Save the pass to Firestore
    try {
      if (user && currentProfile) {
        // 1. Create a "pass" document in the "passes" collection
        const passRef = doc(firestore, 'passes', `${user.uid}_${currentProfile.id}`);
        await setDoc(passRef, {
          fromUserId: user.uid,
          toUserId: currentProfile.id,
          createdAt: serverTimestamp()
        });
        
        // 2. Add this user to the blocked list in the user's document
        const userRef = doc(firestore, 'users', user.uid);
        
        // Use arrayUnion to add the ID to the blockedUsers array
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(currentProfile.id),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving pass:', err);
    } finally {
      // IMPORTANT: Always advance to the next profile, even if there was an error
      // This ensures the UI always moves forward
      setCurrentProfileIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleLike = async () => {
    if (likeLoading || passLoading) return; // Prevent multiple clicks
    
    setLikeLoading(true);
    try {
      const currentProfile = profiles[currentProfileIndex];
      
      if (user && currentProfile) {
        // Create a like document with a predictable ID format for favorites
        const likeId = `${user.uid}_${currentProfile.id}`;
        const likeRef = doc(firestore, 'likes', likeId);
        
        await setDoc(likeRef, {
          fromUserId: user.uid,
          toUserId: currentProfile.id,
          createdAt: serverTimestamp(),
          status: 'pending',
          // Store profile data for easy access in favorites
          profileData: {
            id: currentProfile.id,
            displayName: currentProfile.displayName,
            photoURL: currentProfile.photoURL,
            ageRange: currentProfile.ageRange,
            location: currentProfile.location,
            interests: currentProfile.interests,
            bio: currentProfile.bio
          }
        });
        
        // Move to next profile
        setCurrentProfileIndex(prevIndex => prevIndex + 1);
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('Error', 'Failed to add to favorites. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handlePass = async () => {
    if (likeLoading || passLoading) return; // Prevent multiple clicks
    
    setPassLoading(true);
    try {
      await swipeLeft();
    } finally {
      setPassLoading(false);
    }
  };

  const handleViewDetails = (profile: any) => {
    setSelectedProfile(profile);
    setDetailsModalVisible(true);
  };

  const handleTrendingProfilePress = (profile: any) => {
    console.log("Trending profile pressed:", profile.id);
    setSelectedProfile(profile);
    setDetailsModalVisible(true);
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

  const handleFindLovePressed = () => {
    if (profiles.length <= currentProfileIndex) return;
    
    const currentProfile = profiles[currentProfileIndex];
    if (currentProfile) {
      setPopupProfile(currentProfile);
      setProfilePopupVisible(true);
    }
  };

  const sendEmojiMessage = async (emoji: string) => {
    // Add null checks
    if (!user || profiles.length <= currentProfileIndex) return;
    
    // Prevent multiple clicks
    if (likeLoading || passLoading) return;
    setLikeLoading(true);
    
    try {
      const currentProfile = profiles[currentProfileIndex];
      
      // First check if a chat with this user already exists
      const matchesRef = collection(firestore, 'matches');
      const q = query(
        matchesRef, 
        where('users', 'array-contains', user.uid)
      );
      
      const matchSnapshot = await getDocs(q);
      let matchId: string;
      
      const existingMatch = matchSnapshot.docs.find(doc => 
        doc.data().users.includes(currentProfile.id)
      );
      
      if (existingMatch) {
        // If chat already exists, navigate to existing chat instead of creating a new one
        setProfilePopupVisible(false);
        
        // Also advance to next profile
        setCurrentProfileIndex(prevIndex => prevIndex + 1);
        
        // Navigate to chat tab first, then to the specific chat
        Alert.alert(
          "Chat Already Exists",
          "You already have a conversation with this person. Opening existing chat.",
          [
            { 
              text: "Continue", 
              onPress: () => {
                router.replace('/(tabs)/matches');
                setTimeout(() => {
                  router.push({
                    pathname: '/chat/[id]',
                    params: { id: existingMatch.id }
                  });
                }, 100);
              }
            }
          ]
        );
        return;
      }
      
      // Existing match creation logic
      const newMatchRef = doc(matchesRef);
      matchId = newMatchRef.id;
      
      await setDoc(newMatchRef, {
        users: [user.uid, currentProfile.id],
        userProfiles: {
          [user.uid]: {
            displayName: user.displayName || 'User',
            photoURL: user.photoURL || ''
          },
          [currentProfile.id]: {
            displayName: currentProfile.displayName,
            photoURL: currentProfile.photoURL
          }
        },
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp()
      });
      
      // Existing emoji message sending logic
      await addDoc(collection(firestore, 'matches', matchId, 'messages'), {
        text: emoji,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        status: MessageStatus.SENT,
        messageType: 'animated-emoji',
        emojiSize: emoji === "❤️" ? 48 : 60,
        animationType: emoji === "❤️" ? "heartbeat" : "bloomingFlower"
      });
      
      // Update match's last message
      await updateDoc(doc(firestore, 'matches', matchId), {
        lastMessage: emoji,
        lastMessageTime: serverTimestamp(),
        lastMessageType: 'animated-emoji'
      });
      
      // Close popup first
      setProfilePopupVisible(false);
      
      // Important: Advance to the next card
      setCurrentProfileIndex(prevIndex => prevIndex + 1);
      
      // Navigate to chat tab first, then to the specific chat
      router.replace('/(tabs)/matches');
      setTimeout(() => {
        router.push({
          pathname: '/chat/[id]',
          params: { id: matchId }
        });
      }, 100);
    } catch (error) {
      console.error('Error sending emoji message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLikeLoading(false);
    }
  };

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

        <View style={styles.headerRight}>
          <NotificationBadge />
          <FilterButton 
            profiles={profiles} 
            setProfiles={setProfiles}
            allProfiles={originalProfiles}
          />
        </View>
      </View>
     
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding people near you...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {profiles.length > 0 && (
            <TrendingProfiles 
              profiles={profiles} 
              onProfilePress={handleTrendingProfilePress} 
            />
          )}
         
          <View style={styles.cardsContainer}>
            {profiles.length > currentProfileIndex ? (
              <>
                <View style={styles.cardStackContainer}>
                  {/* Current profile card */}
                  <Animated.View
                    {...panResponder.panHandlers}
                    key={profiles[currentProfileIndex].id}
                    style={[
                      styles.cardContainer,
                      {
                        transform: [
                          { translateX: position.x },
                          { rotate: rotate }
                        ]
                      }
                    ]}
                  >
                    <View style={styles.card}>
                      {/* Like/Heart icon in top left */}
                      <TouchableOpacity 
                        style={styles.favoriteIcon}
                        onPress={handleLike}
                      >
                        <Ionicons name="heart" size={24} color="#EC5F61" />
                      </TouchableOpacity>
                      
                      {/* Main Image */}
                      <Image 
                        source={{ uri: profiles[currentProfileIndex].photoURL }} 
                        style={styles.profileImage}
                        resizeMode="cover"
                      />
                      
                      {/* Profile Info Card - Bottom text overlay */}
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                          {profiles[currentProfileIndex].displayName.split(' ')[0] || 'User'}, {profiles[currentProfileIndex].age || profiles[currentProfileIndex].ageRange || '??'}
                        </Text>
                        
                        <View style={styles.locationContainer}>
                          <Ionicons name="location-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.locationText}>
                            {profiles[currentProfileIndex].location || 'Unknown location'}
                          </Text>
                        </View>
                        
                        {/* Interests/Tags */}
                        {profiles[currentProfileIndex].interests && profiles[currentProfileIndex].interests.length > 0 && (
                          <View style={styles.interestsContainer}>
                            {profiles[currentProfileIndex].interests.slice(0, 3).map((interest: string, idx: number) => (
                              <View key={idx} style={styles.interestTag}>
                                <Text style={styles.interestText}>
                                  {interest}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </Animated.View>
                </View>

                {/* Right-side Action Buttons - Moved outside the card for better access */}
                <View style={styles.actionButtons}>
                  {/* Find Love Button */}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleFindLovePressed}
                  >
                    <Image 
                      source={require('../../assets/images/main/LoveSuccess.png')} 
                      style={styles.actionButtonImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.actionButtonText}>Find Love</Text>
                  </TouchableOpacity>
                  
                  {/* Pop Balloon Button */}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handlePass}
                  >
                    <Image 
                      source={require('../../assets/images/main/LoveError.png')} 
                      style={styles.actionButtonImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.actionButtonText}>Pop Balloon</Text>
                  </TouchableOpacity>
                    
                  {/* Details Button */}
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleViewDetails(profiles[currentProfileIndex])}
                  >
                    <View style={styles.skipCircle}>
                      <Ionicons name="chevron-forward" size={20} color="#000" />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              renderNoMoreCards()
            )}
          </View>
        </View>
      )}
     
      {/* Profile Details Modal */}
      <ProfileDetailsModal
        visible={detailsModalVisible}
        onClose={() => setDetailsModalVisible(false)}
        profile={selectedProfile}
        vibePercentage={Math.floor(Math.random() * 30) + 70}
        actionButton={{
          text: "Find Love",
          onPress: () => {
            setDetailsModalVisible(false);
            handleFindLovePressed();
          }
        }}
        secondaryButton={{
          text: "Pop Balloon",
          onPress: () => {
            setDetailsModalVisible(false);
            handlePass();
          }
        }}
      />

      {/* ProfilePopup component */}
      <ProfilePopup
        visible={profilePopupVisible}
        onClose={() => setProfilePopupVisible(false)}
        profile={popupProfile}
        onSendLike={() => sendEmojiMessage("❤️")}
        onSendFlower={() => sendEmojiMessage("🌹")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 5, // Adjusted for Android
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f3f3',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 35,
    height: 35,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#161616',
  },
  content: {
    flex: 1,
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
    position: 'relative',
    width: '100%',
    height: height * 0.6
  },
  cardContainer: {
    width: Platform.OS === 'android' ? width * 0.9 : width * 0.85,  // Adjusted for Android
    height: Platform.OS === 'android' ? height * 0.6 : height * 0.5,  // Adjusted for Android
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
    marginTop: Platform.OS === 'android' ? -50 : 0, // Adjusted for Android
    zIndex: 2
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardStackContainer: {
    width: width * 0.85,  // Reduced from 0.9
    height: height * 0.5,  // Reduced from 0.55
    position: 'relative',
    alignItems: 'center',
    zIndex: 1
  },
  backgroundCard: {
    width: '93%',
    height: '98%',
    backgroundColor: 'transparent',  // Changed from '#F6B5B6' to transparent
    borderRadius: 30,
    position: 'absolute',
    top: -15,
    zIndex: 1
  },
  favoriteIcon: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 40, 
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 10,
    color: '#999',
  },
  actionButtons: {
    position: 'absolute',
    right: 30,
    bottom: 50,  // Adjusted from 70 to account for smaller card
    alignItems: 'center',
    gap: 15,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonImage: {
    width: 50,
    height: 50,
    marginBottom: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  skipCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  profileName: {
    fontSize: 28,
    fontWeight: '600',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
    paddingRight: 30,
  },
  interestTag: {
    backgroundColor: 'rgba(80, 80, 80, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: 'white',
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