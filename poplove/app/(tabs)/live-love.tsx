// app/(tabs)/live-love.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Image,
  Animated,
  Easing,
  AppState,
  ActivityIndicator
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../components/auth/AuthProvider';
import SpeedDatingMode from '../../components/live-love/SpeedDatingMode';
import LineUpMode from '../../components/live-love/LineUpMode';
import { useLocalSearchParams } from 'expo-router';

// Create a logger function for this component
const logLiveLove = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [LiveLoveTab] 🔴 ${message}`, data ? data : '');
};

export default function LiveLoveScreen() {
  const searchParams = useLocalSearchParams();
  const { user } = useAuthContext();
  const userGenderRef = useRef<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<'selection' | 'speed-dating' | 'line-up'>('selection');
  const [selectedDatingMode, setSelectedDatingMode] = useState<'speed-dating' | 'line-up' | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Use refs to prevent race conditions and unnecessary re-renders
  const appState = useRef(AppState.currentState);
  const modeSelectionInProgress = useRef(false);
  const sessionCheckInProgress = useRef(false);
  const lockModeChange = useRef(false);
  const preventStateReset = useRef(false);
  
  // Log component initialization
  logLiveLove('Component rendering', { 
    userId: user?.uid,
    searchParams: searchParams ? Object.fromEntries(Object.entries(searchParams)) : {}
  });
  
  // Handle direct navigation from URL params
  useEffect(() => {
    if (searchParams?.screen && searchParams?.direct === 'true') {
      logLiveLove('Direct navigation detected', { screen: searchParams.screen });
      
      if (searchParams.screen === 'private' && searchParams.sessionId) {
        logLiveLove('Directly navigating to LineUp private screen', { 
          sessionId: searchParams.sessionId 
        });
        
        // Prevent all resets & checks
        preventStateReset.current = true;
        lockModeChange.current = true;
        
        // Jump directly to lineup mode
        setSelectedDatingMode('line-up');
        setSelectedMode('line-up');
        
        // Set up LineUpContext reference with session info
        if (typeof window !== 'undefined' && window.lineupContextRef?.current) {
          window.lineupContextRef.current.setSessionId(searchParams.sessionId);
          window.lineupContextRef.current.setIsCurrentUser(true);
          
          // Start contestant timer after delay to ensure context is ready
          setTimeout(() => {
            if (window.lineupContextRef?.current?.startContestantTimer) {
              window.lineupContextRef.current.startContestantTimer();
            }
          }, 500);
        }
        
        // Safety timeout to release locks
        setTimeout(() => {
          preventStateReset.current = false;
          lockModeChange.current = false;
          logLiveLove('Released navigation locks after timeout');
        }, 10000);
      }
    }
  }, [searchParams]);

  // Log component lifecycle
  useEffect(() => {
    logLiveLove('Component mounted', { userId: user?.uid });
    
    return () => {
      logLiveLove('Component unmounted');
    };
  }, []);

  // Log state changes
  useEffect(() => {
    logLiveLove('State changed', { 
      selectedMode, 
      selectedDatingMode, 
      isInitialLoad,
      initialCheckComplete,
      loading,
      lockModeChange: lockModeChange.current,
      preventStateReset: preventStateReset.current
    });
  }, [selectedMode, selectedDatingMode, isInitialLoad, initialCheckComplete, loading]);

  // App state listener for foreground/background detection
// App state listener for foreground/background detection
useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    // Update state first to ensure correct sequence
    appState.current = nextAppState;
    
    // CRITICAL: Protect line-up mode from background/foreground transitions
    if (nextAppState === 'active' && selectedMode === 'line-up') {
      preventStateReset.current = true;
      logLiveLove('Force-protecting line-up mode state');
      return; // Exit immediately to prevent any session checks
    }
    
    // Only check session when coming back to foreground and not in protected mode
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      if (!preventStateReset.current) {
        checkUserSession();
      } else {
        logLiveLove('Session check prevented by lock');
      }
    }
  });

  return () => subscription.remove();
}, [selectedMode]); // Add selectedMode to dependencies

  // Initial load session check
  useEffect(() => {
    if (isInitialLoad && user && !initialCheckComplete && !preventStateReset.current) {
      logLiveLove('Initial load - checking user session', { userId: user.uid });
      checkUserSession();
      setIsInitialLoad(false);
      setInitialCheckComplete(true);
    }
  }, [user, isInitialLoad, initialCheckComplete]);

  useEffect(() => {
    if (selectedDatingMode) {
      // Make this stronger - persist through app state changes
      preventStateReset.current = true;
    }
  }, [selectedDatingMode]);

  // Session restoration and check logic
  const checkUserSession = async () => {
    if (preventStateReset.current || selectedDatingMode === 'line-up') {
      logLiveLove('Session check aborted - user actively in mode', {
        selectedMode,
        selectedDatingMode
      });
      return;
    }
    
    // Prevent multiple concurrent checks
    if (sessionCheckInProgress.current) {
      logLiveLove('Session check already in progress, aborting');
      return;
    }
    
    try {
      sessionCheckInProgress.current = true;
      setLoading(true);
      
      logLiveLove('Checking for active user sessions', { userId: user?.uid });
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Check lineup sessions first 
      logLiveLove('Checking lineup sessions');
      const lineupSessionsRef = collection(firestore, 'lineupSessions');
      const lineupQuery = query(
        lineupSessionsRef,
        where('contestants', 'array-contains', user?.uid || ''),
        where('status', '==', 'active')
      );
      
      const lineupSnapshot = await getDocs(lineupQuery);
      logLiveLove(`Found ${lineupSnapshot.size} active lineup sessions`);
      
      if (!lineupSnapshot.empty) {
        // Check if any session has this user as current contestant
        for (const sessionDoc of lineupSnapshot.docs) {
          const sessionData = sessionDoc.data();
          
          // Check both general and gender-specific current contestant fields
          const isCurrentContestant = 
          sessionData.currentContestantId === user?.uid || 
          sessionData.currentMaleContestantId === user?.uid ||
          sessionData.currentFemaleContestantId === user?.uid;
            
          logLiveLove('Checking if user is current contestant', {
            sessionId: sessionDoc.id,
            isCurrentContestant
          });
          
          // If this is an active session, use it regardless of contestant status
          logLiveLove('User has active lineup session - setting mode', {
            sessionId: sessionDoc.id,
            isCurrentContestant
          });
          
          // Lock state to prevent unwanted resets
          preventStateReset.current = true;
          
          // Set lineup mode
          setSelectedMode('line-up');
          setSelectedDatingMode('line-up');
          setLoading(false);
          
          // Fire and forget - release lock after a delay
          setTimeout(() => {
            preventStateReset.current = false;
          }, 10000);
          
          return;
        }
      }
      
      // Check speed dating sessions
      logLiveLove('Checking speed dating sessions');
      const speedSessionsRef = collection(firestore, 'speedDatingSessions');
      const speedQuery = query(
        speedSessionsRef,
        where('userId', '==', user?.uid || ''),
        where('status', '==', 'searching'),
        where('createdAt', '>', fiveMinutesAgo) // Only recent sessions
      );
      
      const speedSnapshot = await getDocs(speedQuery);
      logLiveLove(`Found ${speedSnapshot.size} active speed dating sessions`);
      
      if (!speedSnapshot.empty) {
        logLiveLove('User has active speed dating session', {
          sessionId: speedSnapshot.docs[0].id
        });
        
        setSelectedDatingMode('speed-dating');
        setSelectedMode('speed-dating'); // Auto-resume speed dating session
      } else if (isInitialLoad) {
        // Only reset if it's the initial load, not when the user just selected a mode
        logLiveLove('No active sessions found - resetting to selection (initial load only)');
        setSelectedMode('selection');
        setSelectedDatingMode(null);
      }
    } catch (error) {
      logLiveLove("Error checking session", { error });
      if (isInitialLoad) {
        setSelectedMode('selection');
        setSelectedDatingMode(null);
      }
    } finally {
      sessionCheckInProgress.current = false;
      setLoading(false);
    }
  };

  // Animated blinking dot setup
  const blinkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    logLiveLove('Setting up blinking animation');
    
    // Create an infinite loop of blinking with slower, more subtle animation
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(blinkAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );

    // Start the animation
    blinkAnimation.start();

    // Cleanup function to stop animation if component unmounts
    return () => {
      logLiveLove('Stopping blinking animation');
      blinkAnimation.stop();
    };
  }, [blinkAnim]);

  // Safe mode selection with debounce
  const handleSelectMode = (mode: 'speed-dating' | 'line-up') => {
    // Prevent multiple rapid taps
    if (modeSelectionInProgress.current) {
      logLiveLove('Mode selection already in progress, ignoring tap');
      return;
    }
    
    // Lock mode selection briefly
    modeSelectionInProgress.current = true;
    
    logLiveLove('User selected mode', { mode });
    setSelectedDatingMode(mode);
    
    // Clear flag after delay
    setTimeout(() => {
      modeSelectionInProgress.current = false;
    }, 500);
  };

  // Handle proceed button click
  const handleProceedButton = () => {
    if (!selectedDatingMode) {
      logLiveLove('Cannot proceed - no dating mode selected');
      return;
    }
    
    logLiveLove('Proceeding with selected mode', { selectedDatingMode });
    
    // Block ALL state resets during transition
    preventStateReset.current = true;
    modeSelectionInProgress.current = true;
    lockModeChange.current = true;
    
    // Set mode
    setSelectedMode(selectedDatingMode);
    
    // Release locks after a delay
    setTimeout(() => {
      lockModeChange.current = false;
      modeSelectionInProgress.current = false;
      
      // Keep prevent state reset a bit longer
      setTimeout(() => {
        preventStateReset.current = false;
      }, 5000);
    }, 5000);
  };

  // Handle back button from mode screens
  const handleBackFromMode = () => {
    logLiveLove('User returned from dating mode to selection');
    
    // Reset state
    setSelectedMode('selection');
    
    // Release any lingering locks
    lockModeChange.current = false;
    modeSelectionInProgress.current = false;
    preventStateReset.current = false;
  };

  // Render the mode selection screen
  const renderModeSelection = () => {
    logLiveLove('Rendering mode selection screen');
    
    return (
      <View style={styles.modeSelectionContainer}>
        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <Animated.View 
            style={[
              styles.liveDot, 
              { 
                opacity: blinkAnim,
                transform: [
                  {
                    scale: blinkAnim.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [1, 0.8, 0.5, 0.8, 1]
                    })
                  }
                ]
              }
            ]} 
          />
          <Text style={styles.liveText}>Live</Text>
        </View>

        {/* Speed Dating Card */}
        <TouchableOpacity 
          style={[
            styles.modeCard, 
            selectedDatingMode === 'speed-dating' && styles.selectedModeCard
          ]}
          onPress={() => {
            logLiveLove('User selected Speed Dating mode');
            handleSelectMode('speed-dating');
          }}
          disabled={loading}
        >
          <View style={styles.modeIconContainer}>
            <Image 
              source={require('../../assets/images/main/speed-dating-icon.png')} 
              style={styles.modeIcon}
              resizeMode="contain"
              onError={(e) => logLiveLove('Error loading speed dating icon', { error: e.nativeEvent })}
            />
          </View>
          <View style={styles.modeTextContainer}>
          <Text style={styles.modeTitle}>Speed Dating Mode</Text>
          <Text style={styles.modeSubtitle}>(Instant Match 1-on-1)</Text>
        </View>
          {selectedDatingMode === 'speed-dating' && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Line Up Card */}
        <TouchableOpacity 
          style={[
            styles.modeCard, 
            selectedDatingMode === 'line-up' && styles.selectedModeCard
          ]}
          onPress={() => {
            logLiveLove('User selected Line Up mode');
            handleSelectMode('line-up');
          }}
          disabled={loading}
        >
          <View style={styles.modeIconContainer}>
            <Image 
              source={require('../../assets/images/main/lineup-icon.png')} 
              style={styles.modeIcon}
              resizeMode="contain"
              onError={(e) => logLiveLove('Error loading lineup icon', { error: e.nativeEvent })}
            />
          </View>
          <View style={styles.modeTextContainer}>
            <Text style={styles.modeTitle}>Line Up Mode</Text>
            <Text style={styles.modeSubtitle}>(Group Room)</Text>
          </View>
          {selectedDatingMode === 'line-up' && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#FF6B6B" />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Proceed Button */}
        <TouchableOpacity
          style={[
            styles.proceedButton,
            (!selectedDatingMode || loading) && styles.disabledProceedButton
          ]}
          onPress={() => {
            logLiveLove('Proceed button pressed', { selectedDatingMode });
            handleProceedButton();
          }}
          disabled={!selectedDatingMode || loading}
        >
          <LinearGradient
            colors={selectedDatingMode && !loading ? ['#EC5F61', '#F0B433'] : ['#E0E0E0', '#E0E0E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color={selectedDatingMode ? "#fff" : "#999"} />
            ) : (
              <Text style={[
                styles.proceedButtonText,
                !selectedDatingMode && styles.disabledProceedButtonText
              ]}>
                Proceed
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Render content based on selected mode
  const renderContent = () => {
    // Prevent unwanted mode changes during critical periods
    if (lockModeChange.current && selectedMode !== selectedDatingMode && selectedDatingMode) {
      logLiveLove('Preventing unwanted mode change - locking to selected mode');
      setTimeout(() => setSelectedMode(selectedDatingMode), 0);
      
      // Show loading indicator during state synchronization
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      );
    }
  
    logLiveLove('Rendering content for mode', { selectedMode });
    
    switch (selectedMode) {
      case 'speed-dating':
        return (
          <SpeedDatingMode 
            onBack={() => {
              logLiveLove('User navigated back from SpeedDatingMode');
              handleBackFromMode();
            }}
          />
        );
      case 'line-up':
        return (
          <LineUpMode 
            onBack={() => {
              logLiveLove('User navigated back from LineUpMode');
              handleBackFromMode();
            }}
          />
        );
      default:
        return renderModeSelection();
    }
  };

  // Log final render
  logLiveLove('Rendering LiveLoveScreen', { 
    selectedMode, 
    selectedDatingMode, 
    isInitialLoad,
    loading
  });

  // Loading overlay for transitions
  if (loading && selectedMode === 'selection') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Checking active sessions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 20,
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    top: 50,
    left: 10,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'red',
    marginRight: 5,
  },
  liveText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
  },
  modeSelectionContainer: {
    flex: 1,
    paddingTop: 130,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFE4E4',
  },
  selectedModeCard: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#FFFBFB',
  },
  modeIconContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modeIcon: {
    width: 90,
    height: 90,
  },
  modeTextContainer: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modeSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  proceedButton: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 'auto',
    marginBottom: 20,
  },
  disabledProceedButton: {
    opacity: 0.5,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledProceedButtonText: {
    color: '#999',
  },
});