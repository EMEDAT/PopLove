// components/live-love/LineUpScreens/LineUpScreen.tsx

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import LiveChatComponent from './LiveChatComponent';
import { getDoc, doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../../lib/firebase';
import { Contestant } from './types';
import { useAuthContext } from '../../auth/AuthProvider';
import * as LineupService from '../../../services/lineupService';
import { PrivateProfileDetailsModal } from '../../../components/shared/PrivateProfileDetailsModal';

// Logging helper
const logLineUp = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [LineUpScreen] 🔍 ${message}`, data ? data : '');
};

const { width, height } = Dimensions.get('window');

export default function LineUpScreen() {
  const { 
    upcomingSpotlights: contextUpcomingContestants, 
    currentSpotlight,
    handleAction, 
    goBack, 
    loading,
    sessionId,
    spotlightTimeLeft: contestantTimeLeft,
    refreshSpotlights: refreshContestants
  } = useLineUp();
  
  const { user } = useAuthContext();
  const [showChat, setShowChat] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [orderedContestants, setOrderedContestants] = useState<Contestant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const loadingRef = useRef(false);
  const actionInProgressRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState<number>(4 * 60 * 60); // 4 hours in seconds
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [interactedContestants, setInteractedContestants] = useState<Set<string>>(new Set());
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const regularRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const forcedRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyRefreshingRef = useRef<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const attemptedAutoSelectionRef = useRef(false);
  const currentContestant = currentSpotlight;

  // State tracking to prevent UI jitter
  const [profileHeight, setProfileHeight] = useState<number>(width * 0.8);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Format time for display
  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    
    return { hours: hoursStr, minutes: minutesStr, seconds: secondsStr };
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    logLineUp('Manual refresh triggered by user');
    setIsRefreshing(true);
    isManuallyRefreshingRef.current = true;
    
    try {
      await refreshContestants();
      setLastRefreshTime(Date.now());
    } catch (error) {
      logLineUp('Error during manual refresh', { error });
    } finally {
      setIsRefreshing(false);
      setTimeout(() => {
        isManuallyRefreshingRef.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      attemptedAutoSelectionRef.current = false;
    };
  }, []);

  // Periodic polling for contestant updates
  useEffect(() => {
    if (!sessionId) return;
    
    logLineUp('Setting up regular contestant polling');
    
    // Clear any existing interval
    if (regularRefreshIntervalRef.current) {
      clearInterval(regularRefreshIntervalRef.current);
      regularRefreshIntervalRef.current = null;
    }
    
    // Set up polling every 20 seconds
    const intervalId = setInterval(async () => {
      if (loading || isManuallyRefreshingRef.current) {
        logLineUp('Skipping regular refresh due to loading state');
        return;
      }
      
      logLineUp('Performing regular contestant refresh');
      await refreshContestants();
      setLastRefreshTime(Date.now());
    }, 20000); // 20 second interval
    
    regularRefreshIntervalRef.current = intervalId;
    
    return () => {
      logLineUp('Cleaning up regular refresh interval');
      if (regularRefreshIntervalRef.current) {
        clearInterval(regularRefreshIntervalRef.current);
        regularRefreshIntervalRef.current = null;
      }
    };
  }, [sessionId]);

  // Listen for rotation events
  useEffect(() => {
    if (!sessionId) return;
    
    logLineUp('Setting up rotation event listener');
    
    // Listen for rotation events
    const rotationRef = doc(firestore, 'lineupSessions', sessionId, 'rotationEvents', 'latest');
    let lastRotationId = '';
    
    const unsubscribe = onSnapshot(rotationRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventData = snapshot.data();
        const rotationId = eventData.rotationId;
        
        // Only process if this is a new rotation event
        if (rotationId && rotationId !== lastRotationId) {
          lastRotationId = rotationId;
          
          logLineUp('Rotation event detected', {
            previousId: eventData.previousContestantId,
            newId: eventData.newContestantId,
            gender: eventData.gender
          });
          
          // Refresh with slight delay to avoid race conditions
          setTimeout(() => {
            refreshContestants();
          }, 500);
        }
      }
    });
    
    return () => {
      logLineUp('Cleaning up rotation event listener');
      unsubscribe();
    };
  }, [sessionId]);

  // Get the correct gender-based timer
  useEffect(() => {
    if (!sessionId || !user) return;
    
    // Get the timer values with gender awareness
    const updateGenderBasedTimer = async () => {
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) return;
        
        const userGender = userDoc.data().gender || '';
        const oppositeGender = userGender === 'male' ? 'female' : 'male';
        
        // For viewing the opposite gender, get their remaining time
        const remainingTime = await LineupService.getRemainingTime(sessionId, oppositeGender);
        setTimeLeft(remainingTime);
        
        logLineUp(`Updated timer for ${oppositeGender}: ${remainingTime} seconds remaining`);
      } catch (error) {
        console.error('Error updating gender-based timer:', error);
      }
    };
    
    // Initial update
    updateGenderBasedTimer();
    
    // Set up interval for timer updates
    const timer = setInterval(updateGenderBasedTimer, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [sessionId, user]);

  // Log component lifecycle
  useEffect(() => {
    logLineUp('Component mounted', { 
      sessionId,
      userId: user?.uid,
      currentContestantId: currentContestant?.id
    });
    
    return () => {
      logLineUp('Component unmounted');
    };
  }, []);

  // Track profile views
  useEffect(() => {
    if (currentContestant && user && sessionId) {
      logLineUp('Tracking profile view', { 
        viewerId: user.uid,
        viewedProfileId: currentContestant.id,
        profileName: currentContestant.displayName
      });
      
      LineupService.trackProfileView(sessionId, user.uid, currentContestant.id)
        .then(() => {
          logLineUp('Profile view tracked successfully');
        })
        .catch(err => {
          logLineUp('Error tracking profile view', { error: err });
        });
    }
  }, [currentContestant, user, sessionId]);

  // Fallback timer to ensure we eventually render something
  useEffect(() => {
    logLineUp('Setting up fallback timer for initial load');
    
    const fallbackTimer = setTimeout(() => {
      if (!initialLoadComplete) {
        logLineUp('Fallback timer triggered - forcing initialLoadComplete');
        setInitialLoadComplete(true);
        setIsLoading(false);
      }
    }, 10000); // 10 seconds max wait
    
    return () => {
      logLineUp('Clearing fallback timer');
      clearTimeout(fallbackTimer);
    };
  }, [initialLoadComplete]);

  // Enhanced useEffect for contestant loading with retry mechanism
  useEffect(() => {
    const loadContestantsWithRetry = async () => {
      if (!sessionId) {
        logLineUp('Cannot load contestants - no sessionId');
        return;
      }
      
      logLineUp('Loading contestants with retry mechanism');
      let attempts = 0;
      const maxAttempts = 3;
      let loadedContestants: Contestant[] = [];
      
      setIsLoading(true);
      
      while (attempts < maxAttempts && loadedContestants.length === 0) {
        logLineUp(`Attempt ${attempts+1} to load contestants`);
        try {
          loadedContestants = await refreshContestants();
          logLineUp(`Loaded ${loadedContestants.length} contestants on attempt ${attempts+1}`);
          
          if (loadedContestants.length === 0) {
            logLineUp('No contestants loaded, retrying...');
            // Increase wait time between retries
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          logLineUp(`Error on attempt ${attempts+1}`, { error });
        }
        attempts++;
      }
      
      logLineUp(`Setting ${loadedContestants.length} ordered contestants after ${attempts} attempts`);
      setOrderedContestants(loadedContestants);
      setIsLoading(false);
      setInitialLoadComplete(true);
    };
    
    if (sessionId) {
      logLineUp('Starting contestant loading process');
      loadContestantsWithRetry();
    } else {
      logLineUp('Cannot load contestants, no sessionId available');
    }
  }, [sessionId]);

  // Use the context upcoming contestants whenever they change
  useEffect(() => {
    logLineUp('Setting ordered contestants from context', { 
      count: contextUpcomingContestants.length 
    });
    setOrderedContestants(contextUpcomingContestants);
  }, [contextUpcomingContestants]);

  // Handle the action when user clicks on Pop Balloon or Find Love
  const handleActionPress = async (action: 'like' | 'pop') => {
    if (!currentContestant) {
      logLineUp('Cannot handle action - no current contestant');
      return;
    }
    
    if (actionInProgressRef.current) {
      logLineUp('Action already in progress, ignoring request');
      return;
    }
    
    try {
      logLineUp(`Recording ${action} action`, { 
        contestantId: currentContestant.id,
        contestantName: currentContestant.displayName,
        action
      });
      
      actionInProgressRef.current = true;
      
      // Just record the action without navigating away
      await LineupService.recordAction(sessionId || '', user?.uid || '', currentContestant.id, action);
      logLineUp(`${action} action recorded successfully`);
      
      // Stay on the screen and refresh to get the next contestant
      logLineUp('Refreshing contestants after action');
      await refreshContestants();
      
      // Add small delay to prevent rapid-fire actions
      setTimeout(() => {
        actionInProgressRef.current = false;
        logLineUp('Action completed and lock released');
      }, 1000);
    } catch (error) {
      logLineUp(`Error recording ${action} action`, { error });
      actionInProgressRef.current = false;
    }
  };

  // Parse the remaining contestant time
  const formattedTime = formatTime(timeLeft);

  // Render upcoming contestants thumbnails
  const renderUpcomingContestants = () => {
    logLineUp('Rendering upcoming contestants', { count: orderedContestants.length });
    
    if (orderedContestants.length === 0) {
      return (
        <View style={{
          height: 60,
          paddingHorizontal: 20,
          justifyContent: 'center'
        }}>
          <Text style={{color: '#999', fontStyle: 'italic', fontSize: 14}}>
            No upcoming contestants
          </Text>
        </View>
      );
    }
    
    // Filter out current contestant from the display list
    const filteredContestants = orderedContestants.filter(
      contestant => !currentContestant || contestant.id !== currentContestant.id
    );
    
    logLineUp(`Rendering ${filteredContestants.length} upcoming contestants after filtering`);
    
    if (filteredContestants.length === 0) {
      return (
        <View style={{
          height: 60,
          paddingHorizontal: 20,
          justifyContent: 'center'
        }}>
          <Text style={{color: '#999', fontStyle: 'italic', fontSize: 14}}>
            No more upcoming contestants
          </Text>
        </View>
      );
    }
    
    // Limit to maximum 5 contestants to prevent layout issues
    const displayContestants = filteredContestants.slice(0, 5);
    
    return (
      <View style={{
        flexDirection: 'row',
        height: 60,
        paddingHorizontal: 20,
        paddingBottom: 0,
        paddingTop: 0,
        marginTop: 0,
        marginBottom: 0
      }}>
        {displayContestants.map((contestant) => (
          <View key={contestant.id} style={styles.upcomingItem}>
            <Image source={{uri: contestant.photoURL}} style={styles.upcomingImage} resizeMode="cover"/>
          </View>
        ))}
      </View>
    );
  };

  // Give the contestants time to load before showing "no contestants"
  if (initialLoadComplete && !currentSpotlight && !isLoading && orderedContestants.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Waiting Room</Text>
        </View>
        
        <Text style={styles.upcomingTitle}>Next in Line</Text>
        <View style={styles.emptyContestantsContainer}>
          <Text style={styles.waitingText}>
            Waiting for contestants to join...
          </Text>
        </View>
        
        <Text style={styles.currentContestantTitle}>Now in the Spotlight</Text>
        <View style={styles.emptySpotlightContainer}>
          <Ionicons name="person-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Waiting for the first contestant</Text>
        </View>
        
        {/* Chat section for lineup members */}
        <TouchableOpacity onPress={() => setShowChat(true)}>
          <View style={styles.sampleMessageContainer}>
            <View style={styles.sampleMessageContent}>
              <Text style={styles.sampleMessageText}>Tap to chat with others in the lineup...</Text>
              <Ionicons name="chatbubbles-outline" size={24} color="#666" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
  
  // CRITICAL FIX: Try to trigger auto-selection when no contestants are found
  if (initialLoadComplete && !currentContestant && !isLoading && orderedContestants.length === 0) {
    if (!attemptedAutoSelectionRef.current && sessionId) {
      attemptedAutoSelectionRef.current = true;
      logLineUp('No contestants available, triggering auto-selection');
      
      // Determine opposite gender
      const determineOppositeGender = async () => {
        if (!user) return null;
        
        try {
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (userDoc.exists()) {
            const userGender = userDoc.data().gender || '';
            return userGender === 'male' ? 'female' : 'male';
          }
          return null;
        } catch (error) {
          return null;
        }
      };
      
      // Execute auto-selection
      determineOppositeGender().then(oppositeGender => {
        if (oppositeGender && sessionId) {
          logLineUp(`Triggering auto-selection for ${oppositeGender} contestants`);
          LineupService.autoSelectSpotlightForGender(sessionId, oppositeGender)
            .then(contestantId => {
              if (contestantId) {
                logLineUp(`Auto-selected contestant: ${contestantId}, refreshing`);
                refreshContestants();
              }
            })
            .catch(error => {
              logLineUp('Error during auto-selection:', error);
            });
        }
      });
    }
  }

  // If we have a currentContestant, show the main UI even if we're still loading other data
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            logLineUp('Back button pressed from main screen');
            goBack();
          }} 
          style={styles.backButton}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chevron-back" size={22} color="#000" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Line-up Mode</Text>
        
        {/* Add manual refresh button */}
        <TouchableOpacity 
          onPress={handleManualRefresh} 
          style={styles.refreshButton}
          disabled={isRefreshing}
        >
          <View style={styles.iconCircle}>
            <Ionicons 
              name={isRefreshing ? "sync-circle" : "sync"} 
              size={22} 
              color="#000" 
            />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.upcomingTitle}>Next in Line</Text>
      {renderUpcomingContestants()}
      
      <Text style={styles.currentContestantTitle}>Now in the Spotlight</Text>
      
      {showChat ? (
        <View style={styles.chatContainer}>
          <LiveChatComponent onClose={() => setShowChat(false)} />
        </View>
      ) : (
        <View style={styles.contestantContainer}>
          {/* Fixed height container to prevent layout shifts */}
          <View style={[styles.profileCardContainer, { height: profileHeight }]}>
            {/* Match Percentage Badge */}
            <View style={styles.matchPercentageBadge}>
              <Text style={styles.matchPercentageText}>
                {currentContestant?.matchPercentage || 85}% match
              </Text>
            </View>
            
            {/* Main Profile Image */}
            <Image
              source={{ uri: currentContestant?.photoURL }}
              style={styles.profileImage}
              resizeMode="cover"
              onLoad={() => {
                logLineUp('Profile image loaded successfully');
                setImageLoaded(true);
              }}
              onError={(e) => logLineUp('Error loading profile image', { error: e.nativeEvent })}
            />
            
            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {currentContestant?.displayName}, {currentContestant?.ageRange}
              </Text>
            </View>
          </View>
          
          {/* Action Buttons - Fixed position to avoid layout shifts */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                logLineUp('Pop Balloon button pressed', {
                  contestantId: currentContestant?.id,
                  contestantName: currentContestant?.displayName
                });
                handleActionPress('pop');
              }}
              disabled={loading || actionInProgressRef.current}
            >
              <Image 
                source={require('../../../assets/images/main/LoveError.png')} 
                style={styles.actionIcon}
                resizeMode="contain"
              />
              <Text style={styles.actionButtonText}>Pop Balloon</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                logLineUp('Find Love button pressed', {
                  contestantId: currentContestant?.id,
                  contestantName: currentContestant?.displayName
                });
                handleActionPress('like');
              }}
              disabled={loading || actionInProgressRef.current}
            >
              <Image 
                source={require('../../../assets/images/main/LoveSuccess.png')} 
                style={styles.actionIcon}
                resizeMode="contain"
              />
              <Text style={styles.actionButtonText}>Find Love</Text>
            </TouchableOpacity>
          </View>
          
          {/* About Me Section - Fixed layout */}
          <TouchableOpacity 
            style={styles.aboutMeButton}
            onPress={() => {
              setShowProfileModal(true);
            }}
          >
            <Text style={styles.aboutMeTitle}>About Me</Text>
            {showBio ? (
              <Text style={styles.bioText}>{'Click to view'}</Text>
            ) : (
            <Text style={styles.bioPreview} numberOfLines={2}>
              {'Click to view'}
            </Text>
            )}
          </TouchableOpacity>
          
          {/* Next Contestant Timer */}
          <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Countdown timer</Text>
            <View style={styles.timerDigits}>
              <View style={styles.timerDigit}>
                <Text style={styles.digit}>{formattedTime.hours}</Text>
                <Text style={styles.digitLabel}>hr</Text>
              </View>
              <View style={styles.timerDigit}>
                <Text style={styles.digit}>{formattedTime.minutes}</Text>
                <Text style={styles.digitLabel}>min</Text>
              </View>
              <View style={styles.timerDigit}>
                <Text style={styles.digit}>{formattedTime.seconds}</Text>
                <Text style={styles.digitLabel}>sec</Text>
              </View>
            </View>
          </View>
          
          {/* Live Chat */}
          {!showChat && (
            <TouchableOpacity onPress={() => setShowChat(true)}>
            <View style={styles.sampleMessageContainer}>
              <Image 
                source={{ uri: currentContestant?.photoURL || 'https://via.placeholder.com/30' }} 
                style={styles.messageSenderImage} 
              />
              <View style={styles.sampleMessageContent}>
                <Text style={styles.sampleMessageText}>Tap to open the live chat...</Text>
                <Ionicons name="happy-outline" size={20} color="#666" />
              </View>
            </View>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Loading overlay for actions */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      )}
      {showProfileModal && (
        <PrivateProfileDetailsModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          profile={currentContestant}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    marginLeft: -20,
    marginRight: -20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 40,
    paddingBottom: 10,
    marginTop: 0, // Removed margin to prevent jitter
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  backButton: {
    padding: 5,
  },
  refreshButton: {
    padding: 5,
  },
  chatButton: {
    padding: 5,
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
  upcomingSection: {
    height: 60,
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 20,
    marginBottom: 5,
    marginTop: 5,
  },
  upcomingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 0, // Remove vertical padding
    height: 60, // Reduce height 
    alignItems: 'center',
  },
  upcomingItem: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    overflow: 'hidden',
  },
  upcomingImage: {
    width: '100%',
    height: '100%',
  },
  currentContestantTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B6B',
    textAlign: 'center',
    marginVertical: 10,
  },
  contestantContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  profileCardContainer: {
    position: 'relative',
    width: '75.5%',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginLeft: '13%',
    marginRight: 'auto',
    marginBottom: 10,
  },
  matchPercentageBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    zIndex: 2,
  },
  matchPercentageText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  actionButtonsContainer: {
    position: 'absolute',
    top: '23%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    width: '120%'
  },
  actionButton: {
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
  },
  actionButtonText: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '500',
    color: '#333',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  aboutMeContainer: {
    marginBottom: 5,
    minHeight: 50, // Minimum height to prevent layout shifts
  },
  aboutMeButton: {
    backgroundColor: '#FFF',
    borderRadius: 50,
    padding: 5,
    alignItems: 'center',
  },
  aboutMeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    padding: 10,
  },
  bioPreview: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  timerContainer: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 15,
    height: 60, // Fixed height to prevent layout shifts
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  timerDigits: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timerDigit: {
    marginHorizontal: 5,
    alignItems: 'center',
  },
  digit: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  digitLabel: {
    fontSize: 12,
    color: '#999',
  },
  liveChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
    height: 30, // Fixed height
  },
  liveChatIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFE4E4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  liveChatText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  sampleMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 10,
    marginBottom: 15,
    height: 60, // Fixed height
  },
  messageSenderImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  sampleMessageContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sampleMessageText: {
    fontSize: 12,
    color: '#666',
  },
  chatContainer: {
    flex: 1,
    marginTop: 10,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
    marginHorizontal: 20,
  },
  chatInputBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    marginTop: 10
  },
  noContestantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF5F5',
  },
  noContestantText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  backButtonContainer: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  noUpcomingContainer: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noUpcomingText: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
  },
  emptyContestantsContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  waitingText: {
    color: '#999',
    fontSize: 16,
  },
  emptySpotlightContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
});