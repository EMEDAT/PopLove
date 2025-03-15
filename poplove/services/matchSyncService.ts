// services/matchSyncService.ts
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    writeBatch, 
    doc, 
    serverTimestamp, 
    getDoc,
    updateDoc,
    setDoc,
    addDoc
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';

/**
 * Service for synchronizing user profile data across matches
 */
export class MatchSyncService {
    /**
     * Updates a user's profile photo across all their matches
     * @param userId - The ID of the user
     * @param newPhotoURL - The new photo URL
     * @returns Promise that resolves when all matches are updated
     */
    static async updateProfilePhoto(userId: string, newPhotoURL: string): Promise<void> {
        if (!userId || !newPhotoURL) return;
        
        try {
            // Find all matches containing this user
            const matchesRef = collection(firestore, 'matches');
            const q = query(matchesRef, where('users', 'array-contains', userId));
            const matchesSnapshot = await getDocs(q);
            
            if (matchesSnapshot.empty) {
                console.log('No matches found for user');
                return;
            }
            
            // Use batch write for efficiency
            const batch = writeBatch(firestore);
            
            matchesSnapshot.docs.forEach(matchDoc => {
                // Update the user's profile photo in this match
                batch.update(matchDoc.ref, {
                    [`userProfiles.${userId}.photoURL`]: newPhotoURL,
                    updatedAt: serverTimestamp()
                });
            });
            
            // Commit all updates
            await batch.commit();
            
            console.log(`Updated profile photo in ${matchesSnapshot.size} matches`);
        } catch (error) {
            console.error('Error updating profile photo in matches:', error);
            throw error;
        }
    }
    
    /**
     * Updates a user's display name across all their matches
     * @param userId - The ID of the user
     * @param newDisplayName - The new display name
     * @returns Promise that resolves when all matches are updated
     */
    static async updateDisplayName(userId: string, newDisplayName: string): Promise<void> {
        if (!userId || !newDisplayName) return;
        
        try {
            // Find all matches containing this user
            const matchesRef = collection(firestore, 'matches');
            const q = query(matchesRef, where('users', 'array-contains', userId));
            const matchesSnapshot = await getDocs(q);
            
            if (matchesSnapshot.empty) {
                console.log('No matches found for user');
                return;
            }
            
            // Use batch write for efficiency
            const batch = writeBatch(firestore);
            
            matchesSnapshot.docs.forEach(matchDoc => {
                // Update the user's display name in this match
                batch.update(matchDoc.ref, {
                    [`userProfiles.${userId}.displayName`]: newDisplayName,
                    updatedAt: serverTimestamp()
                });
            });
            
            // Commit all updates
            await batch.commit();
            
            console.log(`Updated display name in ${matchesSnapshot.size} matches`);
        } catch (error) {
            console.error('Error updating display name in matches:', error);
            throw error;
        }
    }
    
    /**
     * Archives an old profile photo to the user's media gallery
     * @param userId - The ID of the user
     * @param photoURL - The URL of the photo to archive
     * @returns Promise that resolves when the photo is archived
     */
    static async archiveProfilePhoto(userId: string, photoURL: string): Promise<void> {
        if (!userId || !photoURL) return;
        
        try {
            // Get user document to check if photo exists
            const userDoc = await getDoc(doc(firestore, 'users', userId));
            
            if (!userDoc.exists()) {
                console.error('User document not found');
                return;
            }
            
            // Add to user's media gallery
            const mediaRef = collection(firestore, 'users', userId, 'media');
            await getDocs(query(mediaRef, where('imageURL', '==', photoURL)))
                .then(snapshot => {
                    // Only add if not already in media gallery
                    if (snapshot.empty) {
                        return addDoc(collection(firestore, 'users', userId, 'media'), {
                            imageURL: photoURL,
                            type: 'photo',
                            isProfilePhoto: false,
                            wasProfilePhoto: true,
                            createdAt: serverTimestamp(),
                            description: 'Previous profile photo'
                        });
                    }
                });
            
            console.log('Archived old profile photo to media gallery');
        } catch (error) {
            console.error('Error archiving profile photo:', error);
            throw error;
        }
    }
    
    /**
     * Creates a match list summary document for a user if it doesn't exist
     * This helps with efficiently finding all matches for a user
     * @param userId - The ID of the user
     * @returns Promise that resolves when the summary is updated
     */
    static async ensureMatchListSummary(userId: string): Promise<void> {
        if (!userId) return;
        
        try {
            // Find all matches containing this user
            const matchesRef = collection(firestore, 'matches');
            const q = query(matchesRef, where('users', 'array-contains', userId));
            const matchesSnapshot = await getDocs(q);
            
            // Get match IDs
            const matchIds = matchesSnapshot.docs.map(doc => doc.id);
            
            // Update or create the summary document
            const summaryRef = doc(firestore, `users/${userId}/matchList/summary`);
            
            await getDoc(summaryRef).then(async (doc) => {
                if (doc.exists()) {
                    return updateDoc(doc.ref, {
                        matches: matchIds,
                        updatedAt: serverTimestamp()
                    });
                } else {
                    return setDoc(doc.ref, {
                        matches: matchIds,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                }
            });
            
            console.log(`Updated match list summary with ${matchIds.length} matches`);
        } catch (error) {
            console.error('Error updating match list summary:', error);
        }
    }
}

export default MatchSyncService;