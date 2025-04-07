// components/onboarding/RelationshipTypeSelection.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface RelationshipTypeSelectionProps {
  selectedRelationshipType: string;
  onSelectRelationshipType: (relationshipType: string) => void;
  customDescription?: string;
  onUpdateCustomDescription?: (description: string) => void;
  visibleOnProfile?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export default function RelationshipTypeSelection({ 
  selectedRelationshipType, 
  onSelectRelationshipType,
  customDescription = '',
  onUpdateCustomDescription = () => {},
  visibleOnProfile = true,
  onToggleVisibility = () => {}
}: RelationshipTypeSelectionProps) {
  const [isVisible, setIsVisible] = useState(visibleOnProfile);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [localCustomDescription, setLocalCustomDescription] = useState('');
  const [customDescriptions, setCustomDescriptions] = useState<string[]>([]);
  
  useEffect(() => {
    setIsVisible(visibleOnProfile);
  }, [visibleOnProfile]);
  
  useEffect(() => {
    if (customDescription) {
      try {
        // Try to parse as JSON array first
        const parsed = JSON.parse(customDescription);
        if (Array.isArray(parsed)) {
          setCustomDescriptions(parsed);
        } else {
          // If not an array, add as a single item
          setCustomDescriptions([customDescription]);
        }
      } catch (e) {
        // If parsing fails, treat as a single string
        setCustomDescriptions([customDescription]);
      }
    }
  }, [customDescription]);

  // Handle visibility toggle
  const handleVisibilityChange = (value: boolean) => {
    setIsVisible(value);
    onToggleVisibility(value);
  };

  const handleSaveCustomDescription = () => {
    if (localCustomDescription.trim()) {
      // Create a standardized format without extra stringification
      const customValue = {
        type: 'custom',
        text: localCustomDescription
      };
      
      // Use this direct object value - don't stringify it first
      onSelectRelationshipType('custom');
      onUpdateCustomDescription(JSON.stringify(customValue));
      
      // Clear the input field
      setLocalCustomDescription('');
    }
  };

  const relationshipTypes = [
    'Monogamy',
    'Non-monogamy',
    'Figuring out my relationship type'
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What type of relationship are you looking for?</Text>
      
      <ScrollView style={styles.optionsContainer}>
        {relationshipTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.optionButton,
              selectedRelationshipType === type.toLowerCase() && styles.selectedOption
            ]}
            onPress={() => onSelectRelationshipType(type.toLowerCase())}
          >
            <Text style={styles.optionText}>{type}</Text>
            <View style={styles.checkboxContainer}>
              {selectedRelationshipType === type.toLowerCase() ? (
                <LinearGradient
                  colors={['#EC5F61', '#F0B433']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientCheckbox}
                >
                  <Text style={styles.checkmark}>✓</Text>
                </LinearGradient>
              ) : (
                <View style={styles.checkbox} />
              )}
            </View>
          </TouchableOpacity>
        ))}
        
        {/* Custom option */}
        <TouchableOpacity
          style={[
            styles.customButton, 
            selectedRelationshipType === 'custom' && styles.selectedCustomButton
          ]}
          onPress={() => setShowCustomModal(true)}
        >
          <View style={styles.customButtonContent}>
            <Text style={styles.customButtonText}>
              Share more about what you're looking for in your own words
            </Text>
            <Ionicons name="add-circle" size={24} color="#FF6B6B" />
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Visibility Toggle */}
      <View style={styles.visibilityContainer}>
        <Text style={styles.visibilityText}>Visible on profile</Text>
        <Switch
          trackColor={{ false: '#E5E5E5', true: '#FF6B6B' }}
          thumbColor={isVisible ? '#FFFFFF' : '#FFFFFF'}
          ios_backgroundColor="#E5E5E5"
          onValueChange={handleVisibilityChange}
          value={isVisible}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.learnMoreContainer}
        onPress={() => Alert.alert(
            "Relationship Types",
            "We include this option to help match you with people who share similar relationship preferences. You can choose to display or hide this information on your profile."
        )}
        >
        <Text style={styles.learnMoreText}>
          Learn more <Text style={styles.greyText}>about why we've included relationship type options</Text>
        </Text>
      </TouchableOpacity>
      
        {/* Custom Description Modal */}
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
                <Text style={styles.modalTitle}>Custom Relationship Type</Text>
                <TouchableOpacity 
                onPress={() => setShowCustomModal(false)}
                style={styles.closeButton}
                >
                <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
                Describe what type of relationship you're looking for (you can only add one custom description).
            </Text>
            
            <TextInput
                style={styles.customInput}
                placeholder="e.g., Looking for a meaningful connection with someone who shares my values and interests..."
                value={localCustomDescription}
                onChangeText={setLocalCustomDescription}
                multiline
                maxLength={200}
                placeholderTextColor="#999"
            />
            
            <Text style={styles.charCount}>
                {localCustomDescription.length}/200 characters
            </Text>
            
            <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveCustomDescription}
                disabled={!localCustomDescription.trim()}
            >
                <LinearGradient
                colors={['#EC5F61', '#F0B433']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                    styles.saveButtonGradient,
                    !localCustomDescription.trim() && styles.disabledButton
                ]}
                >
                <Text style={styles.saveButtonText}>Add Description</Text>
                </LinearGradient>
            </TouchableOpacity>
            
            {/* Custom descriptions list with delete option */}
            {customDescriptions.length > 0 && (
            <View style={styles.customListContainer}>
                <Text style={styles.listTitle}>Your Custom Descriptions:</Text>
                
                {customDescriptions.map((item, index) => {
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
                        onPress={() => {
                        // Remove this item from the array
                        const updatedDescriptions = customDescriptions.filter((_, i) => i !== index);
                        setCustomDescriptions(updatedDescriptions);
                        
                        // Update parent component
                        if (updatedDescriptions.length === 0) {
                            onSelectRelationshipType('');
                            onUpdateCustomDescription('');
                        } else {
                            onUpdateCustomDescription(JSON.stringify(updatedDescriptions));
                        }
                        }}
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
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    color: '#000000',
    lineHeight: 40,
  },
  optionsContainer: {
    flexGrow: 0,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  selectedOption: {
    backgroundColor: '#F2F1ED',
  },
  optionText: {
    fontSize: 16, 
    color: '#161616',
    fontWeight: '500',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24, 
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#F9F6F2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0'
  },
  gradientCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    marginTop: 20,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CCCCCC',
    borderRadius: 12,
    backgroundColor: '#F2F1ED',
  },
  selectedCustomButton: {
    borderColor: '#8E44AD',
    borderStyle: 'solid',
    backgroundColor: '#F2F1ED',
  },
  customButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  customDescriptionPreview: {
    marginTop: 8,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#333333',
  },
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: -10,
  },
  visibilityText: {
    fontSize: 16, 
    color: '#161616',
    fontWeight: '500',
  },
  learnMoreContainer: {
    marginTop: 0,
  },
  learnMoreText: {
    fontSize: 13,
    color: '#8E44AD',
    fontWeight: '500',
  },
  greyText: {
    color: '#999999',
    fontWeight: '400',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  customInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    color: '#000000',
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    color: '#999999',
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
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