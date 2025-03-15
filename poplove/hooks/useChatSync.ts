// hooks/useChatSync.ts
import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  writeBatch,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { useAuthContext } from '../components/auth/AuthProvider';

/**
 * Hook to sync chat/match data for a user
 * This ensures all chat displays have fresh data
 */
export const useChatSync = () => {
  const { user } = useAuthContext();
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<null | Date>(null);
  const [error, setError] = useState<string | null>(null);

  // On mount, check if user profile data has been updated
  // and sync it to all matches if necessary
  useEffect(() => {
    if (!user) return;

    // Set up a listener for the user's profile changes
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        
        // Check if profile data was updated recently (within last 5 minutes)
        const updatedAt = userData.updatedAt?.toDate();
        const lastSyncTime = lastSyncTimestamp;
        
        if (updatedAt && (!lastSyncTime || updatedAt > lastSyncTime)) {
          // Profile was updated, sync data to matches
          await syncProfileToMatches();
          setLastSyncTimestamp(new Date());
        }
      }
    }, (error) => {
      console.error('Error setting up profile listener:', error);
    });

    // Clean up
    return () => unsubscribe();
  }, [user]);

  /**
   * Sync user profile data to all matches
   */
  const syncProfileToMatches = async () => {
    if (!user) return;
    
    try {
      setSyncInProgress(true);
      setError(null);
      
      // 1. Get the user's current profile data
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }
      
      const profileData = userDoc.data();
      
      // 2. Get all matches where user is a participant
      const matchesRef = collection(firestore, 'matches');
      const q = query(matchesRef, where('users', 'array-contains', user.uid));
      const matchesSnapshot = await getDocs(q);
      
      if (matchesSnapshot.empty) {
        console.log('No matches found to sync');
        return;
      }
      
      // 3. Update user profile in each match
      const batch = writeBatch(firestore);
      
      matchesSnapshot.docs.forEach(matchDoc => {
        const matchData = matchDoc.data();
        
        // Ensure we're not overwriting existing data structure
        if (matchData.userProfiles && matchData.userProfiles[user.uid]) {
          batch.update(matchDoc.ref, {
            [`userProfiles.${user.uid}.displayName`]: profileData.displayName || 'User',
            [`userProfiles.${user.uid}.photoURL`]: profileData.photoURL || '',
            updatedAt: serverTimestamp()
          });
        }
      });
      
      // Commit all updates
      await batch.commit();
      
      console.log(`Synced profile to ${matchesSnapshot.size} matches`);
    } catch (error) {
      console.error('Error syncing profile to matches:', error);
      setError('Failed to sync profile data');
    } finally {
      setSyncInProgress(false);
    }
  };

  /**
   * Force a sync of profile data to all matches
   */
  const forceSync = async () => {
    await syncProfileToMatches();
    setLastSyncTimestamp(new Date());
  };

  return {
    syncInProgress,
    lastSyncTimestamp,
    error,
    forceSync
  };
};

export default useChatSync;