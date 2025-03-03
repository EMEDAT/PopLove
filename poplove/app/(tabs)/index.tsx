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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, limit, where, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
 const [error, setError] = useState<string | null>(null);
 const [selectedProfile, setSelectedProfile] = useState<any>(null);
 const [detailsModalVisible, setDetailsModalVisible] = useState(false);
 
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
         {profiles.length > 0 && (
           <TrendingProfiles 
             profiles={profiles} 
             onProfilePress={handleTrendingProfilePress} 
           />
         )}
         
         <View style={styles.cardsContainer}>
           {profiles.length > currentProfileIndex ? (
             profiles
               .slice(currentProfileIndex, currentProfileIndex + 2)
               .reverse()
               .map((profile, index) => {
                 const isTopCard = index === 0;
                 
                 return (
                   <Animated.View
                     key={profile.id}
                     style={[
                       styles.cardContainer,
                       {
                         transform: [
                           { rotate: isTopCard ? rotate : '0deg' },
                           ...position.getTranslateTransform(),
                           { scaleX: isTopCard ? 1 : nextCardScale },
                           { scaleY: isTopCard ? 1 : nextCardScale }
                         ],
                         opacity: isTopCard ? 1 : nextCardOpacity,
                         zIndex: profiles.length - index,
                         position: 'absolute',
                       }
                     ]}
                     {...(isTopCard ? panResponder.panHandlers : {})}
                   >
                     <View style={styles.card}>
                       {/* Like/Heart icon in top left */}
                       <View style={styles.favoriteIcon}>
                         <Ionicons name="heart" size={24} color="#FF6B6B" />
                       </View>
                       
                       {/* Main Image */}
                       <Image 
                         source={{ uri: profile.photoURL }} 
                         style={styles.profileImage}
                         resizeMode="cover"
                       />
                       
                       {/* Like Overlay */}
                       {isTopCard && (
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
                       {isTopCard && (
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
                       
                       {/* Right-side Action Buttons */}
                       <View style={styles.actionButtons}>
                         {/* Find Love (Green Heart) Button */}
                         <TouchableOpacity 
                           style={styles.actionButton}
                           onPress={handleLike}
                         >
                           <View style={styles.findLoveCircle}>
                             <Ionicons name="heart-outline" size={24} color="white" />
                           </View>
                           <Text style={styles.actionButtonText}>Find Love</Text>
                         </TouchableOpacity>
                         
                         {/* Pop Balloon (Red X) Button */}
                         <TouchableOpacity 
                           style={styles.actionButton}
                           onPress={handlePass}
                         >
                           <View style={styles.popBalloonCircle}>
                             <Ionicons name="heart-dislike-outline" size={20} color="white" />
                           </View>
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
                           <Ionicons name="location-outline" size={16} color="#888" />
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
                   </Animated.View>
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
  filterButton: {
    padding: 8,
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
    marginTop: 10,
  },
  cardContainer: {
    width: width * 0.9,
    height: height * 0.63,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
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
    bottom: '20%',
    alignItems: 'center',
    gap: 15,
    zIndex: 10,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 15,
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
  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    marginBottom: 5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
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
    backgroundColor: 'rgba(80, 80, 80, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 14,
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