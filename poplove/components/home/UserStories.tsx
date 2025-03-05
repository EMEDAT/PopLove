// components/home/UserStories.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Alert,
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useAuthContext } from '../auth/AuthProvider';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore, storage } from '../../lib/firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export default function UserStories() {
  const { user } = useAuthContext();
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchStories();
  }, [user]);

  const fetchStories = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const now = new Date();
      const storiesRef = collection(firestore, 'stories');
      const q = query(
        storiesRef,
        where('expiresAt', '>', now),
        orderBy('expiresAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const storyData: Story[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      
      setStories(storyData);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStory = async (mediaType: 'image' | 'video') => {
    if (!user) return;
    
    try {
      // Pick media from library
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'image' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        videoMaxDuration: 60, // 1 minute max
      });
      
      if (result.canceled) return;
      
      const mediaUri = result.assets[0].uri;
      
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
      });
      
      // Refresh stories
      fetchStories();
    } catch (error) {
      console.error('Error adding story:', error);
    }
  };

  const viewStory = (story: Story) => {
    setSelectedStory(story);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesScroll}>
        {/* Add Story Button */}
        <TouchableOpacity 
          style={styles.addStoryContainer}
          onPress={() => {
            // Show options for image or video
            Alert.alert(
              'Add Story',
              'Choose media type',
              [
                { text: 'Image', onPress: () => addStory('image') },
                { text: 'Video', onPress: () => addStory('video') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <View style={styles.addStoryButton}>
            <Ionicons name="add" size={30} color="#FF6B6B" />
          </View>
          <Text style={styles.addStoryText}>Add Story</Text>
        </TouchableOpacity>
        
        {/* Stories */}
        {stories.map(story => (
          <TouchableOpacity 
            key={story.id} 
            style={styles.storyContainer}
            onPress={() => viewStory(story)}
          >
            <View style={styles.storyImageContainer}>
              <Image 
                source={{ uri: story.userPhoto || 'https://via.placeholder.com/150' }} 
                style={styles.storyImage} 
              />
            </View>
            <Text style={styles.storyUsername} numberOfLines={1}>
              {story.userName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Story Viewing Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          
          {selectedStory?.mediaType === 'image' ? (
            <Image 
              source={{ uri: selectedStory.mediaUrl }} 
              style={styles.mediaContent}
              resizeMode="contain"
            />
          ) : (
            <Video
            source={{ uri: selectedStory?.mediaUrl || '' }}
            style={styles.mediaContent}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            shouldPlay
            />
          )}
          
          <View style={styles.storyInfo}>
            <Image 
              source={{ uri: selectedStory?.userPhoto || 'https://via.placeholder.com/150' }} 
              style={styles.storyUserImage}
            />
            <Text style={styles.storyUserName}>{selectedStory?.userName}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  storiesScroll: {
    paddingHorizontal: 15,
  },
  addStoryContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  addStoryButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
  },
  addStoryText: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
  },
  storyContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    padding: 3,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
  },
  storyUsername: {
    marginTop: 5,
    fontSize: 12,
    color: '#333',
    maxWidth: 70,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
  mediaContent: {
    width: '100%',
    height: '80%',
  },
  storyInfo: {
    position: 'absolute',
    top: 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyUserImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  storyUserName: {
    color: '#fff',
    fontWeight: '600',
  },
});