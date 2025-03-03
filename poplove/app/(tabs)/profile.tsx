// app/(tabs)/profile.tsx
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  SafeAreaView, 
  Alert, 
  ScrollView,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../components/auth/AuthProvider';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
  const { user, signOut, resetAuth } = useAuthContext();

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

  const menuItems = [
    {
      id: 'details',
      title: 'Personal Details',
      icon: 'person-outline',
      action: () => console.log('Navigate to personal details')
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'notifications-outline',
      action: () => console.log('Navigate to notifications')
    },
    {
      id: 'favorites',
      title: 'Favourites',
      icon: 'heart-outline',
      action: () => console.log('Navigate to favorites')
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      action: () => console.log('Navigate to settings')
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image 
                source={{ uri: user.photoURL }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
            {/* Blue checkmark badge */}
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map(item => (
            <TouchableOpacity 
              key={item.id}
              style={styles.menuItem}
              onPress={item.action}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name={item.icon as any} size={22} color="#333" />
              </View>
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Log Out</Text>
          </View>
        </TouchableOpacity>

        {/* Reset Auth Button (for development) */}
        {__DEV__ && (
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={handleResetAuth}
          >
            <Text style={styles.resetText}>Reset Auth State</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 8,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0084FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 20,
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
    fontSize: 16,
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
    color: '#FF3B30',
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