// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  Alert, 
  ScrollView,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import UserMediaGallery from '../../components/profile/UserMediaGallery';
import ProfileImageChanger from '../../components/profile/ProfileImageChanger';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut, resetAuth } = useAuthContext();
  const [activeTab, setActiveTab] = useState<'photos' | 'about'>('about');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<React.ReactNode | null>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode | null>(null);

  // Set initial profile photo from user object
  useEffect(() => {
    if (user?.photoURL) {
      setProfilePhoto(user.photoURL);
    }
  }, [user]);

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: () => signOut()
        }
      ]
    );
  };

  const handleResetAuth = () => {
    Alert.alert(
      "Reset Authentication",
      "This will completely reset your authentication state and clear onboarding progress. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          onPress: () => resetAuth(),
          style: "destructive"
        }
      ]
    );
  };

  // Handler for profile image updates
  const handleProfileImageUpdated = (newUrl: string) => {
    setProfilePhoto(newUrl);
  };

  const menuItems = [
    {
      id: 'details',
      title: 'Personal Details',
      icon: 'person-outline',
      action: () => {
        try {
          const PersonalDetailsScreen = require('../../components/profile/PersonalDetailsScreen').default;
          setModalContent(
            <PersonalDetailsScreen 
              onBack={() => {
                setModalContent(null);
                // Allow time for modal to close before accepting new inputs
                setTimeout(() => setModalContent(null), 300);
              }} 
            />
          );
        } catch (error) {
          console.error("Failed to load component:", error);
          Alert.alert("Error", "Could not load component: " + (error as Error).message);
        }
      }
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications-outline',
      action: () => {
        try {
          const NotificationsScreen = require('../../components/profile/NotificationsScreen').default;
          setModalContent(
            <NotificationsScreen
              onBack={() => {
                setModalContent(null);
                // Allow time for modal to close before accepting new inputs
                setTimeout(() => setModalContent(null), 300);
              }} 
            />
          );
        } catch (error) {
          console.error("Failed to load component:", error);
          Alert.alert("Error", "Could not load component: " + (error as Error).message);
        }
      }
    },
    {
      id: 'favorites',
      title: 'Favourites',
      icon: 'heart-outline',
      action: () => router.push('/(tabs)/favorites')
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      action: () => {
        try {
          const SettingsScreen = require('../../components/profile/SettingsScreen').default;
          setModalContent(
            <SettingsScreen
              onBack={() => {
                setModalContent(null);
                // Allow time for modal to close before accepting new inputs
                setTimeout(() => setModalContent(null), 300);
              }} 
            />
          );
        } catch (error) {
          console.error("Failed to load component:", error);
          Alert.alert("Error", "Could not load component: " + (error as Error).message);
        }
      }
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <ProfileImageChanger 
              photoURL={profilePhoto}
              onImageUpdated={handleProfileImageUpdated}
            />
            {/* Blue checkmark badge */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          
          {/* Tab selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'about' && styles.activeTab]}
              onPress={() => setActiveTab('about')}
            >
              <Text style={[styles.tabText, activeTab === 'about' && styles.activeTabText]}>About</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
              onPress={() => setActiveTab('photos')}
            >
              <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>Media</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'about' ? (
            /* Menu Items */
            <View style={styles.menuContainer}>
              {menuItems.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.menuItem}
                  onPress={item.action}
                >
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon as any} size={18} color="#333" />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#111111" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            /* Media Gallery */
            <View style={styles.galleryContainer}>
              {user && <UserMediaGallery userId={user.uid} isCurrentUser={true} />}
            </View>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
            <Text style={styles.logoutText}>Log Out</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Modal for screens */}
      {modalContent && (
        <Modal visible={!!modalContent} animationType="slide">
          <SafeAreaView style={{flex: 1}}>
            {modalContent}
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 70 : 10,
    paddingBottom: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 2,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0084FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 60
  },
  tabSelector: {
    flexDirection: 'row',
    width: '80%',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
  },
  menuContainer: {
    paddingHorizontal: 35,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIconContainer: {
    width: 40,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
  },
  galleryContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  logoutButton: {
    marginTop: 30,
    marginHorizontal: 20,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  resetButton: {
    marginTop: 20,
    marginHorizontal: 20,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  resetText: {
    color: '#666',
  },
});