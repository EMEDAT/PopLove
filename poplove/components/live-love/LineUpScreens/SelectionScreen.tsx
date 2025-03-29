// components/live-love/LineUpScreens/SelectionScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLineUp } from './LineUpContext';
import { checkUserEligibility } from './utils';
import { useAuthContext } from '../../auth/AuthProvider';

// Create a logger function for this component
const logSelection = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] [SelectionScreen] 🔍 ${message}`, data ? data : '');
};

interface SelectionScreenProps {
  onBack: () => void;
}

export default function SelectionScreen({ onBack }: SelectionScreenProps) {
  logSelection('Component rendering');
  
  const { user } = useAuthContext();
  const { 
    categories, 
    toggleCategory, 
    startLineUp, 
    loading, 
    error 
  } = useLineUp();
  
  const [isEligible, setIsEligible] = useState(true);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  // Log component mount/unmount lifecycle
  useEffect(() => {
    logSelection('Component mounted', { userId: user?.uid });
    
    return () => {
      logSelection('Component unmounted');
    };
  }, []);

  // Check if user is eligible (not eliminated in past 48 hours)
  useEffect(() => {
    const checkEligibility = async () => {
      if (user) {
        logSelection('Checking eligibility for user', { userId: user.uid });
        try {
          const eligible = await checkUserEligibility(user.uid);
          logSelection('Eligibility result', { eligible, userId: user.uid });
          
          setIsEligible(eligible);
          setEligibilityChecked(true);
          
          if (!eligible) {
            logSelection('User not eligible, showing alert', { userId: user.uid });
            Alert.alert(
              'Lineup Cooldown',
              'You were recently eliminated and cannot join a lineup for 48 hours.',
              [{ 
                text: 'OK', 
                onPress: () => {
                  logSelection('User acknowledged eligibility alert');
                  onBack();
                }
              }]
            );
          }
        } catch (error) {
          logSelection('Error checking eligibility', { error, userId: user?.uid });
          setEligibilityChecked(true);
          setIsEligible(false);
        }
      } else {
        logSelection('No user available for eligibility check');
        setEligibilityChecked(true);
      }
    };
    
    logSelection('Starting eligibility check');
    checkEligibility();
  }, [user, onBack]);

  const handleStartLineUp = async () => {
    logSelection('Proceed button clicked');
    const selectedCategory = categories.find(cat => cat.selected);
    logSelection('Selected category', { 
      categoryId: selectedCategory?.id, 
      categoryName: selectedCategory?.name 
    });
    
    if (!isEligible) {
      logSelection('Blocked lineup start - user not eligible');
      Alert.alert(
        'Lineup Cooldown',
        'You were recently eliminated and cannot join a lineup for 48 hours.'
      );
      return;
    }
    
    if (!selectedCategory) {
      logSelection('No category selected - showing alert');
      Alert.alert('Selection Required', 'Please select a category to continue.');
      return;
    }
    
    logSelection('Starting lineup process', { 
      categoryId: selectedCategory.id,
      userId: user?.uid
    });
    
    try {
      await startLineUp();
      logSelection('Lineup started successfully');
    } catch (error) {
      logSelection('Error starting lineup', { error });
    }
  };

  // Log changes to key state variables
  useEffect(() => {
    logSelection('State updated', { eligibilityChecked, isEligible, error, loading });
  }, [eligibilityChecked, isEligible, error, loading]);

  // Don't render anything until eligibility is checked
  if (!eligibilityChecked) {
    logSelection('Rendering loading screen - checking eligibility');
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Checking eligibility...</Text>
        </View>
      </SafeAreaView>
    );
  }

  logSelection('Rendering selection screen', { 
    isEligible, 
    categoriesCount: categories.length,
    hasSelection: categories.some(cat => cat.selected),
    loading,
    error: error || 'none'
  });
  
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header - Fixed at the top */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            logSelection('Back button pressed');
            onBack();
          }} 
          style={styles.backButton}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Line-Up Option</Text>
        <View style={styles.placeholder} />
      </View>
      
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Category Selection */}
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                category.selected && styles.categoryCardSelected
              ]}
              onPress={() => {
                logSelection('Category selected', { 
                  categoryId: category.id, 
                  categoryName: category.name,
                  previouslySelected: category.selected
                });
                toggleCategory(category.id);
              }}
            >
              <LinearGradient
                colors={category.selected ? ['#FF6B6B', '#FFA07A'] : ['#F0F0F0', '#F0F0F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.categoryGradient}
              >
                <Text style={[
                  styles.categoryText,
                  category.selected && styles.categoryTextSelected
                ]}>
                  {category.name}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Error message */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        {/* Information section */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How Line-Up Mode Works:</Text>
          <Text style={styles.infoText}>
            • Join a group with similar interests{'\n'}
            • Wait your turn to be featured{'\n'}
            • Chat with people who like your profile{'\n'}
            • Get matched with compatible users
          </Text>
          <Text style={styles.infoWarning}>
            Note: If you receive 20 or more rejections, you'll be eliminated and unable to join for 48 hours.
          </Text>
        </View>
        
        {/* Add bottom padding for better scrolling */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      
      {/* Proceed Button - Fixed at the bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.proceedButton,
            !categories.some(cat => cat.selected) && styles.proceedButtonDisabled
          ]}
          onPress={() => {
            logSelection('Proceed button pressed', {
              hasSelection: categories.some(cat => cat.selected),
              selectedCategory: categories.find(cat => cat.selected)?.id
            });
            handleStartLineUp();
          }}
          disabled={loading || !categories.some(cat => cat.selected)}
        >
          <LinearGradient
            colors={categories.some(cat => cat.selected) ? ['#EC5F61', '#F0B433'] : ['#E0E0E0', '#E0E0E0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.proceedButtonText}>Proceed</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4E4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoriesContainer: {
    marginBottom: 24,
  },
  categoryCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryCardSelected: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    backgroundColor: '#FFFBFB',
  },
  categoryGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  categoryTextSelected: {
    color: '#FFF',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 15,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#FFF5F5',
    borderTopWidth: 1,
    borderTopColor: '#FFE4E4',
  },
  proceedButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  proceedButtonDisabled: {
    opacity: 0.5,
  },
  gradientButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proceedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledProceedButtonText: {
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#FFE4E4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 12,
    lineHeight: 24,
  },
  infoWarning: {
    fontSize: 14,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: 24, // Extra space at the bottom of scrollable content
  }
});