// utils/profileStateManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const PROFILE_STORAGE_KEY = 'poplove_last_viewed_profile';
const PROFILE_MODAL_VISIBLE_KEY = 'poplove_profile_modal_visible';

/**
 * Utility to manage persistent state for profile viewing between navigations
 */
export class ProfileStateManager {
  
  /**
   * Save the currently viewed profile before navigation
   * @param profile The profile data to save
   * @param setModalVisible Whether to set modal visible on restore
   */
  static async saveViewedProfile(profile: any, setModalVisible: boolean = true): Promise<void> {
    try {
      if (!profile) return;
      
      // Save profile data
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      
      // Save visibility state
      await AsyncStorage.setItem(PROFILE_MODAL_VISIBLE_KEY, setModalVisible ? 'true' : 'false');
      
      console.log('Profile state saved successfully');
    } catch (error) {
      console.error('Error saving profile state:', error);
    }
  }
  
  /**
   * Get the last viewed profile if available
   */
  static async getLastViewedProfile(): Promise<any | null> {
    try {
      const profileData = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      
      if (!profileData) return null;
      
      return JSON.parse(profileData);
    } catch (error) {
      console.error('Error retrieving profile state:', error);
      return null;
    }
  }
  
  /**
   * Check if the modal should be visible on restore
   */
  static async shouldShowModal(): Promise<boolean> {
    try {
      const shouldShow = await AsyncStorage.getItem(PROFILE_MODAL_VISIBLE_KEY);
      return shouldShow === 'true';
    } catch (error) {
      console.error('Error checking modal visibility state:', error);
      return false;
    }
  }
  
  /**
   * Clear saved profile state
   */
  static async clearSavedState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
      await AsyncStorage.removeItem(PROFILE_MODAL_VISIBLE_KEY);
    } catch (error) {
      console.error('Error clearing profile state:', error);
    }
  }
  
  /**
   * Restore profile viewing state (combined operation for HomeScreen)
   * @returns Object with profile and visibility state
   */
  static async restoreViewingState(): Promise<{
    profile: any | null;
    showModal: boolean;
  }> {
    try {
      const [profile, showModal] = await Promise.all([
        this.getLastViewedProfile(),
        this.shouldShowModal()
      ]);
      
      // Clear state after retrieving to prevent unwanted reopening
      await this.clearSavedState();
      
      return { profile, showModal };
    } catch (error) {
      console.error('Error restoring profile viewing state:', error);
      return { profile: null, showModal: false };
    }
  }
}