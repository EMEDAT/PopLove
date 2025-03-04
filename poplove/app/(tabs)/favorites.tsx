// app/(tabs)/favorites.tsx
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';

const { width } = Dimensions.get('window');

export default function FavoritesScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // Reload data when screen comes into focus
      fetchFavorites();
      return () => {};
    }, [])
  );

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

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

      // Fetch user profiles for each like
      const profilePromises = likes.map(async (like: any) => {
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

      const favoritesWithProfiles = (await Promise.all(profilePromises)).filter(Boolean);
      setFavorites(favoritesWithProfiles);

      if (favoritesWithProfiles.length === 0) {
        setError('No favorites yet');
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (favorite: any) => {
    try {
      // Delete the like document
      await deleteDoc(doc(firestore, 'likes', favorite.id));
      
      // Update the local state
      setFavorites(favorites.filter(fav => fav.id !== favorite.id));
      setModalVisible(false);
      
      if (favorites.length === 1) {
        setError('No favorites yet');
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
      Alert.alert('Error', 'Failed to remove favorite. Please try again.');
    }
  };

  const openProfileModal = (profile: any) => {
    setSelectedProfile(profile);
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
          <View style={styles.starIcon}>
            <Ionicons name="star" size={24} color="#F0B433" />
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
          
          <Text style={styles.pendingText}>Waiting for response</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={60} color="#ccc" />
      <Text style={styles.emptyTitle}>No favorites yet</Text>
      <Text style={styles.emptySubtitle}>When you like someone's profile, they'll appear here</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
      </View>
      
      <Text style={styles.subtitle}>People you liked</Text>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : error && favorites.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={favorites}
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
                
                {/* Status */}
                <View style={styles.statusContainer}>
                  <Text style={styles.statusTitle}>Status</Text>
                  <View style={styles.statusBadge}>
                    <Ionicons name="time-outline" size={16} color="#F0B433" />
                    <Text style={styles.statusText}>Waiting for response</Text>
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
                  style={styles.removeButton}
                  onPress={() => {
                    const favorite = favorites.find(fav => fav.profile.id === selectedProfile.id);
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
  statusContainer: {
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    color: '#F0B433',
    marginLeft: 5,
    fontWeight: '500',
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