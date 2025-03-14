// components/live-love/LineUpScreens/MatchSelectionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { MatchData } from './types';
import { doc, setDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import { useAuthContext } from '../../auth/AuthProvider';
import { router } from 'expo-router';

const firestore = getFirestore();
const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const ITEM_HORIZONTAL_SPACING = width * 0.07;

export default function MatchSelectionScreen() {
  const { 
    selectedMatches, 
    setSelectedMatches, // Add this
    confirmMatch, 
    goBack, 
    loading, 
    setStep
  } = useLineUp();
  const { user } = useAuthContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [selectionInProgress, setSelectionInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Navigate to previous match with center alignment
  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ 
        index: newIndex, 
        animated: true,
        viewPosition: 0.1 // Centers the item
      });
    }
  };

  // Navigate to next match with center alignment
  const goToNext = () => {
    if (currentIndex < selectedMatches.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ 
        index: newIndex, 
        animated: true,
        viewPosition: 0.1 // Centers the item
      });
    }
  };

  // Handle Find Love action
  const handleFindLove = async () => {
    if (selectionInProgress || !selectedMatches[currentIndex]) return;
    
    setSelectionInProgress(true);
    setIsLoading(true);
    
    try {
      const currentMatch = selectedMatches[currentIndex];
      
      // Create mutual like if needed
      if (!currentMatch.isMutualMatch) {
        await setDoc(doc(firestore, 'likes', `${user?.uid}_${currentMatch.userId}`), {
          fromUserId: user?.uid,
          toUserId: currentMatch.userId,
          createdAt: serverTimestamp(),
          status: 'pending',
          source: 'lineup'
        });
      }
      
      // Get or create chat
      const chatId = await confirmMatch(currentMatch);
      
      if (chatId) {
        // Navigate to chat screen
        router.push({
          pathname: '/chat/[id]',
          params: { id: chatId }
        });
        
        // Important: Reset to selection screen after a delay
        setTimeout(() => {
          setStep('selection');
        }, 300);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to connect with this match');
    } finally {
      setIsLoading(false);
      setSelectionInProgress(false);
    }
  };

  // Handle Pop Balloon (reject match)
// Update handlePopBalloon function for proper match removal and UI update

const handlePopBalloon = () => {
  if (!selectedMatches[currentIndex]) return;
  
  // Store match data before removal for reference
  const matchToRemove = selectedMatches[currentIndex];
  
  // Create a new array without the current match
  const newMatches = selectedMatches.filter((_, index) => index !== currentIndex);
  
  // Update the LineUp context with the filtered matches
  setSelectedMatches(newMatches);
  
  // Handle navigation or empty state
  if (newMatches.length === 0) {
    // No more matches, go back
    goBack();
  } else {
    // Adjust current index if needed
    const newIndex = currentIndex >= newMatches.length ? newMatches.length - 1 : currentIndex;
    setCurrentIndex(newIndex);
    
    // Scroll to the new position
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
        viewPosition: 0.5
      });
    }, 100);
  }
};

  // Get item layout for better scrolling performance
  const getItemLayout = (data: any, index: number) => ({
    length: CARD_WIDTH,
    offset: (CARD_WIDTH + ITEM_HORIZONTAL_SPACING) * index,
    index,
  });

  // Render a single match card
  const renderMatch = ({ item, index }: { item: MatchData, index: number }) => {
    return (
      <View style={[styles.matchCard, { width: CARD_WIDTH }]}>
        <Image 
          source={{ uri: item.photoURL }} 
          style={styles.matchImage} 
          resizeMode="cover"
        />
        
        {/* Match percentage badge */}
        <View style={styles.matchPercentageBadge}>
          <Text style={styles.matchPercentageText}>
            {item.matchPercentage}% match
          </Text>
        </View>
        
        {/* Name overlay */}
        <View style={styles.nameOverlay}>
          <Text style={styles.matchName}>{item.displayName}</Text>
        </View>
      </View>
    );
  };

  // Handle scroll events to update current index
  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / (CARD_WIDTH + ITEM_HORIZONTAL_SPACING));
    setCurrentIndex(index);
  };

  // Effect to initialize with centered first item
  useEffect(() => {
    if (selectedMatches.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: 0,
          animated: false,
          viewPosition: 0.5
        });
      }, 100);
    }
  }, [selectedMatches]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <View style={styles.iconCircle}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Matches</Text>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.subtitle}>
          Multiple Matches found: {selectedMatches.length}
        </Text>
        
        {selectedMatches.length > 0 ? (
          <>
            <FlatList
              ref={flatListRef}
              data={selectedMatches}
              renderItem={renderMatch}
              keyExtractor={(item) => item.userId}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + ITEM_HORIZONTAL_SPACING}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.flatListContent}
              onMomentumScrollEnd={handleScroll}
              getItemLayout={getItemLayout}
              initialScrollIndex={0}
              ItemSeparatorComponent={() => <View style={{ width: ITEM_HORIZONTAL_SPACING }} />}
              contentInset={{ left: ITEM_HORIZONTAL_SPACING/2, right: ITEM_HORIZONTAL_SPACING/2 }}
              contentOffset={{ x: 0, y: 0 }}
              contentInsetAdjustmentBehavior="automatic"
            />
            
            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={[styles.navButton, currentIndex === 0 && styles.disabledNavButton]}
                onPress={goToPrevious}
                disabled={currentIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color="#000" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navButton, currentIndex === selectedMatches.length - 1 && styles.disabledNavButton]}
                onPress={goToNext}
                disabled={currentIndex === selectedMatches.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.popButton}
                onPress={handlePopBalloon}
                disabled={loading || isLoading}
              >
                <Image 
                  source={require('../../../assets/images/main/LoveError.png')} 
                  style={styles.actionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.actionText}>Pop Balloon</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.loveButton}
                onPress={handleFindLove}
                disabled={loading || isLoading}
              >
                <Image 
                  source={require('../../../assets/images/main/LoveSuccess.png')} 
                  style={styles.actionIcon}
                  resizeMode="contain"
                />
                <Text style={styles.actionText}>Find Love</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-dislike" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No matches found</Text>
          </View>
        )}
      </View>
      
      {/* Loading overlay */}
      {(loading || isLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 53,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 45,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#344054',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 30,
    marginBottom: -20,
  },
  flatListContent: {
    paddingHorizontal: ITEM_HORIZONTAL_SPACING/2,
    paddingBottom: 20,
    alignItems: 'center',
  },
  matchCard: {
    height: height * 0.5,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  matchImage: {
    width: '100%',
    height: '100%',
  },
  matchPercentageBadge: {
    position: 'absolute',
    top: -5,
    right: 80,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  matchPercentageText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 14,
  },
  matchName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: '75%',
    left: 43.5,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    width: '85%'
  },
  popButton: {
    alignItems: 'center',
  },
  loveButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 30,
    height: 30,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});