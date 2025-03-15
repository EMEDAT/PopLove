// components/profile/UserMediaGallery.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useAuthContext } from '../auth/AuthProvider';
import {
  collection,
  query,
  getDocs,
  orderBy,
  where,
  doc,
  deleteDoc,
  getDoc, 
  Timestamp,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { 
  ref, 
  deleteObject
} from 'firebase/storage';
import { firestore, storage } from '../../lib/firebase';  // Correct import of storage
import * as VideoThumbnails from 'expo-video-thumbnails';
import { updateAuthProfile } from '../../utils/profileAuthSync';
import MatchSyncService from '../../services/matchSyncService';

const { width } = Dimensions.get('window');
const MEDIA_WIDTH = (width - 40) / 3;

interface MediaItem {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: any;
  sourceType: 'story' | 'profile' | 'media';
  thumbnailUrl?: string;
  wasProfilePhoto?: boolean;
  description?: string;
}

interface UserMediaGalleryProps {
  userId: string;
  isCurrentUser?: boolean;
  profilePhoto?: string | null;
}

export default function UserMediaGallery({ userId, isCurrentUser = false, profilePhoto = null }: UserMediaGalleryProps) {
  const { user } = useAuthContext();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserMedia();
    }
  }, [userId, activeTab, profilePhoto]);

  const generateThumbnail = async (videoUri: string): Promise<string> => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(
        videoUri,
        {
          time: 3000, // Get frame at 3 seconds (3000ms)
          quality: 0.5,
        }
      );
      return uri;
    } catch (e) {
      console.warn("Couldn't generate thumbnail", e);
      return videoUri; // Fallback to the video URL
    }
  };

  const fetchUserMedia = async () => {
    setLoading(true);
    try {
      // 1. Fetch from dedicated media collection
      const mediaRef = collection(firestore, 'users', userId, 'media');
      const q = query(
        mediaRef,
        where('mediaType', '==', activeTab === 'images' ? 'image' : 'video'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      let media = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as MediaItem[];

      for (let item of media) {
        if (item.mediaType === 'video' && !item.thumbnailUrl) {
          item.thumbnailUrl = await generateThumbnail(item.mediaUrl);
        }
      }
      
      // 2. Fetch profile photos
      if (activeTab === 'images') {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists() && userDoc.data().photoURL) {
          const userPhotoURL = userDoc.data().photoURL;
          
          // Check if profile photo is already in the list
          const profilePhotoExists = media.some(item => 
            item.mediaUrl === userPhotoURL && item.sourceType === 'profile'
          );
          
          if (!profilePhotoExists) {
            media.push({
              id: 'profile-photo',
              userId: userId,
              mediaUrl: userPhotoURL,
              mediaType: 'image',
              createdAt: userDoc.data().updatedAt || new Timestamp(Date.now() / 1000, 0),
              sourceType: 'profile'
            } as MediaItem);
          }
          
          // Add previous profile photos (marked as wasProfilePhoto)
          const previousProfilesQuery = query(
            mediaRef,
            where('wasProfilePhoto', '==', true),
            where('mediaType', '==', 'image'),
            orderBy('createdAt', 'desc')
          );
          
          const previousProfilesSnapshot = await getDocs(previousProfilesQuery);
          const previousProfiles = previousProfilesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as MediaItem[];
          
          // Add previous profiles to the media array if they're not already included
          for (const prevProfile of previousProfiles) {
            if (!media.some(item => item.mediaUrl === prevProfile.mediaUrl)) {
              media.push(prevProfile);
            }
          }
        }
      }
      
      // 3. Fetch stories by this user that haven't expired
      const now = new Date();
      const storiesRef = collection(firestore, 'stories');
      const storiesQuery = query(
        storiesRef,
        where('userId', '==', userId),
        where('mediaType', '==', activeTab === 'images' ? 'image' : 'video'),
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'desc')
      );
      
      const storiesSnapshot = await getDocs(storiesQuery);
      const storiesMedia = storiesSnapshot.docs.map(doc => ({
        id: doc.id,
        userId: userId,
        mediaUrl: doc.data().mediaUrl,
        mediaType: doc.data().mediaType,
        createdAt: doc.data().createdAt,
        sourceType: 'story',
        thumbnailUrl: doc.data().thumbnailUrl || null
      })) as MediaItem[];

      for (let item of storiesMedia) {
        if (item.mediaType === 'video' && !item.thumbnailUrl) {
          item.thumbnailUrl = await generateThumbnail(item.mediaUrl);
        }
      }
      
      // 4. Filter out duplicate media URLs
      const mediaUrls = new Set();
      const uniqueMedia = [...media, ...storiesMedia].filter(item => {
        if (mediaUrls.has(item.mediaUrl)) {
          return false;
        }
        mediaUrls.add(item.mediaUrl);
        return true;
      });
      
      // 5. Sort by creation date (newest first)
      uniqueMedia.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date();
        const dateB = b.createdAt?.toDate?.() || new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
      setMediaItems(uniqueMedia);
      setLoading(false);
      
      // Then generate missing thumbnails asynchronously
      setTimeout(() => {
        const updateThumbnails = async () => {
          const updatedMedia = [...uniqueMedia];
          let hasUpdates = false;
          
          for (let i = 0; i < updatedMedia.length; i++) {
            const item = updatedMedia[i];
            if (item.mediaType === 'video' && !item.thumbnailUrl) {
              try {
                item.thumbnailUrl = await generateThumbnail(item.mediaUrl);
                hasUpdates = true;
              } catch (e) {
                console.warn("Thumbnail generation failed", e);
              }
            }
          }
          
          if (hasUpdates) {
            setMediaItems([...updatedMedia]);
          }
        };
      
        updateThumbnails();
      }, 100);
    } catch (error) {
      console.error('Error fetching user media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!isCurrentUser || !user) return;
    
    // Don't allow deleting the current profile photo
    const mediaItem = mediaItems.find(item => item.id === mediaId);
    if (mediaItem?.sourceType === 'profile') {
      Alert.alert('Cannot Delete', 'You cannot delete your current profile photo.');
      return;
    }
    
    try {
      // First get the media URL before deleting the document
      const mediaDoc = await getDoc(doc(firestore, 'users', userId, 'media', mediaId));
      const mediaUrl = mediaDoc.data()?.mediaUrl;
      
      // Delete from Firestore
      await deleteDoc(doc(firestore, 'users', userId, 'media', mediaId));
      
      // Delete from Firebase Storage if URL exists
      if (mediaUrl) {
        // Extract the path from the URL
        const storageRef = ref(storage, mediaUrl);
        await deleteObject(storageRef);
      }
      
      // Update local state
      setMediaItems(mediaItems.filter(item => item.id !== mediaId));
      setModalVisible(false);
      
      Alert.alert('Success', 'Media deleted successfully');
    } catch (error) {
      console.error('Error deleting media:', error);
      Alert.alert('Error', 'Failed to delete media item');
    }
  };

  const handleSetAsProfilePhoto = async (mediaItem: MediaItem) => {
    if (!isCurrentUser || !user) return;
    
    // Skip if it's already the profile photo
    if (mediaItem.sourceType === 'profile') {
      setModalVisible(false);
      return;
    }
    
    Alert.alert(
      'Set as Profile Photo',
      'Do you want to set this as your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set as Profile', 
          onPress: async () => {
            try {
              setUpdating(true);
              
              // 1. Get current profile photo URL
              const userDoc = await getDoc(doc(firestore, 'users', user.uid));
              const currentPhotoURL = userDoc.exists() ? userDoc.data().photoURL : null;
              
              // 2. Update user document with new photo URL
              await updateDoc(doc(firestore, 'users', user.uid), {
                photoURL: mediaItem.mediaUrl,
                updatedAt: serverTimestamp()
              });
              
              // 3. Update in Firebase Auth
              await updateAuthProfile(null, mediaItem.mediaUrl);
              
              // 4. Archive the old photo if it exists
              if (currentPhotoURL && currentPhotoURL !== mediaItem.mediaUrl) {
                // Check if the old photo is already in media collection
                const mediaRef = collection(firestore, 'users', user.uid, 'media');
                const existingQuery = query(mediaRef, where('mediaUrl', '==', currentPhotoURL));
                const existingDocs = await getDocs(existingQuery);
                
                if (existingDocs.empty) {
                  // Add to media collection as an archived profile photo
                  await addDoc(mediaRef, {
                    mediaUrl: currentPhotoURL,
                    mediaType: 'image',
                    createdAt: serverTimestamp(),
                    sourceType: 'media',
                    wasProfilePhoto: true,
                    description: 'Previous profile photo'
                  });
                } else {
                  // Update the existing document to mark it as a previous profile photo
                  await updateDoc(existingDocs.docs[0].ref, {
                    wasProfilePhoto: true,
                    updatedAt: serverTimestamp()
                  });
                }
              }
              
              // 5. Update the photo URL in all matches
              await MatchSyncService.updateProfilePhoto(user.uid, mediaItem.mediaUrl);
              
              // 6. Reload the media to reflect changes
              await fetchUserMedia();
              
              setModalVisible(false);
              
              Alert.alert('Success', 'Profile photo updated successfully');
            } catch (error) {
              console.error('Error setting profile photo:', error);
              Alert.alert('Error', 'Failed to update profile photo');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const renderMediaGrid = () => {
    if (loading) {
      return <ActivityIndicator style={styles.loader} size="large" color="#FF6B6B" />;
    }
    
    if (mediaItems.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons 
            name={activeTab === 'images' ? 'images-outline' : 'videocam-outline'} 
            size={50} 
            color="#ccc"
          />
          <Text style={styles.emptyText}>
            No {activeTab} available
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.mediaGrid}>
        {mediaItems.map((item) => (
          <TouchableOpacity 
            key={item.id}
            style={styles.mediaItem}
            onPress={() => {
              setSelectedMedia(item);
              setModalVisible(true);
            }}
            onLongPress={() => {
              if (isCurrentUser && item.sourceType !== 'profile') {
                Alert.alert(
                  'Delete Media',
                  'Are you sure you want to delete this item?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete', 
                      style: 'destructive',
                      onPress: () => handleDeleteMedia(item.id)
                    }
                  ]
                );
              }
            }}
            delayLongPress={500}
          >
            <Image 
              source={{ uri: item.thumbnailUrl || item.mediaUrl }} 
              style={styles.mediaThumbnail}
            />
            {item.mediaType === 'video' && (
              <View style={styles.videoIndicator}>
                <Ionicons name="play" size={20} color="white" />
              </View>
            )}
            {item.sourceType === 'story' && item.mediaType === 'video' && !item.thumbnailUrl && (
              <View style={styles.missingThumbnailOverlay}>
                <Text style={styles.videoLabel}>Video</Text>
              </View>
            )}
            {item.sourceType === 'profile' && (
              <View style={styles.profileIndicator}>
                <Ionicons name="person" size={14} color="white" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'images' && styles.activeTab]}
          onPress={() => setActiveTab('images')}
        >
          <Text style={[styles.tabText, activeTab === 'images' && styles.activeTabText]}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
          onPress={() => setActiveTab('videos')}
        >
          <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>Videos</Text>
        </TouchableOpacity>
      </View>
      
      {renderMediaGrid()}
      
      {/* Media Viewer Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            
            {isCurrentUser && selectedMedia && (
              <View style={styles.modalActions}>
                {selectedMedia.mediaType === 'image' && (
                  <TouchableOpacity 
                    onPress={() => selectedMedia && handleSetAsProfilePhoto(selectedMedia)}
                    style={[styles.actionButton, selectedMedia.sourceType === 'profile' && styles.disabledButton]}
                    disabled={selectedMedia.sourceType === 'profile' || updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="person-circle" size={24} color="white" />
                        <Text style={styles.actionText}>
                          {selectedMedia.sourceType === 'profile' ? 'Current Profile' : 'Set as Profile'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                
                {selectedMedia.sourceType !== 'profile' && (
                  <TouchableOpacity 
                    onPress={() => selectedMedia && handleDeleteMedia(selectedMedia.id)}
                    style={styles.deleteButton}
                    disabled={updating}
                  >
                    <Ionicons name="trash" size={24} color="white" />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          
          {selectedMedia?.mediaType === 'image' ? (
            <Image 
              source={{ uri: selectedMedia.mediaUrl }} 
              style={styles.modalMedia}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: selectedMedia?.mediaUrl || '' }}
              style={styles.modalMedia}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping
              shouldPlay
            />
          )}
          
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              {selectedMedia?.createdAt?.toDate()?.toLocaleDateString() || ''} 
              {selectedMedia?.sourceType === 'profile' && ' • Current Profile Photo'}
              {selectedMedia?.wasProfilePhoto && ' • Previous Profile Photo'}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  missingThumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLabel: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
    fontWeight: '500',
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  mediaItem: {
    width: MEDIA_WIDTH,
    height: MEDIA_WIDTH,
    marginBottom: 5,
    marginRight: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mediaThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIndicator: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  closeButton: {
    padding: 5,
  },
  modalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: 15,
  },
  deleteButton: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  modalMedia: {
    width: '100%',
    height: '80%',
  },
  dateContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dateText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
});