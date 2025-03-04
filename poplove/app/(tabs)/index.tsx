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
import { collection, query, getDocs, limit, where, doc, getDoc, updateDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import TrendingProfiles from '../../components/home/TrendingProfiles';
import { ProfileDetailsModal } from '../../components/shared/ProfileDetailsModal';


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
     
       if (userDoc.exists()) {
         const userData = userDoc.data();
         setUserPreferences(userData);
         blockedUsers = userData.blockedUsers || [];
         
         // Get location info if available
         if (userData.latitude && userData.longitude) {
           setUserLocation({
             lat: userData.latitude,
             lon: userData.longitude
           });
         }
     
         // Log user gender for debugging
         console.log('Current user gender:', userData.gender);
       }
       
       // Then fetch potential matches
       const profilesRef = collection(firestore, 'users');
       
       // Build query based on preferences if they exist
       let profilesQuery;
       if (userPreferences && userPreferences.gender) {
         // Get gender preference (opposite of user's gender by default)
         const genderPreference = userPreferences.gender === 'male' ? 'female' : 'male';
         console.log('Looking for gender:', genderPreference);
         
         profilesQuery = query(
           profilesRef,
           where('gender', '==', genderPreference),
           where('hasCompletedOnboarding', '==', true),
           limit(20)
         );
       } else {
         // Default query
         console.log('No gender preference found, showing all profiles');
         profilesQuery = query(
           profilesRef,
           where('hasCompletedOnboarding', '==', true),
           limit(20)
         );
       }
       
       const querySnapshot = await getDocs(profilesQuery);

        // Define a type for the user data
        interface UserData {
          displayName?: string;
          photoURL?: string;
          bio?: string;
          location?: string;
          ageRange?: string;
          interests?: string[];
          gender?: string;
          profession?: string;
          [key: string]: any; // For any other fields in the document
        }
       
       // Map the documents to a more usable format
       const fetchedProfiles = querySnapshot.docs
       .map(doc => {
         const data = doc.data() as UserData;
         console.log(`Profile: ${data.displayName}, Gender: ${data.gender}`);
         
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
       .filter(profile => 
         profile.id !== user.uid && // Exclude current user
         !blockedUsers.includes(profile.id) && // Exclude blocked users
         (userPreferences?.gender ? 
           // Double check gender filtering in JavaScript as well
           (userPreferences.gender === 'male' ? profile.gender === 'female' : profile.gender === 'male') 
           : true)
       );
     
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
        // It's a match!
        isMatch = true;
        
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
      }
    }
  } catch (err) {
    console.error('Error saving like:', err);
  } finally {
    // IMPORTANT: Always advance to the next profile, even if there was an error
    // This ensures the UI always moves forward
    setCurrentProfileIndex(prevIndex => prevIndex + 1);
    
    // If it was a match, show the match dialog
    if (isMatch) {
      Alert.alert('It\'s a Match!', 'You and this person like each other!');
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
    await swipeRight();
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
              // Render multiple cards at once from the stack
              profiles
                .slice(currentProfileIndex, currentProfileIndex + 3) // Render 3 cards instead of 2
                .reverse() // Reverse to get correct z-index stacking
                .map((profile, index) => {
                  const isFirstCard = index === 0;
                  const isSecondCard = index === 1;
                  
                  // Position each card with different scales and opacities
                  return (
                        <View
                          key={profile.id}
                          style={[
                            styles.cardContainer,
                            {
                              zIndex: profiles.length - index,
                              position: 'absolute',
                              top: isSecondCard ? 10 : isFirstCard ? 0 : 20,
                              opacity: isFirstCard ? 1 : isSecondCard ? 0.8 : 0.7,
                            }
                          ]}
                        >
                      <View style={styles.card}>
                       {/* Like/Heart icon in top left */}
                       <View style={styles.favoriteIcon}>
                         <Ionicons name="heart" size={24} color="#EC5F61" />
                       </View>
                       
                       {/* Main Image */}
                       <Image 
                         source={{ uri: profile.photoURL }} 
                         style={styles.profileImage}
                         resizeMode="cover"
                       />
                       
                       {/* Right-side Action Buttons */}
                       <View style={styles.actionButtons}>
                          {/* Find Love Button - using custom image */}
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={handleLike}
                          >
                            <Image 
                              source={require('../../assets/images/main/LoveSuccess.png')} 
                              style={styles.actionButtonImage}
                              resizeMode="contain"
                            />
                            <Text style={styles.actionButtonText}>Find Love</Text>
                          </TouchableOpacity>
                         
                        {/* Pop Balloon Button - using custom image */}
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
                            onPress={() => handleViewDetails(profile)}
                          >
                            <View style={styles.skipCircle}>
                              <Ionicons name="chevron-forward" size={20} color="#000" />
                            </View>
                          </TouchableOpacity>
                       </View>
                       
                       {/* Profile Info Card - Bottom text overlay */}
                       <View style={styles.profileInfo}>
                         <Text style={styles.profileName}>
                           {profile.displayName || 'User'}, {profile.ageRange}
                         </Text>
                         
                         <View style={styles.locationContainer}>
                           <Ionicons name="location-outline" size={30} color="#FFFFFF" />
                           <Text style={styles.locationText}>
                             {profile.location || 'Unknown location'}
                           </Text>
                         </View>
                         
                         {/* Interests/Tags */}
                         {profile.interests && profile.interests.length > 0 && (
                           <View style={styles.interestsContainer}>
                             {profile.interests.slice(0, 3).map((interest: string, idx: number) => (
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
                 );
               })
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
    marginTop: 2,
    position: 'relative', // Ensure position relative for absolute children
    width: '100%',
    height: height * 0.62 // Match card height
  },
  cardContainer: {
    width: width * 0.9,
    height: height * 0.62,
    borderRadius: 12,
    overflow: 'hidden', 
    backgroundColor: 'transparent',
    shadowColor: 'transparent', // Remove any shadow
    elevation: 0, // Remove Android elevation
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: 'transparent', // Was #000 before
    borderRadius: 12,
    overflow: 'hidden',
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