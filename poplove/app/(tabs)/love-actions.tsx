// app/(tabs)/love-actions.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    Image, 
    TouchableOpacity, 
    SafeAreaView,
    ActivityIndicator,
    Platform,
    Dimensions,
    Modal,
    Alert
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, where, doc, getDoc, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function LoveActionsScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [pendingLikes, setPendingLikes] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [vibePercentage, setVibePercentage] = useState(0);

  useEffect(() => {
    if (user) {
      fetchPendingLikes();
    }
  }, [user]);

  const fetchPendingLikes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query likes where this user is the target and status is pending
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
        const userDoc = await getDoc(doc(firestore, 'users', like.fromUserId));
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
      setPendingLikes(likesWithProfiles);

      if (likesWithProfiles.length === 0) {
        setError('No pending likes at the moment');
      }
    } catch (err) {
      console.error('Error fetching pending likes:', err);
      setError('Failed to load likes');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptLike = async (like: any) => {
    try {
      // Update like status
      const likeRef = doc(firestore, 'likes', like.id);
      await updateDoc(likeRef, {
        status: 'matched',
        updatedAt: serverTimestamp()
      });
  
      // Create a reverse like
      const reverselikeRef = doc(firestore, 'likes', `${user?.uid}_${like.fromUserId}`);
      await setDoc(reverselikeRef, {
        fromUserId: user?.uid,
        toUserId: like.fromUserId,
        createdAt: serverTimestamp(),
        status: 'matched'
      });
  
        // Create a match
        const userUid = user?.uid;
        if (userUid) {
        const newMatchRef = doc(collection(firestore, 'matches'));
        const matchId = newMatchRef.id;
        
        const userProfiles: Record<string, { displayName?: string | null, photoURL?: string | null }> = {};
        
        userProfiles[userUid] = {
            displayName: user?.displayName,
            photoURL: user?.photoURL,
        };
        
        userProfiles[like.fromUserId] = {
            displayName: like.profile.displayName,
            photoURL: like.profile.photoURL,
        };
        
        await setDoc(newMatchRef, {
            users: [userUid, like.fromUserId],
            userProfiles,
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp() 
        });
        
        // ADD THE NEW CODE HERE, AFTER CREATING THE MATCH DOCUMENT
        // Create initial system message
        await addDoc(collection(firestore, 'matches', matchId, 'messages'), {
            text: "You matched! Start a conversation.",
            senderId: "system",
            createdAt: serverTimestamp()
        });
        
        // Remove from local state
        setPendingLikes(pendingLikes.filter(pendingLike => pendingLike.id !== like.id));
        setModalVisible(false);
        
        // Display a match notification
        Alert.alert(
          "It's a Match! 💖",
          `You and ${like.profile.displayName} like each other!`,
          [
            { 
              text: "Keep Browsing", 
              style: "cancel" 
            },
            { 
              text: "Message Now", 
              onPress: () => {
                // Direct navigation to chat screen with the specific match ID
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: matchId }
                  });
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('Error accepting like:', err);
      Alert.alert('Error', 'Failed to accept like. Please try again.');
    }
  };

  const handleRejectLike = async (like: any) => {
    try {
      // Update like status
      const likeRef = doc(firestore, 'likes', like.id);
      await updateDoc(likeRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      // Remove from local state
      setPendingLikes(pendingLikes.filter(pendingLike => pendingLike.id !== like.id));
      setModalVisible(false);
    } catch (err) {
      console.error('Error rejecting like:', err);
      Alert.alert('Error', 'Failed to reject like. Please try again.');
    }
  };

  const openProfileModal = (profile: any) => {
    setSelectedProfile(profile);
    // Generate random vibe percentage for demo
    setVibePercentage(Math.floor(Math.random() * 50) + 50);
    setModalVisible(true);
  };

  const renderProfileItem = ({ item }: { item: any }) => {
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
          <View style={styles.heartIcon}>
            <Ionicons name="heart" size={24} color="#FF6B6B" />
          </View>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {profile.displayName || 'User'}, {profile.ageRange}
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
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No pending likes</Text>
      <Text style={styles.emptySubtitle}>When someone likes your profile, they'll appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Love Actions</Text>
      </View>
      
      <Text style={styles.subtitle}>People who liked your profile</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading likes...</Text>
        </View>
      ) : error && pendingLikes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={pendingLikes}
          renderItem={renderProfileItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
      
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
                
                {/* Vibe Check */}
                <View style={styles.vibeContainer}>
                  <Text style={styles.vibeTitle}>Vibe Check</Text>
                  
                  <View style={styles.vibeBarContainer}>
                    <View style={[styles.vibeBar, { width: `${vibePercentage}%` }]}>
                      <LinearGradient
                        colors={['#F0B433', '#EC5F61']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.vibeGradient}
                      />
                    </View>
                    <Text style={styles.vibePercentage}>{vibePercentage}%</Text>
                  </View>
                </View>
                
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
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectLike(pendingLikes.find(like => like.profile.id === selectedProfile.id))}
                >
                  <Ionicons name="close" size={24} color="#FF3B30" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => handleAcceptLike(pendingLikes.find(like => like.profile.id === selectedProfile.id))}
                >
                  <LinearGradient
                    colors={['#F0B433', '#EC5F61']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.chatButtonGradient}
                  >
                    <Text style={styles.chatButtonText}>Chat Now</Text>
                  </LinearGradient>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
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
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
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
  listContent: {
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
  likedText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
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
  vibeContainer: {
    marginBottom: 20,
  },
  vibeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  vibeBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vibeBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
    flex: 1,
    marginRight: 10,
  },
  vibeGradient: {
    height: '100%',
    width: '100%',
  },
  vibePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  rejectButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginRight: 20,
  },
  chatButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  chatButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});