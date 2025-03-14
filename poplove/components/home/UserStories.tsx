// components/home/UserStories.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Modal, 
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useAuthContext } from '../auth/AuthProvider';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  Timestamp, 
  addDoc, 
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { firestore, storage } from '../../lib/firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width } = Dimensions.get('window');

interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  isViewed?: boolean;
}

interface UserWithStories {
  userId: string;
  userName: string;
  userPhoto: string;
  stories: Story[];
  currentStoryIndex: number;
}

export default function UserStories() {
  const { user } = useAuthContext();
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const [videoStatus, setVideoStatus] = useState<{ isPlaying?: boolean }>({});
  const [videoDuration, setVideoDuration] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<{[key: string]: Story[]}>({});
  const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithStories | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isOwnStoryView, setIsOwnStoryView] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);
  
  // Animation for story progress
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const storyTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user]);

  // Reset progress when changing stories
  useEffect(() => {
    if (modalVisible && selectedUser) {
      // Reset the animation
      progressAnimation.setValue(0);
      
      // Start story timer
      startStoryTimer();
      
      return () => {
        if (storyTimeout.current) {
          clearTimeout(storyTimeout.current);
        }
      };
    }
  }, [modalVisible, selectedUser, currentStoryIndex]);

  const startStoryTimer = (currentDuration?: number) => {
    const currentStory = selectedUser?.stories[currentStoryIndex];
    
    const storyDuration = currentStory?.mediaType === 'image' 
      ? 5000 
      : Math.min(currentDuration || 60000, 60000);

      progressAnimation.setValue(0);
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: storyDuration,
        useNativeDriver: false,
        easing: Easing.linear
      }).start();
  
    // Safe, predictable timer setup
    if (storyTimeout.current) {
      clearTimeout(storyTimeout.current);
    }

  
    storyTimeout.current = setTimeout(goToNextStory, storyDuration);
  };

  const goToNextStory = () => {
    if (!selectedUser) return;
    
    if (currentStoryIndex < selectedUser.stories.length - 1) {
      // Go to next story of current user
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      // Find index of current user in users array
      const currentUserIndex = usersWithStories.findIndex(u => u.userId === selectedUser.userId);
      
      if (currentUserIndex < usersWithStories.length - 1) {
        // Go to next user's stories
        setSelectedUser(usersWithStories[currentUserIndex + 1]);
        setCurrentStoryIndex(0);
      } else {
        // End of all stories, close modal
        setModalVisible(false);
      }
    }
  };

  const goToPreviousStory = () => {
    if (!selectedUser) return;
    
    if (currentStoryIndex > 0) {
      // Go to previous story of current user
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      // Find index of current user in users array
      const currentUserIndex = usersWithStories.findIndex(u => u.userId === selectedUser.userId);
      
      if (currentUserIndex > 0) {
        // Go to previous user's stories
        const prevUser = usersWithStories[currentUserIndex - 1];
        setSelectedUser(prevUser);
        setCurrentStoryIndex(prevUser.stories.length - 1);
      } else {
        // Start of all stories, do nothing or loop to end
        // For now, do nothing
      }
    }
  };

  const handleOwnStoryPress = () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to view your stories');
      return;
    }
  
    const userOwnStories = userStories[user.uid] || [];
    
    if (userOwnStories.length === 0) {
      Alert.alert('No Stories', 'You have not uploaded any stories yet');
      return;
    }
  
    setSelectedUser({
      userId: user.uid,
      userName: user.displayName || 'You',
      userPhoto: user.photoURL || '',
      stories: userOwnStories,
      currentStoryIndex: 0
    });
    setIsOwnStoryView(true);
    setModalVisible(true);
    setShowStoryList(false);
  };  
  
// Update the deleteStory function in UserStories.tsx to prevent deleting from permanent storage

const deleteStory = async (storyId: string) => {
  if (!user) {
    Alert.alert('Error', 'Please log in to delete stories');
    return;
  }

  try {
    // Get the story data to access the mediaUrl
    const storyDoc = await getDoc(doc(firestore, 'stories', storyId));
    if (!storyDoc.exists()) {
      Alert.alert('Error', 'Story not found');
      return;
    }
    
    const storyData = storyDoc.data();
    const mediaUrl = storyData.mediaUrl;
    
    // Only delete the story entry from the stories collection
    // We intentionally do NOT delete the media URL or the entry in the media collection
    await deleteDoc(doc(firestore, 'stories', storyId));
    
    // Update UI immediately
    if (selectedUser) {
      const updatedStories = selectedUser.stories.filter(story => story.id !== storyId);
      
      if (updatedStories.length === 0) {
        setModalVisible(false);
      } else {
        setSelectedUser({
          ...selectedUser,
          stories: updatedStories
        });
        
        if (currentStoryIndex >= updatedStories.length) {
          setCurrentStoryIndex(updatedStories.length - 1);
        }
      }
    }
    
    // Refresh all stories data
    fetchStories();
    
    Alert.alert('Success', 'Story removed from story view, but the media is still available in your profile gallery');
  } catch (error) {
    console.error('Error deleting story:', error);
    Alert.alert('Error', 'Failed to delete story');
  }
};
  
  const fetchStories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First get user's matches
      const matchesRef = collection(firestore, 'matches');
      const matchesQuery = query(matchesRef, where('users', 'array-contains', user.uid));
      const matchesSnapshot = await getDocs(matchesQuery);
      
      // Extract active conversation users (who have replied)
      const activeUserIds = new Set<string>();
      
      // Process each match to check for replies
      for (const matchDoc of matchesSnapshot.docs) {
        const matchId = matchDoc.id;
        const matchData = matchDoc.data();
        
        // Find the other user ID
        const otherUserId = matchData.users.find((id: string) => id !== user.uid);
        if (!otherUserId) continue;
        
        // Check if there are messages from the other user
        const messagesRef = collection(firestore, 'matches', matchId, 'messages');
        const messagesQuery = query(
          messagesRef,
          where('senderId', '==', otherUserId),
          limit(1)
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        
        // If other user has sent at least one message, consider them active
        if (!messagesSnapshot.empty) {
          activeUserIds.add(otherUserId);
        }
      }
      
      // Now fetch stories, but only from active users
      const now = new Date();
      const storiesRef = collection(firestore, 'stories');
      const q = query(
        storiesRef,
        where('expiresAt', '>', now),
        orderBy('createdAt', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const storyData: Story[] = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Story[];
      
      // Filter stories to only show active users and current user
      const filteredStories = storyData.filter(story => 
        story.userId === user.uid || activeUserIds.has(story.userId)
      );
      
      // Group stories by userId
      const groupedStories: {[key: string]: Story[]} = {};
      filteredStories.forEach(story => {
        if (!groupedStories[story.userId]) {
          groupedStories[story.userId] = [];
        }
        groupedStories[story.userId].push(story);
      });
      
      // Format data for UI
      const formattedUsers = Object.keys(groupedStories).map(userId => {
        const userStoriesArray = groupedStories[userId];
        return {
          userId,
          userName: userStoriesArray[0].userName,
          userPhoto: userStoriesArray[0].userPhoto,
          stories: userStoriesArray,
          currentStoryIndex: 0
        };
      });
      
      setUserStories(groupedStories);
      setUsersWithStories(formattedUsers);
      setStories(filteredStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  // New function to save story to permanent media collection
  const saveStoryToMediaCollection = async (mediaUrl: string, mediaType: 'image' | 'video') => {
    if (!user) return;
    
    try {
      // Create new entry in the user's media collection
      // This ensures the media persists even after the story expires
      await addDoc(collection(firestore, 'users', user.uid, 'media'), {
        userId: user.uid,
        mediaUrl,
        mediaType,
        createdAt: serverTimestamp(),
        sourceType: 'story', // Mark that it originated from a story
        isPermanent: true // Flag to indicate this shouldn't be auto-deleted
      });
      
      console.log('Media saved to permanent collection');
    } catch (error) {
      console.error('Error saving media to permanent collection:', error);
      // Don't throw - we still want the story to be created even if permanent storage fails
    }
  };

  const addStory = async (mediaType: 'image' | 'video') => {
    if (!user) return;
    
    try {
      // Pick media from library
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: mediaType === 'image' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true, // Enable cropping/editing
        aspect: undefined, // Remove aspect ratio restriction to allow any height
        quality: 0.8,
      };
      
      if (mediaType === 'video') {
        options.videoMaxDuration = 60; // 1 minute max
      }
      
      const result = await ImagePicker.launchImageLibraryAsync(options);
      
      if (result.canceled) return;
      
      const mediaUri = result.assets[0].uri;
      setUploading(true);
      
      // Upload media to Firebase Storage
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      
      const ext = mediaUri.split('.').pop();
      const filename = `stories/${user.uid}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const mediaUrl = await getDownloadURL(storageRef);
      
      // Add story to Firestore
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      
      await addDoc(collection(firestore, 'stories'), {
        userId: user.uid,
        userName: user.displayName || 'User',
        userPhoto: user.photoURL || '',
        mediaUrl,
        mediaType,
        createdAt: serverTimestamp(),
        expiresAt,
        isViewed: false
      });

      await saveStoryToMediaCollection(mediaUrl, mediaType);
      
      // Refresh stories
      fetchStories();
      
      Alert.alert('Success', 'Your story has been added!');
    } catch (error) {
      console.error('Error adding story:', error);
      Alert.alert('Error', 'Failed to add your story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const viewUserStories = (userStoryData: UserWithStories) => {
    setSelectedUser(userStoryData);
    setCurrentStoryIndex(0);
    setIsOwnStoryView(userStoryData.userId === user?.uid);
    setModalVisible(true);
    setShowStoryList(false);
  };

  const toggleStoryList = () => {
    // If showing story list, pause the timer
    if (!showStoryList && storyTimeout.current) {
      clearTimeout(storyTimeout.current);
    } else if (showStoryList) {
      // If hiding story list, restart the timer
      startStoryTimer();
    }
    
    setShowStoryList(!showStoryList);
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.storiesScroll}
        contentContainerStyle={styles.storiesContent}
      >
        {/* Add Story Button for current user */}
        <TouchableOpacity 
          style={styles.storyItem}
          onPress={() => {
            Alert.alert(
              'Add Story',
              'Choose media type',
              [
                { text: 'Photo', onPress: () => addStory('image') },
                { text: 'Video', onPress: () => addStory('video') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <View style={styles.addStoryCircle}>
            <View style={styles.addStoryButton}>
              <Ionicons name="add" size={24} color="#FF6B6B" />
            </View>
          </View>
          <Text style={styles.storyUsername}>Add</Text>
        </TouchableOpacity>
        
        {/* Current User Stories */}
        {user && userStories[user.uid] && userStories[user.uid].length > 0 && (
          <TouchableOpacity 
            style={styles.storyItem}
            onPress={handleOwnStoryPress}
          >
            <View style={styles.storyCircleContainer}>
              <View style={styles.singleStoryBorder}>
                {user && userStories[user.uid] && userStories[user.uid].length > 1 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{userStories[user.uid].length}</Text>
                  </View>
                )}
              </View>
              <Image 
                source={{ uri: user.photoURL || 'https://via.placeholder.com/50' }} 
                style={styles.storyImage}
              />
            </View>
            <Text style={styles.storyUsername}>Your Story</Text>
          </TouchableOpacity>
        )}
        
        {/* List of other user stories */}
        {usersWithStories
          .filter(userWithStory => userWithStory.userId !== user?.uid)
          .map((userWithStory) => (
            <TouchableOpacity 
              key={userWithStory.userId} 
              style={styles.storyItem}
              onPress={() => viewUserStories(userWithStory)}
            >
              <View style={styles.storyCircleContainer}>
                <View style={styles.singleStoryBorder}>
                  {userWithStory.stories.length > 1 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{userWithStory.stories.length}</Text>
                    </View>
                  )}
                </View>
                <Image 
                  source={{ uri: userWithStory.userPhoto || 'https://via.placeholder.com/50' }} 
                  style={styles.storyImage}
                />
              </View>
              <Text style={styles.storyUsername} numberOfLines={1}>
                {userWithStory.userName}
              </Text>
            </TouchableOpacity>
          ))}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FF6B6B" />
          </View>
        )}
      </ScrollView>
      
      {/* Story Viewing Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedUser && selectedUser.stories.length > 0 && (
          <View style={styles.modalContainer}>
            {isOwnStoryView && (
              <View style={styles.storyActionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    const currentStoryId = selectedUser.stories[currentStoryIndex].id;
                    if (currentStoryId) {
                      Alert.alert(
                        'Delete Story',
                        'Are you sure you want to delete this story?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => deleteStory(currentStoryId)
                          }
                        ]
                      );
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={toggleStoryList}
                >
                  <Ionicons name="list-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}
            
            {/* Progress bar at top */}
            <View style={styles.progressContainer}>
              {selectedUser.stories.map((_, index) => (
                <View key={index} style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, 
                    index < currentStoryIndex ? styles.progressBarCompleted : 
                    index === currentStoryIndex ? {} : styles.progressBarInactive
                  ]}>
                    {index === currentStoryIndex && (
                      <Animated.View 
                        style={[
                          styles.progressBarActive, 
                          {
                            width: progressAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%']
                            })
                          }
                        ]} 
                      />
                    )}
                  </View>
                </View>
              ))}
            </View>
            
            {/* Header with user info */}
            <View style={styles.storyHeader}>
              <View style={styles.storyHeaderInfo}>
                <Image 
                  source={{ uri: selectedUser.userPhoto || 'https://via.placeholder.com/50' }} 
                  style={styles.storyUserImage}
                />
                <Text style={styles.storyUserName}>{selectedUser.userName}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setModalVisible(false);
                  setShowStoryList(false);
                }}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Main content */}
            <View style={styles.storyContent}>
              {selectedUser.stories[currentStoryIndex]?.mediaType === 'image' ? (
                <Image 
                  source={{ uri: selectedUser.stories[currentStoryIndex]?.mediaUrl }} 
                  style={styles.mediaContent}
                  resizeMode="contain"
                />
              ) : (
                  <Video
                    ref={videoRef}
                    source={{ uri: selectedUser.stories[currentStoryIndex]?.mediaUrl || '' }}
                    style={styles.mediaContent}
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    shouldPlay={true}
                    onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                      if (status.isLoaded) {
                        // Only start timer and animation when video is first playing
                        if (status.isPlaying && !videoStatus.isPlaying) {
                          // Calculate duration, cap at 60 seconds
                          const maxDuration = 60000;
                          const videoDuration = Math.min(status.durationMillis || maxDuration, maxDuration);
                    
                          // Reset and start progress animation
                          progressAnimation.setValue(0);
                          Animated.timing(progressAnimation, {
                            toValue: 1,
                            duration: videoDuration,
                            useNativeDriver: false,
                            easing: Easing.linear
                          }).start();
                    
                          // Clear previous timeout
                          if (storyTimeout.current) {
                            clearTimeout(storyTimeout.current);
                          }
                    
                          // Set new timeout to advance story
                          storyTimeout.current = setTimeout(goToNextStory, videoDuration);
                        }
                    
                        // Auto-advance when video completes
                        if (status.didJustFinish) {
                          goToNextStory();
                        }
                    
                        // Update video status
                        setVideoStatus(status);
                      }
                    }}
                  />
                )}
            </View>
            
            {/* Story list overlay */}
            {showStoryList && (
              <View style={styles.storyListContainer}>
                <Text style={styles.storyListTitle}>Your Stories</Text>
                <FlatList
                  data={selectedUser.stories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[
                        styles.storyListItem,
                        index === currentStoryIndex && styles.storyListItemActive
                      ]}
                      onPress={() => {
                        setCurrentStoryIndex(index);
                        setShowStoryList(false);
                        startStoryTimer();
                      }}
                    >
                      <Image 
                        source={{ uri: item.mediaUrl }} 
                        style={styles.storyListThumbnail}
                      />
                      <View style={styles.storyListInfo}>
                        <Text style={styles.storyListType}>
                          {item.mediaType === 'image' ? 'Photo' : 'Video'}
                        </Text>
                        <Text style={styles.storyListTime}>
                          {item.createdAt?.toDate() 
                            ? new Date(item.createdAt.toDate()).toLocaleTimeString() 
                            : 'Recently'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.storyListDeleteButton}
                        onPress={() => {
                          Alert.alert(
                            'Delete Story',
                            'Are you sure you want to delete this story?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { 
                                text: 'Delete', 
                                style: 'destructive',
                                onPress: () => deleteStory(item.id)
                              }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="white" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                  style={styles.storyList}
                />
                <TouchableOpacity
                  style={styles.closeListButton}
                  onPress={toggleStoryList}
                >
                  <Text style={styles.closeListText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Touch areas for navigation */}
            {!showStoryList && (
              <View style={styles.storyNavigation}>
                <TouchableOpacity 
                  style={styles.prevStoryArea}
                  onPress={goToPreviousStory}
                />
                <TouchableOpacity 
                  style={styles.nextStoryArea}
                  onPress={goToNextStory}
                />
              </View>
            )}
          </View>
        )}
      </Modal>
      
      {/* Upload Progress Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.uploadingText}>Uploading your story...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F5',
    position: 'relative',
    paddingVertical: 10,
  },
  storiesScroll: {
    backgroundColor: '#FFF5F5',
  },
  storiesContent: {
    paddingHorizontal: 10,
  },
  loadingContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 70,
  },
  storyCircleContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyArc: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  storyArcSegment: {
    position: 'absolute',
    width: 70,
    height: 70
  },
  singleStoryBorder: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  countBadge: {
    position: 'absolute',
    top: -2,
    right: -5,
    backgroundColor: '#FF6B6B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  countText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  storyImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  addStoryCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dotted',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addStoryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  storyUsername: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    maxWidth: 70,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  storyActionButtons: {
    position: 'absolute',
    top: 40,
    right: 60,
    flexDirection: 'row',
    zIndex: 20,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButton: {
    padding: 8,
  },
  mediaContent: {
    width: '100%',
    height: '100%',
  },
  storyHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    zIndex: 10,
  },
  storyHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyUserImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'white',
  },
  storyUserName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  uploadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  progressContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 10,
    zIndex: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 1,
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 1,
  },
  progressBarCompleted: {
    backgroundColor: 'white',
  },
  progressBarInactive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  prevStoryArea: {
    width: '30%',
    height: '100%',
  },
  nextStoryArea: {
    width: '70%',
    height: '100%',
  },
  storyListContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 30,
    padding: 20,
  },
  storyListTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 40,
  },
  storyList: {
    flex: 1,
  },
  storyListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  storyListItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  storyListThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 15,
  },
  storyListInfo: {
    flex: 1,
  },
  storyListType: {
    color: 'white',
    fontSize: 16,
    marginBottom: 4,
  },
  storyListTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  storyListDeleteButton: {
    padding: 8,
  },
  closeListButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  closeListText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});