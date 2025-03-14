// components/profile/ProfileMediaGallery.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Video } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 60) / 2;

export default function ProfileMediaGallery({ userId, profilePhoto }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoUrl, setActiveVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (userId) {
      loadMedia(userId);
    }
  }, [userId]);

  const generateThumbnail = async (videoUri) => {
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

  const loadMedia = async (userId) => {
    try {
      setLoading(true);
      let allMedia = [];
      
      // If there's a profile photo, add it first
      if (profilePhoto) {
        allMedia.push({
          id: 'profile-photo',
          mediaUrl: profilePhoto,
          mediaType: 'image',
          sourceType: 'profile'
        });
      }
      
      // Try to get media from user's media collection
      try {
        const mediaRef = collection(firestore, 'users', userId, 'media');
        const mediaSnap = await getDocs(mediaRef);
        
        if (!mediaSnap.empty) {
          const mediaItems = mediaSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Generate thumbnails for video items
          for (let item of mediaItems) {
            if (item.mediaType === 'video' && !item.thumbnailUrl) {
              item.thumbnailUrl = await generateThumbnail(item.mediaUrl);
            }
          }
          
          allMedia = [...allMedia, ...mediaItems];
          console.log(`Found ${mediaItems.length} media items in collection`);
        }
      } catch (err) {
        console.log('No media collection for user');
      }
      
      // Try to get from stories
      try {
        const now = new Date();
        const storiesRef = collection(firestore, 'stories');
        const storiesQuery = query(
          storiesRef,
          where('userId', '==', userId),
          where('expiresAt', '>', now),
          limit(10)
        );
        
        const storiesSnap = await getDocs(storiesQuery);
        if (!storiesSnap.empty) {
          const storyMedia = storiesSnap.docs.map(doc => ({
            id: doc.id,
            mediaUrl: doc.data().mediaUrl,
            mediaType: doc.data().mediaType,
            sourceType: 'story',
            thumbnailUrl: doc.data().thumbnailUrl
          }));
          
          // Generate thumbnails for video items that don't have them
          for (let item of storyMedia) {
            if (item.mediaType === 'video' && !item.thumbnailUrl) {
              item.thumbnailUrl = await generateThumbnail(item.mediaUrl);
            }
          }
          
          console.log(`Found ${storyMedia.length} media items in stories`);
          allMedia = [...allMedia, ...storyMedia];
        }
      } catch (err) {
        console.log('Error loading stories:', err);
      }
      
      // Remove duplicates by mediaUrl
      const uniqueMedia = [];
      const urls = new Set();
      
      allMedia.forEach(item => {
        if (!urls.has(item.mediaUrl)) {
          urls.add(item.mediaUrl);
          uniqueMedia.push(item);
        }
      });
      
      setMedia(uniqueMedia);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoPress = async (url) => {
    if (activeVideoUrl === url) {
      // Toggle play/pause for the current video
      if (videoRef.current) {
        const status = await videoRef.current.getStatusAsync();
        if (status.isPlaying) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      }
    } else {
      // Switch to a new video
      setActiveVideoUrl(url);
      setIsPlaying(true);
    }
  };
  
  // Reset video after 30 seconds
  const resetVideoAfterTimeout = async (status) => {
    if (status.positionMillis > 30000) {
      if (videoRef.current) {
        await videoRef.current.stopAsync();
        await videoRef.current.setPositionAsync(0);
        await videoRef.current.playAsync();
      }
    }
  };

  // If there's no media and no profile photo, show nothing
  if (media.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No media available</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FF6B6B" size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.galleryGrid}>
        {media.map((item, index) => (
          <TouchableOpacity 
            key={item.id || `media-${index}`}
            style={styles.galleryItem}
            onPress={() => item.mediaType === 'video' ? handleVideoPress(item.mediaUrl) : null}
          >
            {item.mediaType === 'video' ? (
              <View style={styles.videoContainer}>
                {activeVideoUrl === item.mediaUrl ? (
                  <>
                    <Video 
                      ref={videoRef}
                      source={{ uri: item.mediaUrl }} 
                      style={styles.media}
                      useNativeControls={false}
                      resizeMode="cover"
                      isLooping={false}
                      shouldPlay
                      onPlaybackStatusUpdate={status => {
                        if (status.isLoaded) {
                          setIsPlaying(status.isPlaying);
                          resetVideoAfterTimeout(status);
                          
                          // When video reaches the end, reset to beginning
                          if (status.didJustFinish) {
                            videoRef.current.setPositionAsync(0);
                            setIsPlaying(false);
                          }
                        }
                      }}
                      posterSource={{ uri: item.thumbnailUrl || item.mediaUrl }}
                      usePoster={true}
                      posterStyle={styles.poster}
                    />
                    <TouchableOpacity 
                      style={styles.playPauseButton}
                      onPress={() => handleVideoPress(item.mediaUrl)}
                    >
                      <Ionicons 
                        name={isPlaying ? "pause" : "play"} 
                        size={24} 
                        color="#fff" 
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.videoWrapper}>
                    <Image 
                      source={{ uri: item.thumbnailUrl || item.mediaUrl }} 
                      style={styles.media}
                    />
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={24} color="#fff" />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <Image 
                source={{ uri: item.mediaUrl }} 
                style={styles.media}
                resizeMode="cover"
              />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  galleryItem: {
    width: ITEM_WIDTH,
    height: 150,
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 50,
    height: 50,
    marginLeft: -25,
    marginTop: -25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  }
});