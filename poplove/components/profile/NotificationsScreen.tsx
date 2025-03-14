// components/profile/NotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import theme from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface NotificationsScreenProps {
    onBack?: () => void;
  }
  export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    newMatches: true,
    messages: true,
    likes: true,
    inAppVibration: true,
    inAppSound: true,
    emailNotifications: true,
    lineupTurn: true,
    eventUpdates: false,
    promotions: false
  });
  
  // Load notification settings
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If user has notification settings, use them
          if (userData.notificationSettings) {
            setNotificationSettings({
              ...notificationSettings,
              ...userData.notificationSettings
            });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading notification settings:', error);
        Alert.alert('Error', 'Failed to load your notification settings');
        setLoading(false);
      }
    };
    
    loadNotificationSettings();
  }, [user]);
  
  // Toggle a notification setting
  const toggleSetting = (setting: keyof typeof notificationSettings) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    });
  };
  
  // Save notification settings
  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Update Firestore document
      await updateDoc(doc(firestore, 'users', user.uid), {
        'notificationSettings': notificationSettings,
        updatedAt: serverTimestamp()
      });
      
      Alert.alert('Success', 'Your notification settings have been updated');
      if (onBack) {
        onBack();
      } 
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Error', 'Failed to update your notification settings');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your notification settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Push Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>New Matches</Text>
            <Text style={styles.settingDescription}>
              Get notified when you match with someone
            </Text>
          </View>
          <Switch
            value={notificationSettings.newMatches}
            onValueChange={() => toggleSetting('newMatches')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Messages</Text>
            <Text style={styles.settingDescription}>
              Get notified when you receive a new message
            </Text>
          </View>
          <Switch
            value={notificationSettings.messages}
            onValueChange={() => toggleSetting('messages')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Likes</Text>
            <Text style={styles.settingDescription}>
              Get notified when someone likes your profile
            </Text>
          </View>
          <Switch
            value={notificationSettings.likes}
            onValueChange={() => toggleSetting('likes')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Line-Up Turn</Text>
            <Text style={styles.settingDescription}>
              Get notified when it's your turn in the Line-Up feature
            </Text>
          </View>
          <Switch
            value={notificationSettings.lineupTurn}
            onValueChange={() => toggleSetting('lineupTurn')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
      </View>
      
      {/* In-App Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>In-App</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Vibration</Text>
            <Text style={styles.settingDescription}>
              Vibrate your device for in-app notifications
            </Text>
          </View>
          <Switch
            value={notificationSettings.inAppVibration}
            onValueChange={() => toggleSetting('inAppVibration')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Sound</Text>
            <Text style={styles.settingDescription}>
              Play sounds for in-app notifications
            </Text>
          </View>
          <Switch
            value={notificationSettings.inAppSound}
            onValueChange={() => toggleSetting('inAppSound')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
      </View>
      
      {/* Email Notification Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Email Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive email notifications for important updates
            </Text>
          </View>
          <Switch
            value={notificationSettings.emailNotifications}
            onValueChange={() => toggleSetting('emailNotifications')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Event Updates</Text>
            <Text style={styles.settingDescription}>
              Get notified about local events and activities
            </Text>
          </View>
          <Switch
            value={notificationSettings.eventUpdates}
            onValueChange={() => toggleSetting('eventUpdates')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Promotions</Text>
            <Text style={styles.settingDescription}>
              Receive promotional offers and updates
            </Text>
          </View>
          <Switch
            value={notificationSettings.promotions}
            onValueChange={() => toggleSetting('promotions')}
            trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
            ios_backgroundColor="#D1D1D6"
          />
        </View>
      </View>
      
      {/* Save button */}
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={saveSettings}
        disabled={saving}
      >
          <LinearGradient
            colors={['#EC5F61', '#F0B433']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
        {saving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 25,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginHorizontal: 15,
    marginVertical: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    color: theme.colors.gray[500],
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: 15,
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gradientButton: {
    width: '90%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    marginLeft: '5%',
  },
});