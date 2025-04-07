// components/onboarding/ExpectationsLifestyle.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface ExpectationsProps {
  selectedLifestyle: string[];
  onUpdateLifestyle: (lifestyle: string[]) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function ExpectationsLifestyle({ 
  selectedLifestyle, 
  onUpdateLifestyle,
  visibleOnProfile = true,
  onToggleVisibility
}: ExpectationsProps) {
  const [localSelectedOptions, setLocalSelectedOptions] = useState<string[]>(selectedLifestyle || []);
  const [isVisible, setIsVisible] = useState(visibleOnProfile);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customIntention, setCustomIntention] = useState('');
  const [customIntentions, setCustomIntentions] = useState<string[]>([]);

  // Sync local state with props
  useEffect(() => {
    setLocalSelectedOptions(selectedLifestyle || []);
  }, [selectedLifestyle]);

  // Sync visibility state with props
  useEffect(() => {
    setIsVisible(visibleOnProfile);
  }, [visibleOnProfile]);

  // Sync props with local state when it changes
  useEffect(() => {
    onUpdateLifestyle(localSelectedOptions);
  }, [localSelectedOptions]);

  // Handle visibility toggle
  const handleVisibilityChange = (value: boolean) => {
    setIsVisible(value);
    if (onToggleVisibility) {
      onToggleVisibility(value);
    }
  };

  const options = [
    { id: 'Post-breakup exploration', label: 'Post-breakup exploration', size: 'Larger', position: { top: 20, left: 0 } },
    { id: 'Life Partner', label: 'Life Partner', size: 'Small', position: { top: 0, right: 110 } },
    { id: 'Long-term relationship', label: 'Long-term relationship', size: 'Large', position: { top: -20, right: 0 } },
    { id: 'Family', label: 'Start a family', size: 'Largest', position: { top: 120, left: 75 } },
    { id: 'Faith-based partnership', label: 'Faith-based partnership', size: 'Larger', position: { top: 240, left: 0 } },
    { id: 'Casual', label: 'Casual dating', size: 'SmallPlus', position: { top: 265, right: 115 } },
    { id: 'Friends', label: 'Friends first', size: 'Smaller', position: { top: 150, right: 30 } },
    { id: 'Friendsplus', label: 'Friends with benefit', size: 'Smaller', position: { top: 83, right: 0 } },
    { id: 'Chat Mate', label: 'Chat Mate', size: 'Smallest', position: { top: 80, left: 180 } },
    { id: 'Activity partner', label: 'Activity partner', size: 'Smaller', position: { top: 160, left: 0 } },
    { id: 'Marriage', label: 'Marriage', size: 'small', position: { bottom: 30, left: 65 } },
    { id: 'Type Myself', label: 'Type It MYSELF', size: 'Smallest', position: { bottom: 40, left: 0 } },
    { id: 'Short-term relationship', label: 'Short-term relationship', size: 'Large', position: { bottom: 115, right: 0 } },
    { id: 'Figuring out my dating goals', label: 'Figuring out my dating goals', size: 'Small', position: { bottom: 38, right: 70 } }, 
    { id: 'Prefer not to say', label: "Prefer not to say", size: 'Smallest', position: { bottom: 40, right: 5 } },
    { id: 'Networking', label: "Networking", size: 'Tiny', position: { top: 208, right: -10 } },
  ];

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'Largest':
        return { width: 140, height: 140, fontSize: 18 };
      case 'Larger':
        return { width: 120, height: 120, fontSize: 16 };
      case 'Large':
        return { width: 100, height: 100, fontSize: 14 };
      case 'Small':
        return { width: 90, height: 90, fontSize: 12 };
      case 'SmallPlus':
        return { width: 80, height: 80, fontSize: 12 };
      case 'Smaller':
        return { width: 70, height: 70, fontSize: 10 };
      case 'Smallest':
        return { width: 60, height: 60, fontSize: 8 };
      case 'Tiny':
        return { width: 48, height: 48, fontSize: 5 };
      default:
        return { width: 90, height: 90, fontSize: 14 };
    }
  };

  const toggleOption = (id: string) => {
    // If "Type Myself" is clicked, show the custom modal
    if (id === 'Type Myself') {
      setShowCustomModal(true);
      return;
    }
    
    if (localSelectedOptions.includes(id)) {
      setLocalSelectedOptions(localSelectedOptions.filter(item => item !== id));
    } else {
      setLocalSelectedOptions([...localSelectedOptions, id]);
    }
  };

  const handleCustomIntentionSave = () => {
    if (customIntention.trim()) {
      // Create a standardized format that works better with filters
      const customValue = {
        type: 'custom',
        text: customIntention
      };
      
      // Convert to JSON string for storage
      const customStringified = JSON.stringify(customValue);
      
      // Add the custom intention to the selected options
      setLocalSelectedOptions([...localSelectedOptions, customStringified]);
      
      // Clear the input field
      setCustomIntention('');
    }
  };

    // Parse selected options to display custom intentions in the modal
    useEffect(() => {
      const customs = localSelectedOptions.filter(item => {
        return item.startsWith('{') || !options.some(opt => opt.id === item);
      });
      setCustomIntentions(customs);
    }, [localSelectedOptions]);
  
    const handleDeleteCustomIntention = (intention: string) => {
      setLocalSelectedOptions(localSelectedOptions.filter(item => item !== intention));
    };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What is your dating intention?</Text>
      
      <View style={styles.optionsContainer}>
        {options.map((option) => {
          const sizeStyle = getSizeStyles(option.size);
          const isSelected = localSelectedOptions.includes(option.id);
          
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => toggleOption(option.id)}
              style={[
                styles.optionButton,
                sizeStyle,
                option.position,
                isSelected ? styles.selectedOption : styles.unselectedOption
              ]}
            >
              {isSelected ? (
                <LinearGradient
                  colors={['#FF6B6B', '#FFA07A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.optionGradient, { width: sizeStyle.width, height: sizeStyle.height }]}
                >
                  <Text style={[styles.optionText, { fontSize: sizeStyle.fontSize, color: 'white' }]}>
                    {option.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={[styles.optionContent, { width: sizeStyle.width, height: sizeStyle.height }]}>
                  <Text style={[styles.optionText, { fontSize: sizeStyle.fontSize }]}>
                    {option.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Profile Visibility Toggle */}
      <View style={styles.visibilityContainer}>
        <View style={styles.visibilityTextContainer}>
          <Text style={styles.visibilityTitle}>Visible on profile</Text>
          <Text style={styles.visibilitySubtitle}>
            Toggle to show or hide your dating intention on your profile
          </Text>
        </View>
        
        <Switch
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
          ios_backgroundColor="#E5E5E5"
          onValueChange={handleVisibilityChange}
          value={isVisible}
        />
      </View>
      
      {/* Custom Intention Modal */}
      <Modal
        visible={showCustomModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Intention</Text>
              <TouchableOpacity 
                onPress={() => setShowCustomModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Tell us what you're looking for in your own words
            </Text>
            
            <TextInput
              style={styles.customInput}
              placeholder="Enter your dating intention..."
              value={customIntention}
              onChangeText={setCustomIntention}
              multiline
              maxLength={50}
              placeholderTextColor="#999"
            />
            
            <Text style={styles.charCount}>
              {customIntention.length}/50 characters
            </Text>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleCustomIntentionSave}
              disabled={!customIntention.trim()}
            >
              <LinearGradient
                colors={['#EC5F61', '#F0B433']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.saveButtonGradient,
                  !customIntention.trim() && styles.disabledButton
                ]}
              >
                <Text style={styles.saveButtonText}>Add Intention</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Custom intentions list with delete option */}
            {customIntentions.length > 0 && (
              <View style={styles.customListContainer}>
                <Text style={styles.listTitle}>Your Custom Intentions:</Text>
                
                {customIntentions.map((item, index) => {
                  let displayText = item;
                  
                  // Try to parse JSON objects
                  try {
                    if (item.startsWith('{')) {
                      const parsed = JSON.parse(item);
                      if (parsed.type === 'custom' && parsed.text) {
                        displayText = parsed.text;
                      }
                    }
                  } catch (e) {
                    // If parsing fails, use the original text
                  }
                  
                  return (
                    <View key={index} style={styles.customListItem}>
                      <Text style={styles.customListText} numberOfLines={1}>
                        {displayText}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteCustomIntention(item)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setShowCustomModal(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    color: '#F2F1ED',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 0,
    color: '#161616',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 10,
  },
  optionsContainer: {
    flex: 1,
    position: 'relative',
  },
  optionButton: {
    position: 'absolute',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  selectedOption: {
    borderWidth: 0,
  },
  unselectedOption: {
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  optionGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  optionContent: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  optionText: {
    textAlign: 'center',
    paddingHorizontal: 10,
    fontWeight: '500',
  },
  // Visibility Toggle Styles
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopColor: '#E5E5E5',
    position: 'absolute',
    bottom: -30,
    left: 20,
    right: 20,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  visibilitySubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Custom Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#FFF5F5',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  customListContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  customListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  customListText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  deleteButton: {
    padding: 5,
  },
  doneButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 25,
    backgroundColor: '#FFF5F5',
  },
  doneButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});