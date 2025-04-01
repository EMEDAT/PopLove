// app/(tabs)/favorites.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet,  
  Image, 
  TouchableOpacity, 
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, where, doc, getDoc, deleteDoc, updateDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function FavoritesScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [sentLikes, setSentLikes] = useState<any[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSentLikes, setShowSentLikes] = useState(true);
  const [showReceivedLikes, setShowReceivedLikes] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAllLikes();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // Reload data when screen comes into focus
      fetchAllLikes();
      return () => {};
    }, [])
  );

  const fetchAllLikes = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        fetchSentLikes(),
        fetchReceivedLikes()
      ]);
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching likes:', err);
      setError('Failed to load likes');
      setLoading(false);
    }
  };

  const fetchSentLikes = async () => {
    // Query likes where this user is the sender and status is pending
    const likesRef = collection(firestore, 'likes');
    const q = query(
      likesRef,
      where('fromUserId', '==', user?.uid),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    const likes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch user profiles for each like if not already included
    const profilePromises = likes.map(async (like: any) => {
      // If profileData already exists, use it
      if (like.profileData) {
        return {
          ...like,
          profile: like.profileData
        };
      }
      
      // Otherwise fetch the profile
      const userDoc = await getDoc(doc(firestore, 'users', like.toUserId));
      if (userDoc.exists()) {
        return {
          ...like,
          profile: {
            id: userDoc.id,
            ...userDoc.data()
          }
        };
      }
      return null;
    });

    const likesWithProfiles = (await Promise.all(profilePromises)).filter(Boolean);
    setSentLikes(likesWithProfiles);
  };

  const fetchReceivedLikes = async () => {
    // Query likes where this user is the receiver and status is pending
    const likesRef = collection(firestore, 'likes');
    const q = query(
      likesRef,
      where('toUserId', '==', user?.uid),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    const likes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch user profiles for each like
    const profilePromises = likes.map(async (like: any) => {
      try {
        // We need to get the profile of the SENDER, not the recipient
        const userDoc = await getDoc(doc(firestore, 'users', like.fromUserId));
        if (userDoc.exists()) {
          return {
            ...like,
            profile: {
              id: like.fromUserId,
              ...userDoc.data()
            }
          };
        }
      } catch (err) {
        console.error('Error fetching sender profile:', err);
      }
      return null;
    });

    const likesWithProfiles = (await Promise.all(profilePromises)).filter(Boolean);
    setReceivedLikes(likesWithProfiles);
  };

  const removeFavorite = async (favorite: any) => {
    try {
      // Delete the like document
      await deleteDoc(doc(firestore, 'likes', favorite.id));
      
      // Update the local state
      setSentLikes(sentLikes.filter(fav => fav.id !== favorite.id));
      
      setModalVisible(false);
    } catch (err) {
      console.error('Error removing favorite:', err);
      Alert.alert('Error', 'Failed to remove favorite. Please try again.');
    }
  };

  const createMatch = async (receivedLike: any) => {
    try {
      if (!user) return;
  
      // Check if a match already exists
      const matchesRef = collection(firestore, 'matches');
      const q = query(
        matchesRef,
        where('users', 'array-contains', user.uid)
      );
      
      const matchesSnapshot = await getDocs(q);
      const existingMatch = matchesSnapshot.docs.find(doc => 
        doc.data().users.includes(receivedLike.fromUserId)
      );
      
      let matchId;
      
      if (existingMatch) {
        // Use existing match
        matchId = existingMatch.id;
        console.log("Using existing match:", matchId);
      } else {
        // Create a new match only if none exists
        const newMatchRef = doc(collection(firestore, 'matches'));
        matchId = newMatchRef.id;
        
        await setDoc(newMatchRef, {
          users: [user.uid, receivedLike.fromUserId],
          userProfiles: {
            [user.uid]: {
              displayName: user.displayName,
              photoURL: user.photoURL,
            },
            [receivedLike.fromUserId]: {
              displayName: receivedLike.profile.displayName,
              photoURL: receivedLike.profile.photoURL,
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
      }
      
      // Update both likes to matched (do this regardless)
      await updateDoc(doc(firestore, 'likes', receivedLike.id), { 
        status: 'matched' 
      });
      
      // Then create a reverse like if it doesn't exist
      const reverselikeRef = doc(firestore, 'likes', `${user.uid}_${receivedLike.fromUserId}`);
      await setDoc(reverselikeRef, {
        fromUserId: user.uid,
        toUserId: receivedLike.fromUserId,
        createdAt: serverTimestamp(),
        status: 'matched'
      });
      
      // Update local state
      setReceivedLikes(receivedLikes.filter(like => like.id !== receivedLike.id));
      
      // Show match notification with correct match ID
      Alert.alert(
        "It's a Match! 💖",
        `You and ${receivedLike.profile.displayName} like each other!`,
        [
          { 
            text: "Keep Browsing", 
            style: "cancel" 
          },
          { 
            text: "Message Now", 
            onPress: () => {
              router.push({
                pathname: '/chat/[id]',
                params: { id: matchId }
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    }
  };
  
  const rejectLike = async (receivedLike: any) => {
    try {
      // Update like status to rejected
      await updateDoc(doc(firestore, 'likes', receivedLike.id), { 
        status: 'rejected' 
      });
      
      // Remove from state
      setReceivedLikes(receivedLikes.filter(like => like.id !== receivedLike.id));
    } catch (error) {
      console.error('Error rejecting like:', error);
      Alert.alert('Error', 'Failed to reject. Please try again.');
    }
  };

  const openProfileModal = (profile: any) => {
    setSelectedProfile(profile);
    setModalVisible(true);
  };

  const renderSentLikeItem = ({ item }: { item: any }) => {
    const profile = item.profile;
    
    return (
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => openProfileModal(profile)}
      >
        <View style={styles.profileImageContainer}>
          {profile.photoURL ? (
            <Image 
              source={{ uri: profile.photoURL }} 
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="person" size={40} color="#CCCCCC" />
            </View>
          )}
          <View style={styles.starIcon}>
            <Ionicons name="heart" size={24} color="#FF6B6B" />
          </View>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile.displayName || 'User'}, {profile.ageRange || '??'}
          </Text>
          
          {profile.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.locationText} numberOfLines={1}>
                {profile.location}
              </Text>
            </View>
          )}
          
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              {profile.interests.slice(0, 2).map((interest: string, index: number) => (
                <Text key={index} style={styles.interestText}>
                  {interest}{index < Math.min(profile.interests.length, 2) - 1 ? ' • ' : ''}
                </Text>
              ))}
              {profile.interests.length > 2 && (
                <Text style={styles.moreInterests}>+{profile.interests.length - 2}</Text>
              )}
            </View>
          )}
          
          <Text style={styles.pendingText}>Waiting for response</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderReceivedLikeItem = ({ item }: { item: any }) => {
    const profile = item.profile;
    
    return (
      <View style={styles.profileCard}>
        <TouchableOpacity
          style={styles.profileMainContent}
          onPress={() => openProfileModal(profile)}
        >
          <View style={styles.profileImageContainer}>
            {profile.photoURL ? (
              <Image 
                source={{ uri: profile.photoURL }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noPhotoContainer}>
                <Ionicons name="person" size={40} color="#CCCCCC" />
              </View>
            )}
            <View style={styles.heartIcon}>
              <Ionicons name="heart" size={24} color="#FF6B6B" />
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile.displayName || 'User'}, {profile.ageRange || '??'}
            </Text>
            
            {profile.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {profile.location}
                </Text>
              </View>
            )}
            
            {profile.interests && profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                {profile.interests.slice(0, 2).map((interest: string, index: number) => (
                  <Text key={index} style={styles.interestText}>
                    {interest}{index < Math.min(profile.interests.length, 2) - 1 ? ' • ' : ''}
                  </Text>
                ))}
                {profile.interests.length > 2 && (
                  <Text style={styles.moreInterests}>+{profile.interests.length - 2}</Text>
                )}
              </View>
            )}
            
            <Text style={styles.likedText}>Liked you</Text>
          </View>
        </TouchableOpacity>
        
        {/* Action buttons on the right */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => rejectLike(item)}
          >
            <Ionicons name="close" size={22} color="#FF3B30" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.matchButton}
            onPress={() => createMatch(item)}
          >
            <Ionicons name="heart" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = (type: 'sent' | 'received') => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={type === 'sent' ? "heart-outline" : "person-outline"} 
        size={60} 
        color="#ccc" 
      />
      <Text style={styles.emptyTitle}>
        {type === 'sent' ? 'No liked profiles yet' : 'No incoming likes yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {type === 'sent' 
          ? 'When you like someone, they\'ll appear here' 
          : 'When someone likes you, they\'ll appear here'
        }
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string, count: number, isOpen: boolean, toggleFunction: () => void) => (
    <TouchableOpacity 
      style={styles.sectionHeader}
      onPress={toggleFunction}
    >
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>
      <Ionicons 
        name={isOpen ? "chevron-up" : "chevron-down"} 
        size={22} 
        color="#333" 
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Loading favorites...</Text>
          </View>
        ) : (
          <>
            {/* People you liked section */}
            {renderSectionHeader(
              "People you liked", 
              sentLikes.length, 
              showSentLikes, 
              () => setShowSentLikes(!showSentLikes)
            )}
            
            {showSentLikes && (
              sentLikes.length > 0 ? (
                <View style={styles.sectionContent}>
                  {sentLikes.map((item) => (
                    <View key={item.id}>
                      {renderSentLikeItem({item})}
                    </View>
                  ))}
                </View>
              ) : (
                renderEmptyState('sent')
              )
            )}
            
            {/* People who liked you section */}
            {renderSectionHeader(
              "People who liked you", 
              receivedLikes.length, 
              showReceivedLikes, 
              () => setShowReceivedLikes(!showReceivedLikes)
            )}
            
            {showReceivedLikes && (
              receivedLikes.length > 0 ? (
                <View style={styles.sectionContent}>
                  {receivedLikes.map((item) => (
                    <View key={item.id}>
                      {renderReceivedLikeItem({item})}
                    </View>
                  ))}
                </View>
              ) : (
                renderEmptyState('received')
              )
            )}
          </>
        )}
      </ScrollView>
      
      {/* Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedProfile && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Header with close button */}
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              {/* Profile Image */}
              <View style={styles.modalImageContainer}>
                {selectedProfile.photoURL ? (
                  <Image 
                    source={{ uri: selectedProfile.photoURL }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalNoPhotoContainer}>
                    <Ionicons name="person" size={60} color="#CCCCCC" />
                  </View>
                )}
              </View>
              
              {/* Profile Details */}
              <View style={styles.modalProfileInfo}>
                <Text style={styles.modalProfileName}>
                  {selectedProfile.displayName}, {selectedProfile.ageRange}
                </Text>
                
                {selectedProfile.location && (
                  <View style={styles.modalLocationContainer}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.modalLocationText}>
                      {selectedProfile.location}
                    </Text>
                  </View>
                )}
                
                {selectedProfile.bio && (
                  <Text style={styles.modalBio}>{selectedProfile.bio}</Text>
                )}
                
                {/* Interests */}
                {selectedProfile.interests && selectedProfile.interests.length > 0 && (
                  <View style={styles.modalInterestsContainer}>
                    <Text style={styles.interestsTitle}>Interests</Text>
                    <View style={styles.interestTags}>
                      {selectedProfile.interests.map((interest: string, index: number) => (
                        <View key={index} style={styles.interestTag}>
                          <Text style={styles.interestTagText}>{interest}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsModal}>
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => {
                    const favorite = sentLikes.find(fav => fav.profile.id === selectedProfile.id);
                    if (favorite) {
                      Alert.alert(
                        'Remove Favorite',
                        'Are you sure you want to remove this person from your favorites?',
                        [
                          {
                            text: 'Cancel',
                            style: 'cancel'
                          },
                          {
                            text: 'Remove',
                            onPress: () => removeFavorite(favorite),
                            style: 'destructive'
                          }
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove Favorite</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F1ED',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginLeft: 20,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F2F1ED',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#838F6F',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  profileMainContent: {
    flexDirection: 'row',
    flex: 1,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
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
  starIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    padding: 15,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
  moreInterests: {
    fontSize: 12,
    color: '#999',
  },
  pendingText: {
    fontSize: 12,
    color: '#F0B433',
    fontWeight: '500',
  },
  likedText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  actionButtons: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 15,
    gap: 15,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  matchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: '90%',
    padding: 20,
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeButton: {
    padding: 5,
  },
  modalImageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalNoPhotoContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProfileInfo: {
    marginBottom: 20,
  },
  modalProfileName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalLocationText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  modalBio: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    lineHeight: 22,
  },
  modalInterestsContainer: {
    marginBottom: 20,
  },
  interestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestTag: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  interestTagText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtonsModal: {
    marginTop: 20,
  },
  removeButton: {
    backgroundColor: '#FFE4E4',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});