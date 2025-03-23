// components/profile/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Alert,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthContext } from '../auth/AuthProvider';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import theme from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface SettingsScreenProps {
    onBack?: () => void;
  }

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { user, signOut, resetAuth } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
    darkMode: false,
    incognitoMode: false,
    allowLocation: true,
    distanceUnit: 'km', // 'km' or 'mi'
    language: 'english',
    showOnlineStatus: true,
    showActivity: true,
    allowScreenshots: true,
    autoplayVideos: true
  });
  
  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If user has settings, use them
          if (userData.settings) {
            setSettings({
              ...settings,
              ...userData.settings
            });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        Alert.alert('Error', 'Failed to load your settings');
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [user]);
  
  // Toggle a setting
  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting]
    });
  };
  
  // Set distance unit
  const setDistanceUnit = (unit: 'km' | 'mi') => {
    setSettings({
      ...settings,
      distanceUnit: unit
    });
  };
  
  // Set language
  const setLanguage = (language: string) => {
    setSettings({
      ...settings,
      language
    });
  };
  
  // Save settings
  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Update Firestore document
      await updateDoc(doc(firestore, 'users', user.uid), {
        'settings': settings,
        updatedAt: serverTimestamp()
      });
      
      Alert.alert('Success', 'Your settings have been updated');
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update your settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle sign out
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
  
  // Handle account deletion
  const handleDeleteAccount = () => {
    setShowDeleteConfirmation(true);
  };
  
  // Confirm account deletion
  const confirmDeleteAccount = async () => {
    try {
      // Reset Auth is a method that deletes user and logs them out
      await resetAuth();
      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete your account. Please try again.');
      setShowDeleteConfirmation(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your settings...</Text>
      </View>
    );
  }
  
  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack || (() => router.back())} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {/* App Settings Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Switch between light and dark themes
              </Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => toggleSetting('darkMode')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Incognito Mode</Text>
              <Text style={styles.settingDescription}>
                Browse without appearing in others' recommendations
              </Text>
            </View>
            <Switch
              value={settings.incognitoMode}
              onValueChange={() => toggleSetting('incognitoMode')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Location</Text>
              <Text style={styles.settingDescription}>
                Allow app to access your location
              </Text>
            </View>
            <Switch
              value={settings.allowLocation}
              onValueChange={() => toggleSetting('allowLocation')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Distance Unit</Text>
              <Text style={styles.settingDescription}>
                Choose your preferred distance unit
              </Text>
            </View>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  settings.distanceUnit === 'km' && styles.toggleButtonActive
                ]}
                onPress={() => setDistanceUnit('km')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  settings.distanceUnit === 'km' && styles.toggleButtonTextActive
                ]}>km</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  settings.distanceUnit === 'mi' && styles.toggleButtonActive
                ]}
                onPress={() => setDistanceUnit('mi')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  settings.distanceUnit === 'mi' && styles.toggleButtonTextActive
                ]}>mi</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingDescription}>
                Your preferred language
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.languageSelector}
              onPress={() => {
                // Show language picker
                Alert.alert(
                  "Language",
                  "This feature is coming soon!",
                  [{ text: "OK" }]
                );
              }}
            >
              <Text style={styles.languageText}>
                {settings.language.charAt(0).toUpperCase() + settings.language.slice(1)}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.gray[500]} />
            </TouchableOpacity>
          </View>
        </View> */}
        
        {/* Privacy Settings Section */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Online Status</Text>
              <Text style={styles.settingDescription}>
                Show when you're active on the app
              </Text>
            </View>
            <Switch
              value={settings.showOnlineStatus}
              onValueChange={() => toggleSetting('showOnlineStatus')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Activity Status</Text>
              <Text style={styles.settingDescription}>
                Show your activity to others
              </Text>
            </View>
            <Switch
              value={settings.showActivity}
              onValueChange={() => toggleSetting('showActivity')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Allow Screenshots</Text>
              <Text style={styles.settingDescription}>
                Allow taking screenshots within the app
              </Text>
            </View>
            <Switch
              value={settings.allowScreenshots}
              onValueChange={() => toggleSetting('allowScreenshots')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Autoplay Videos</Text>
              <Text style={styles.settingDescription}>
                Automatically play videos in feed
              </Text>
            </View>
            <Switch
              value={settings.autoplayVideos}
              onValueChange={() => toggleSetting('autoplayVideos')}
              trackColor={{ false: '#D1D1D6', true: theme.colors.primary }}
              ios_backgroundColor="#D1D1D6"
            />
          </View>
        </View> */}
        
        {/* Support, Legal, Account Sections */}
        {/* <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray[500]} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray[500]} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray[500]} />
          </TouchableOpacity>
        </View> */}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSignOut}
          >
            <Text style={styles.menuItemText}>Sign Out</Text>
            <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
          
          {/* <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.menuItemText, styles.deleteText]}>Delete Account</Text>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity> */}
        </View>
        
        {/* Save button */}
        {/* <TouchableOpacity 
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
        </TouchableOpacity> */}
        
        {/* App Version */}
        {/* <Text style={styles.versionText}>Version 1.0.0</Text> */}
      </ScrollView>
      
      {/* Delete Account Confirmation Modal */}
      {/* <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="warning" size={40} color="#fff" />
            </View>
            
            <Text style={styles.modalTitle}>Delete Account</Text>
            
            <Text style={styles.modalText}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal> */}
    </>
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
  toggleButtons: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  toggleButtonTextActive: {
    color: '#FFF',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    marginRight: 5,
    color: theme.colors.gray[600],
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  deleteText: {
    color: theme.colors.error,
  },
  saveButton: {
    width: '100%',
    height: 50,
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.gray[500],
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 14,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: theme.colors.gray[600],
    fontSize: 16,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
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