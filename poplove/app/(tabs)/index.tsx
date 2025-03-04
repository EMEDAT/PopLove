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
import { router } from 'expo-router';


const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export default function HomeScreen() {
 const { user } = useAuthContext();
 const [loading, setLoading] = useState(true);
 const [profiles, setProfiles] = useState<any[]>([]);
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

 // PanResponder for swipe gestures
 const panResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false, // Disable swipe gestures completely
    onMoveShouldSetPanResponder: () => false,
    onPanResponderMove: () => {}, // Empty function
    onPanResponderRelease: () => {}
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
      let blockedUsers: string[] = [];
      let userGender = null;
    
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserPreferences(userData);
        blockedUsers = userData.blockedUsers || [];
        userGender = userData.gender; // Extract user gender
        
        // Get location info if available
        if (userData.latitude && userData.longitude) {
          setUserLocation({
            lat: userData.latitude,
            lon: userData.longitude
          });
        }
    
        // Enhanced logging
        console.log('Current user gender:', userGender);
        console.log('Current user ID:', user.uid);
      }
      
      // Check if we have a valid gender to filter by
      if (!userGender) {
        console.error('User gender not set in profile. Please complete onboarding properly.');
        setError('Please complete your profile setup to see matches');
        setLoading(false);
        return;
      }
      
      // Then fetch potential matches
      const profilesRef = collection(firestore, 'users');
      
      // Get gender preference (opposite of user's gender) and make sure it's well-defined
      const genderPreference = userGender === 'male' ? 'female' : 'male';
      console.log('Looking for gender:', genderPreference);
      
      // Use a more specific query
      const profilesQuery = query(
        profilesRef,
        where('gender', '==', genderPreference), // Must match the expected gender
        where('hasCompletedOnboarding', '==', true),
        limit(20)
      );
      
      const querySnapshot = await getDocs(profilesQuery);
      console.log(`Raw profiles count: ${querySnapshot.docs.length}`);
  
      // Map the documents and add additional debugging
      const fetchedProfiles = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        console.log(`Profile: ${data.displayName}, Gender: ${data.gender}, ID: ${doc.id}`);
        
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
      .filter(profile => {
        // Triple check gender filtering here
        const includeProfile = 
          profile.id !== user.uid && // Exclude current user
          !blockedUsers.includes(profile.id) && // Exclude blocked users
          profile.gender === genderPreference; // Must match gender preference
        
        console.log(`Including profile ${profile.displayName}? ${includeProfile} (Gender: ${profile.gender})`);
        return includeProfile;
      });
    
      console.log(`Filtered to ${fetchedProfiles.length} profiles`);
      setProfiles(fetchedProfiles);
      
      if (fetchedProfiles.length === 0) {
        setError('No profiles available right now. Check back soon!');
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };
   
   loadData();
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
        
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#FF6B6B" />
        </TouchableOpacity>
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
                {/* Debug info - remove in production */}
                {/* <Text style={{position: 'absolute', top: -30, left: 10, fontSize: 10, color: 'gray'}}>
                  Current index: {currentProfileIndex}, Showing: {profiles[currentProfileIndex].displayName}
                </Text> */}
                
                <View style={styles.cardStackContainer}>
                  {/* Background card that shows behind */}
                  <View style={styles.backgroundCard} />
                  
                  {/* Only show the current profile - no stacking to avoid confusion */}
                  <View
                    key={profiles[currentProfileIndex].id}
                    style={[styles.cardContainer]}
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
                      
                      {/* Right-side Action Buttons */}
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
                      
                      {/* Profile Info Card - Bottom text overlay */}
                      <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                          {profiles[currentProfileIndex].displayName || 'User'}, {profiles[currentProfileIndex].ageRange}
                        </Text>
                        
                        <View style={styles.locationContainer}>
                          <Ionicons name="location-outline" size={30} color="#FFFFFF" />
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
                  </View>
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
       vibePercentage={Math.floor(Math.random() * 30) + 70} // Random vibe percentage between 70-100
       actionButton={{
         text: "Start Chat",
         onPress: () => {
           setDetailsModalVisible(false);
           // TODO: Navigate to chat
         }
       }}
       secondaryButton={{
         text: "Share Profile",
         onPress: () => {
           // TODO: Implement share functionality
           setDetailsModalVisible(false);
         },
         color: "#f0f0f0",
         textColor: "#333"
       }}
     />


     {/* Add ProfilePopup component here */}
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
    position: 'relative', // Ensure position relative for absolute children
    width: '100%',
    height: height * 0.605 // Match card height
  },
  cardContainer: {
    width: width * 0.9,
    height: height * 0.605,
    borderRadius: 18,
    overflow: 'hidden', 
    backgroundColor: 'transparent',
    shadowColor: 'transparent', // Remove any shadow
    elevation: 0, // Remove Android elevation
    marginTop: 0,
    zIndex: 2
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent', // Was #000 before
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardStackContainer: {
    width: width * 0.9,
    height: height * 0.59,
    position: 'relative',
    alignItems: 'center',
  },
  backgroundCard: {
    width: '93%',
    height: '98%',
    backgroundColor: '#F6B5B6',
    borderRadius: 30,
    position: 'absolute',
    top: -13,
    transform: [{ rotate: '-0deg' }],
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
    backgroundColor: '#f0f0f0', // Light gray as fallback
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  likeOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  dislikeOverlay: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  overlayButton: {
    transform: [{ rotate: '-30deg' }],
  },
  actionButtons: {
    position: 'absolute',
    right: 15,
    bottom: '10%',
    alignItems: 'center',
    gap: 15,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  findLoveCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  popBalloonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  actionButtonImage: {
    width: 50,
    height: 50,
    marginBottom: 4,
  },
  // Update filter button to match the design
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  profileInfo: {
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '400',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
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