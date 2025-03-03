// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { GradientButton } from '../../components/ui/GradientButton';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.7;

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
          };
          
          return {
            id: doc.id,
            displayName: data.displayName || 'User',
            photoURL: data.photoURL,
            bio: data.bio || '',
            location: data.location || 'Unknown',
            ageRange: data.ageRange || '',
            interests: data.interests || [],
            gender: data.gender || '',
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

  const handleLike = () => {
    // In a real app, you would save this like to Firestore
    console.log('Liked profile:', profiles[currentProfileIndex]?.id);
    
    // Move to the next profile
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(currentProfileIndex + 1);
    } else {
      // We've reached the end of the profiles
      setError('No more profiles to show right now. Check back soon!');
    }
  };

  const handlePass = () => {
    // In a real app, you would save this pass to Firestore
    console.log('Passed on profile:', profiles[currentProfileIndex]?.id);
    
    // Move to the next profile
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(currentProfileIndex + 1);
    } else {
      // We've reached the end of the profiles
      setError('No more profiles to show right now. Check back soon!');
    }
  };

  const renderCurrentProfile = () => {
    if (profiles.length === 0 || currentProfileIndex >= profiles.length) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {error || 'No profiles available right now. Check back soon!'}
          </Text>
        </View>
      );
    }

    const profile = profiles[currentProfileIndex];
    
    return (
      <View style={styles.cardContainer}>
        <View style={styles.card}>
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
          
          <View style={styles.profileInfo}>
            <View style={styles.nameAgeContainer}>
              <Text style={styles.profileName}>
                {profile.displayName || 'User'}, 
              </Text>
              <Text style={styles.profileAge}>
                {profile.ageRange?.split(' ')[0] || '??'}
              </Text>
            </View>
            
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.locationText}>
                {profile.location || 'Unknown location'}
              </Text>
            </View>
            
            {profile.bio && (
              <View style={styles.bioContainer}>
                <Text style={styles.bioText} numberOfLines={3}>
                  {profile.bio}
                </Text>
              </View>
            )}
            
            {/* Interests/Tags */}
            {profile.interests && profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                {profile.interests.slice(0, 4).map((interest: string, index: number) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.passButton]}
            onPress={handlePass}
          >
            <Ionicons name="close" size={32} color="#FF3B30" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.likeButton]}
            onPress={handleLike}
          >
            <Ionicons name="heart" size={32} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PopLove</Text>
        
        {user && (
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="notifications-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Finding people near you...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {renderCurrentProfile()}
        </View>
      )}
      
      <View style={styles.footer}>
        <GradientButton
          title="Start Quick Match"
          onPress={() => console.log("Quick match pressed")}
          variant="primary"
          style={styles.quickMatchButton}
        />
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  profileButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    width: width * 0.9,
    height: CARD_HEIGHT,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    height: CARD_HEIGHT - 80, // Leave space for actions
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  noPhotoContainer: {
    width: '100%',
    height: '75%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    marginTop: 10,
    color: '#999',
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
  profileAge: {
    fontSize: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  bioContainer: {
    marginBottom: 10,
  },
  bioText: {
    fontSize: 14,
    color: '#444',
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
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '60%',
    marginTop: 20,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  passButton: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  likeButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  quickMatchButton: {
    height: 50,
  },
});