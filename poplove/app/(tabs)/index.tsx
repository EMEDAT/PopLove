// app/(tabs)/index.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { collection, query, getDocs, orderBy, limit } from '@react-native-firebase/firestore';
import { firestore } from '../../lib/firebase';

export default function HomeScreen() {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [featuredProfiles, setFeaturedProfiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a Firestore query to get featured profiles
        const profilesRef = collection(firestore, 'users');
        const profilesQuery = query(
          profilesRef,
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        // Fetch profiles
        const querySnapshot = await getDocs(profilesQuery);
        
        // Map the documents to a more usable format
        const profiles = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        // Set the profiles in state
        setFeaturedProfiles(profiles);
      } catch (err: any) {
        console.error('Error fetching profiles:', err);
        setError('Failed to load profiles');
      } finally {
        setLoading(false);
      }
    };
    
    // Fetch profiles when the component mounts
    fetchFeaturedProfiles();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>PopLove</Text>
          
          {user && (
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="notifications-outline" size={24} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome{user?.displayName ? `, ${user.displayName}` : ''}!
          </Text>
          <Text style={styles.subtitleText}>
            Find your perfect match today
          </Text>
        </View>
        
        {/* Featured Profiles Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Profiles</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : featuredProfiles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No profiles available</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredContainer}
          >
            {featuredProfiles.map((profile) => (
              <TouchableOpacity key={profile.id} style={styles.profileCard}>
                <Image
                  source={
                    profile.photoURL 
                      ? { uri: profile.photoURL } 
                      : require('../../assets/images/default-profile.jpg')
                  }
                  style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.displayName || 'User'}</Text>
                  <Text style={styles.profileBio} numberOfLines={1}>
                    {profile.bio || 'No bio available'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        
        {/* Quick Match Button */}
        <TouchableOpacity style={styles.quickMatchButton}>
          <LinearGradient
            colors={['#FF6B6B', '#FFA07A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            <Text style={styles.quickMatchText}>Start Quick Match</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  profileButton: {
    padding: 8,
  },
  welcomeSection: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    borderRadius: 10,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  featuredContainer: {
    paddingBottom: 15,
  },
  profileCard: {
    width: 150,
    borderRadius: 15,
    backgroundColor: '#f9f9f9',
    marginRight: 15,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  profileInfo: {
    padding: 10,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
  },
  profileBio: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  quickMatchButton: {
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 25,
    overflow: 'hidden',
  },
  gradient: {
    padding: 16,
    alignItems: 'center',
  },
  quickMatchText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});