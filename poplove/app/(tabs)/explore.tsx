// app/(tabs)/explore.tsx
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  SafeAreaView, 
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const { user } = useAuthContext();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    maxDistance: 30,
    minAge: 18,
    maxAge: 35,
    interests: [] as string[]
  });
  
  // List of available interests for filter
  const availableInterests = [
    'Swimming', 'Photography', 'Shopping', 'Karaoke', 
    'Cooking', 'K-Pop', 'Table-Tennis', 'Art',
    'Music', 'Video games', 'Drinks', 'Yoga'
  ];

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Build query for profiles
      const profilesRef = collection(firestore, 'users');
      
      // Apply some basic filtering
      let profilesQuery = query(
        profilesRef,
        where('hasCompletedOnboarding', '==', true),
        limit(20)
      );
      
      const querySnapshot = await getDocs(profilesQuery);
      
      // Convert to array and filter out current user
      const fetchedProfiles = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(profile => profile.id !== user.uid);
      
      setProfiles(fetchedProfiles);
      
      if (fetchedProfiles.length === 0) {
        setError('No profiles available right now.');
      }
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      setError('Failed to load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfiles();
  };

  const toggleInterestFilter = (interest: string) => {
    if (filters.interests.includes(interest)) {
      setFilters({
        ...filters,
        interests: filters.interests.filter(i => i !== interest)
      });
    } else {
      setFilters({
        ...filters,
        interests: [...filters.interests, interest]
      });
    }
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    fetchProfiles(); // In a real app, this would use the filters
  };

  const resetFilters = () => {
    setFilters({
      maxDistance: 30,
      minAge: 18,
      maxAge: 35,
      interests: []
    });
  };

  const renderProfileItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.profileCard}>
      <View style={styles.profileImageContainer}>
        {item.photoURL ? (
          <Image 
            source={{ uri: item.photoURL }} 
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noPhotoContainer}>
            <Ionicons name="person" size={40} color="#CCCCCC" />
          </View>
        )}
      </View>
      
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {item.displayName || 'User'}, {item.ageRange?.split(' ')[0] || '??'}
        </Text>
        
        {item.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
        
        {item.interests && item.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {item.interests.slice(0, 2).map((interest: string, index: number) => (
              <Text key={index} style={styles.interestText}>
                {interest}{index < Math.min(item.interests.length, 2) - 1 ? ' • ' : ''}
              </Text>
            ))}
            {item.interests.length > 2 && (
              <Text style={styles.moreInterests}>+{item.interests.length - 2}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Discover new people nearby</Text>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfiles}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfileItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Distance</Text>
              <Text style={styles.filterValue}>{filters.maxDistance}km</Text>
              {/* In a real app, add a slider here */}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Age Preference</Text>
              <Text style={styles.filterValue}>{filters.minAge} - {filters.maxAge}</Text>
              {/* In a real app, add a range slider here */}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Interest</Text>
              <View style={styles.interestFilters}>
                {availableInterests.map((interest) => (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.interestFilterButton,
                      filters.interests.includes(interest) && styles.selectedInterestFilter
                    ]}
                    onPress={() => toggleInterestFilter(interest)}
                  >
                    <Text
                      style={[
                        styles.interestFilterText,
                        filters.interests.includes(interest) && styles.selectedInterestFilterText
                      ]}
                    >
                      {interest}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  retryText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    padding: 5,
  },
  profileCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  profileImageContainer: {
    width: '100%',
    aspectRatio: 0.8,
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
  profileInfo: {
    padding: 10,
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
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
  moreInterests: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  filterValue: {
    fontSize: 14,
    color: '#666',
  },
  interestFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  interestFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    margin: 4,
  },
  selectedInterestFilter: {
    backgroundColor: '#FFE4E4',
    borderColor: '#FF6B6B',
  },
  interestFilterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedInterestFilterText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  resetButton: {
    width: '45%',
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 23,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    width: '45%',
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});